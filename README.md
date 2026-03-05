# EventHub

Moderne Webplattform für Eventplanung, Ticketverwaltung und Check-in.

## Features (MVP)

- Event-Erstellung (CRUD) mit öffentlicher Event-Seite
- Teilnehmerregistrierung + Bestätigungsmail
- Ticketgenerierung (PDF + QR-Code)
- Admin-Bereich (Teilnehmerliste, CSV-Export, Check-in via QR)
- 3 Eventtypen: Konferenz, Workshop, Party
- JWT-Auth mit Rollenmodell (User / Organizer / Admin)

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, TypeScript |
| Backend | Node.js 22, Fastify 5, TypeScript |
| ORM / DB | Prisma 6 + PostgreSQL 16 |
| Auth | JWT (jose) + bcrypt |
| Mail | Nodemailer + Mailhog (Dev) |
| CI/CD | GitHub Actions |
| Containerisierung | Docker + Docker Compose |

## Monorepo-Struktur

```
EventHub/
├── frontend/       # Next.js App
├── backend/        # Fastify API
├── docs/           # Spezifikation, Architecture, API-Docs
├── infra/          # Docker, Kubernetes, Terraform (future)
├── docker-compose.yml
└── README.md
```

## Schnellstart (lokal)

### Voraussetzungen

- Docker + Docker Compose v2
- Node.js >= 22 (für lokale Entwicklung ohne Docker)

### Mit Docker (empfohlen)

```bash
# Repo klonen
git clone https://github.com/ctrlAltKapalla/EventHub.git
cd EventHub

# Env-Datei anlegen
cp .env.example .env

# Stack starten
docker compose up

# Services:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:4000
# Mailhog:   http://localhost:8025
# Postgres:  localhost:5432
```

### Ohne Docker (Entwicklung)

```bash
# Backend
cd backend
npm install
npm run db:migrate
npm run dev

# Frontend (neues Terminal)
cd frontend
npm install
npm run dev
```

## Umgebungsvariablen

Siehe `.env.example` im Root.

## Dokumentation

- [Architektur & Tech-Entscheidungen](docs/ARCHITECTURE.md)

## Lizenz

Proprietär — alle Rechte vorbehalten.
