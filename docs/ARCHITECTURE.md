# EventHub — Architektur & Tech-Entscheidungen

**Stand:** 2026-03-05  
**Autor:** Tom (DevOps Agent)

---

## 1. Überblick

EventHub ist eine Monorepo-Webanwendung mit klarer Frontend/Backend-Trennung. Alle Services laufen containerisiert via Docker Compose und werden über GitHub Actions gebaut und getestet.

```
Browser → Next.js (Frontend) → Fastify REST API (Backend) → PostgreSQL
                                        ↓
                                   Nodemailer → Mailhog (Dev) / SMTP (Prod)
```

---

## 2. Tech-Stack-Entscheidungen

### 2.1 Backend: Node.js + Fastify 5

**Entscheidung:** Fastify statt Express oder FastAPI.

**Begründung:**
- **Performance:** Fastify ist 2–3× schneller als Express (Benchmark: ~76k req/s vs. ~30k req/s) — relevant bei 500 concurrent users
- **TypeScript-First:** Native TS-Support, Schema-Validierung via JSON Schema / Zod out-of-the-box
- **OpenAPI:** `@fastify/swagger` generiert automatisch API-Dokumentation
- **Ökosystem:** Aktiv gewartet, LTS-kompatibel mit Node 22
- **Warum nicht FastAPI (Python)?** Das gesamte Projekt ist TypeScript (Frontend Next.js). Ein Python-Backend würde bedeuten: zwei Sprachen, zwei Toolchains, keine geteilten Types. Bei einem 12-Wochen-MVP ist das unnötige Komplexität.

### 2.2 ORM & Migrations: Prisma 6

**Entscheidung:** Prisma statt Drizzle, TypeORM oder raw SQL.

**Begründung:**
- **Type Safety:** Generierter Client ist vollständig typisiert — kein Schema-Drift
- **Migration-Workflow:** `prisma migrate dev` (Entwicklung) + `prisma migrate deploy` (Produktion/CI)
- **DX:** Prisma Studio für schnelles Debugging in der Entwicklung
- **Next.js-Kompatibilität:** Häufig zusammen eingesetzt, gute Community-Ressourcen
- **Warum nicht Drizzle?** Drizzle ist leichtgewichtiger, aber Prisma hat bessere Migration-Tooling und ist stabiler für ein komplexes Datenmodell (Events, Registrierungen, Tickets)

### 2.3 Datenbank: PostgreSQL 16

- Einzige sinnvolle Wahl für das Datenmodell (relationale Struktur: Users ↔ Events ↔ Registrierungen)
- `pgcrypto` + `uuid-ossp` Extensions für sichere UUIDs
- Healthcheck in Docker Compose stellt sicher, dass Backend erst startet wenn DB ready

### 2.4 Frontend: Next.js 15 + React 19 + Tailwind CSS v4

- Konsistent mit ProMuscle-Erfahrung im Team
- App Router (Server Components) für Performance
- `output: "standalone"` für Docker-optimiertes Build-Artifact

### 2.5 Auth: JWT (jose)

- Stateless JWT — skaliert horizontal ohne Session-Storage
- Rollenmodell: `USER / ORGANIZER / ADMIN`
- `jose` statt `jsonwebtoken` — native ES Modules, kein Node-only Binding

### 2.6 Mail: Nodemailer + Mailhog

- Nodemailer: de-facto Standard für Node.js Mail
- Mailhog: lokaler SMTP-Catcher — kein versehentlicher Mail-Versand in Entwicklung, Web-UI auf Port 8025

---

## 3. Monorepo-Struktur

```
EventHub/
├── .github/
│   └── workflows/
│       └── ci.yml              # Lint + Test + Build für beide Services
├── frontend/                   # Next.js 15 App
│   ├── src/app/                # App Router
│   ├── Dockerfile              # Multi-stage (dev / builder / production)
│   └── package.json
├── backend/                    # Fastify 5 API
│   ├── src/server.ts           # Entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Datenmodell
│   │   └── seed.ts             # Dev-Fixtures
│   ├── Dockerfile              # Multi-stage (dev / builder / production)
│   └── package.json
├── docs/
│   └── ARCHITECTURE.md         # Dieses Dokument
├── infra/
│   └── postgres/
│       └── init.sql            # PostgreSQL Extensions
├── docker-compose.yml          # Lokaler Dev-Stack
├── .env.example                # Umgebungsvariablen Vorlage
└── README.md
```

---

## 4. Docker Compose Stack

| Service | Image / Build | Port (Host) | Gesundheitsprüfung |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | `pg_isready` |
| `backend` | ./backend (dev stage) | 4000 | — |
| `frontend` | ./frontend (dev stage) | 3000 | — |
| `mailhog` | mailhog/mailhog | 1025 (SMTP), 8025 (UI) | — |

Backend wartet auf PostgreSQL-Healthcheck (`depends_on: condition: service_healthy`).

---

## 5. CI/CD

**Tool:** GitHub Actions (`.github/workflows/ci.yml`)

**Trigger:** Push / PR auf `main` und `develop`

**Jobs:**

| Job | Steps |
|---|---|
| `backend` | checkout → node setup → npm ci → prisma generate → migrate → lint → test → build |
| `frontend` | checkout → node setup → npm ci → lint → test → build |
| `deploy` | Placeholder — Ziel wird in Phase 2 definiert (Render / Railway / VPS) |

PostgreSQL wird als GitHub Actions Service-Container bereitgestellt (kein Mock, echte DB).

---

## 6. Datenmodell (Phase 1 — Basis)

```
User (id, email, passwordHash, name, role)
  ↓ 1:N
Event (id, title, type, status, startDate, endDate, location, capacity, slug, organizerId)
  ↓ 1:N
Registration (id, eventId, userId, ticketQr, checkedIn)
```

Migrations werden via Prisma verwaltet. `ticketQr` ist ein UUID der als QR-Code-Payload dient.

---

## 7. Offene Entscheidungen (Phase 2)

| Thema | Optionen | Zeitpunkt |
|---|---|---|
| Deployment-Ziel | Render / Railway / VPS + Docker | Phase 2 |
| PDF-Generierung | `@react-pdf/renderer` / Puppeteer | Phase 4 |
| QR-Code-Library | `qrcode` (npm) | Phase 4 |
| Rate Limiting | `@fastify/rate-limit` | Phase 3 |
| Caching | Redis (optional) | Phase 5+ |

---

*Erstellt von Tom ✨ — EventHub Architecture v1.0*
