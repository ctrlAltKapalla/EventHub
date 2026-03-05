# EventHub — Architekturdiagramm

**Version:** 1.1 (Stack-Reconciliation: FastAPI → Fastify)  
**Stand:** 2026-03-05  
**Autor:** Peter (Backend Developer)  
**Projekt:** EventHub MVP — Webplattform für Eventplanung & Ticketverwaltung

---

## 1. System-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            INTERNET / USER                               │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        REVERSE PROXY (Nginx)                             │
│         TLS Termination · Rate Limiting · Static File Serving            │
└──────────────┬───────────────────────────────────┬───────────────────────┘
               │                                   │
               ▼                                   ▼
┌─────────────────────────────┐      ┌──────────────────────────────────────┐
│   FRONTEND (Next.js 14)     │      │      BACKEND API (Fastify 5)          │
│                             │      │                                       │
│  • Public Event Pages       │◄────►│  • REST API (/api/*)                 │
│  • Registration Forms       │ HTTP │  • Auth (JWT + Refresh Token)        │
│  • Organizer Dashboard      │      │  • Event CRUD                        │
│  • Admin Panel              │      │  • Registration & Ticketing          │
│  • Check-in UI              │      │  • Check-in Logic                    │
│                             │      │  • Admin Operations                  │
│  Port: 3000                 │      │  • Background Jobs (Celery)          │
└─────────────────────────────┘      │  Port: 8000                          │
                                     └──────────┬────────────────────────────┘
                                                │
                       ┌────────────────┬───────┴────────────┐
                       │                │                    │
                       ▼                ▼                    ▼
            ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐
            │  PostgreSQL  │  │    Redis      │  │   Mail Service    │
            │     16       │  │               │  │                   │
            │  • users     │  │  • Sessions   │  │  • Resend API     │
            │  • events    │  │  • Rate Limit │  │    (primär)       │
            │  • tickets   │  │  • Job Queue  │  │  • SMTP Fallback  │
            │  • check_ins │  │  • Caching    │  │  • Async via      │
            │              │  │               │  │    Celery         │
            │  Port: 5432  │  │  Port: 6379   │  │  Port: 587 TLS    │
            └──────────────┘  └──────────────┘  └───────────────────┘
```

---

## 2. Komponentenbeschreibung

### 2.1 Frontend — Next.js 14 (App Router)

| Aspekt | Entscheidung |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS + shadcn/ui |
| State | Zustand + TanStack Query |
| Auth | HTTP-only Cookie (Refresh) + Zustand (Access Token im Memory) |
| QR/PDF | QR: `react-qr-code`; PDF: serverseitig |

**Seitenstruktur:**
```
/                       → Landing Page
/events                 → Public Event-Liste
/events/[slug]          → Event-Detail + Registrierungsformular
/dashboard              → Organizer: eigene Events
/dashboard/events/new   → Event erstellen
/dashboard/events/[id]  → Teilnehmerliste, Check-in, Export
/admin                  → Admin Panel
/auth/login             → Login
/auth/register          → Registrierung
/ticket/[token]         → Ticket-Ansicht (öffentlicher Link)
```

### 2.2 Backend — Fastify 5 (Node.js 22, TypeScript)

| Aspekt | Entscheidung | Begründung |
|---|---|---|
| Framework | Fastify 5.x (Node.js 22, ESM) | Hochperformant, native async, Plugin-System |
| ORM | Prisma 6 + @prisma/client | Type-safe, auto-generierter Client, Migrations |
| Validation | Zod 3 | TypeScript-native Schemas, parse & validate |
| Auth | @fastify/jwt + @fastify/cookie | JWT Access Token + HTTP-only Refresh Cookie |
| Task Queue | Nodemailer (Phase 3: Bull/BullMQ) | Async Mail via SMTP (MailHog in Dev) |
| PDF | (Phase 4) | Puppeteer oder PDFKit |
| QR | (Phase 4) | `qrcode` npm package |
| Testing | Vitest 3 + fastify.inject() | In-process integration tests, kein echtes HTTP |

### 2.3 Datenbank — PostgreSQL 16

- Transaktionale Daten: Users, Events, Registrations, Tickets, CheckIns, RefreshTokens
- Migrations: Prisma Migrate (versioniert, `prisma/migrations/`)
- Connection Pooling: Prisma built-in (Connection Limit konfigurierbar), pgBouncer für Produktion
- Backup: täglich via pg_dump, 7 Tage Retention, S3/Object Storage

### 2.4 Redis (Phase 3+)

> **MVP-Entscheidung:** Refresh Tokens werden in PostgreSQL gespeichert (Tabelle `refresh_tokens`). Redis ist für Phase 3+ (Rate Limiting, Mail-Queue, Response Caching) geplant, aber für den MVP nicht erforderlich. Docker Compose enthält noch keinen Redis-Service.

Geplante Nutzung ab Phase 3:
- **Sessions:** Refresh Token Blocklist (bei Logout/Widerruf)
- **Rate Limiting:** Login-Versuche (5 / 15 Min / IP)
- **Bull/BullMQ Queue:** Mail- und PDF-Jobs (Async)
- **Response Caching:** Public Event-Liste (TTL: 60s)

### 2.5 Mail-Service

- **Primär:** Resend (API-basiert, EU-Server, DSGVO-konform, hohe Deliverability)
- **Fallback:** SMTP (env-konfigurierbar, für Self-Hosting und Dev)
- **Async:** Celery Task — kein Blocking der API-Response
- **Templates:** Jinja2 HTML (responsiv) + plain-text Fallback

---

## 3. Authentifizierungs-Flow

### 3.1 Login

```
Client              Backend             DB              Redis
  │                    │                 │                │
  ├──POST /auth/login──►│                 │                │
  │  {email, password} │──SELECT user────►│                │
  │                    │◄──user + hash───│                │
  │                    │ bcrypt.verify() │                │
  │                    │ [OK]            │                │
  │                    │ Generate:       │                │
  │                    │  access_token   │                │
  │                    │  refresh_token  │                │
  │                    │                 │──STORE refresh─►│
  │◄──200 {            │                 │  (hash,uid,exp)│
  │   access_token,    │                 │                │
  │   token_type}      │                 │                │
  │ Set-Cookie: refresh│                 │                │
  │ (HttpOnly,Secure)  │                 │                │
```

### 3.2 Token Refresh mit Rotation

```
Client              Backend                          Redis
  │                    │                               │
  ├──POST /auth/refresh►│                               │
  │  Cookie: refresh   │──LOOKUP refresh_token────────►│
  │                    │◄──user_id, valid──────────────│
  │                    │ Rotiere:                      │
  │                    │  altes Token löschen──────────►│
  │                    │  neues Token speichern────────►│
  │◄──200 {access_token│                               │
  │  Set-Cookie: neu   │                               │
```

### 3.3 Token-Spezifikation

| Parameter | Wert |
|---|---|
| Access Token | JWT (HS256), **15 Minuten** TTL |
| Refresh Token | UUID v4, **30 Tage** TTL |
| Refresh Storage | PostgreSQL `refresh_tokens` table (SHA-256 hash, user_id, expiresAt) |
| Refresh Delivery | HTTP-only Cookie (Secure, SameSite=Strict, Path=/api/v1/auth) |
| Access Delivery | Response Body (Bearer, nur im Memory — kein localStorage) |
| Invalidierung | Logout: Refresh Token aus Redis löschen |
| Token Rotation | Bei jedem Refresh: altes Token invalidieren, neues ausstellen |

---

## 4. Rollenmodell

### 4.1 Rollen

| Rolle | Beschreibung |
|---|---|
| **User** | Registrierter Teilnehmer. Events ansehen, registrieren, Ticket verwalten. |
| **Organizer** | Kann eigene Events erstellen, bearbeiten, Teilnehmer verwalten, einchecken. |
| **Admin** | Vollzugriff auf alle Events, Nutzer, Admin-Operationen. |

- Default bei Registrierung: `user`
- Organizer-Promotion: Admin-Aktion (`PATCH /admin/users/{id}/role`)
- Jede Person hat **genau eine** Rolle (nicht kumulativ)

---

## 5. Berechtigungsmatrix

### Auth

| Endpunkt | Public | User | Organizer | Admin |
|---|:---:|:---:|:---:|:---:|
| POST /auth/register | ✅ | — | — | — |
| POST /auth/login | ✅ | — | — | — |
| POST /auth/refresh | ✅ | — | — | — |
| POST /auth/logout | — | ✅ | ✅ | ✅ |
| GET /auth/me | — | ✅ | ✅ | ✅ |
| GET /auth/me/export | — | ✅ | ✅ | ✅ |

### Events

| Endpunkt | Public | User | Organizer | Admin |
|---|:---:|:---:|:---:|:---:|
| GET /events | ✅ | ✅ | ✅ | ✅ |
| GET /events/{slug} | ✅ | ✅ | ✅ | ✅ |
| POST /events | — | — | ✅ | ✅ |
| PUT /events/{id} | — | — | ✅ (own) | ✅ |
| DELETE /events/{id} | — | — | ✅ (own+draft) | ✅ |
| PATCH /admin/events/{id}/lock | — | — | — | ✅ |

### Registrierungen & Tickets

| Endpunkt | Public | User | Organizer | Admin |
|---|:---:|:---:|:---:|:---:|
| POST /events/{id}/register | ✅ | ✅ | ✅ | ✅ |
| GET /registrations/{id} | — | ✅ (own) | ✅ (own events) | ✅ |
| DELETE /registrations/{id} | — | ✅ (own) | ✅ (own events) | ✅ |
| GET /tickets/{token} | ✅ | ✅ | ✅ | ✅ |
| GET /tickets/{token}/pdf | ✅ | ✅ | ✅ | ✅ |

### Check-in

| Endpunkt | Public | User | Organizer | Admin |
|---|:---:|:---:|:---:|:---:|
| POST /check-in | — | — | ✅ (own events) | ✅ |
| GET /events/{id}/check-ins | — | — | ✅ (own events) | ✅ |

### Admin

| Endpunkt | Public | User | Organizer | Admin |
|---|:---:|:---:|:---:|:---:|
| GET /admin/events | — | — | — | ✅ |
| GET /admin/users | — | — | — | ✅ |
| PATCH /admin/users/{id}/role | — | — | — | ✅ |
| GET /admin/events/{id}/export | — | — | ✅ (own) | ✅ |
| DELETE /admin/users/{id} | — | — | — | ✅ |

---

## 6. Infrastruktur & Deployment

```
GitHub Repository
       │
       │ Push to main
       ▼
GitHub Actions (CI/CD)
  ├── Lint (ruff, eslint)
  ├── Tests (pytest, next build)
  ├── Build Docker Images
  ├── Push to Registry (GHCR)
  └── Deploy to Cloud

Cloud (Hetzner VPS / AWS ECS)
  ├── Docker Compose (Dev/Staging)
  └── Docker Swarm / ECS (Production)

┌──────────────────────────────────────────────┐
│              Docker Network                  │
│                                              │
│  [nginx]──►[frontend:3000]                  │
│       └───►[backend:8000]                   │
│                   │                          │
│        ┌──────────┼────────┐                │
│    [postgres]  [redis]  [worker]            │
│      :5432      :6379  (Celery)             │
└──────────────────────────────────────────────┘
```

---

## 7. Nicht-funktionale Anforderungen

### Performance

| Anforderung | Ziel | Maßnahme |
|---|---|---|
| API Response | p95 < 200ms | Redis Caching, Query-Indices |
| Seitenladung | < 3s (LCP) | Next.js SSR/ISR, CDN |
| Gleichzeitige Nutzer | 500 | Async FastAPI, asyncpg, pgBouncer |

### DSGVO

- Nur notwendige Daten (Minimalprinzip)
- Soft Delete + physische Löschung nach 30 Tagen (Cron)
- Daten-Export: `GET /auth/me/export`
- TLS in Transit + Encryption at Rest (DB-Level)
- Kein Tracking ohne Consent

### Backup

| Typ | Frequenz | Retention | Speicherort |
|---|---|---|---|
| Full Dump (pg_dump) | Täglich 02:00 UTC | 7 Tage | S3 / Object Storage |
| WAL Archiving | Kontinuierlich | 24h | Lokaler Volume |

---

## 8. Sicherheitsmaßnahmen

| Bereich | Maßnahme |
|---|---|
| Passwörter | bcrypt (cost factor 12) |
| SQL Injection | SQLAlchemy ORM (kein raw SQL) |
| XSS | Content-Security-Policy + Next.js escaping |
| CSRF | SameSite=Strict Cookie + Origin Check |
| Rate Limiting | Redis: 5 Login-Versuche / 15 Min / IP |
| Input Validation | Pydantic v2 strict mode |
| Secrets | Environment Variables, nie in Code |
| Dependencies | Dependabot + `pip audit` / `npm audit` in CI |
| CORS | Whitelist: nur eigene Domains |

---

*Erstellt von Peter (Backend Developer) — EventHub Phase 1*
