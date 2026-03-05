# EventHub — Datenbank-Schema

**Version:** 1.0  
**Stand:** 2026-03-05  
**Autor:** Peter (Backend Developer)  
**Datenbank:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.0 (async) + Alembic Migrations

---

## 1. Entity-Relationship-Übersicht

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│    users    │      │   events    │      │  registrations   │
│─────────────│      │─────────────│      │──────────────────│
│ id (PK)     │◄────►│ id (PK)     │◄────►│ id (PK)          │
│ email       │  1:N │ organizer_id│  1:N │ event_id (FK)    │
│ name        │      │ title       │      │ user_id (FK, opt)│
│ password_h  │      │ slug        │      │ email            │
│ role        │      │ event_type  │      │ name             │
│ is_active   │      │ location    │      │ status           │
│ created_at  │      │ start_at    │      │ created_at       │
│ updated_at  │      │ end_at      │      │ deleted_at       │
│ deleted_at  │      │ capacity    │      └────────┬─────────┘
└─────────────┘      │ status      │               │ 1:1
                     │ created_at  │               ▼
                     │ updated_at  │     ┌──────────────────┐
                     └─────────────┘     │    tickets       │
                                         │──────────────────│
                                         │ id (PK)          │
                                         │ registration_id  │
                                         │ token (UNIQUE)   │
                                         │ qr_code_data     │
                                         │ pdf_url          │
                                         │ sent_at          │
                                         │ created_at       │
                                         └────────┬─────────┘
                                                  │ 1:1
                                                  ▼
                                         ┌──────────────────┐
                                         │   check_ins      │
                                         │──────────────────│
                                         │ id (PK)          │
                                         │ ticket_id (FK)   │
                                         │ checked_in_by_id │
                                         │ checked_in_at    │
                                         └──────────────────┘
```

---

## 2. Tabellen-Definitionen

### 2.1 `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'organizer', 'admin')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL -- DSGVO Soft Delete
);

-- Indices
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Spalten:**

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Primary Key, auto-generiert |
| `email` | VARCHAR(255) | E-Mail (unique, lowercase) |
| `name` | VARCHAR(255) | Anzeigename |
| `password_hash` | VARCHAR(255) | bcrypt Hash (cost 12) |
| `role` | VARCHAR(20) | `user` \| `organizer` \| `admin` |
| `is_active` | BOOLEAN | False = gesperrt (kein Login) |
| `created_at` | TIMESTAMPTZ | Erstellungszeitpunkt |
| `updated_at` | TIMESTAMPTZ | Letzter Update (trigger) |
| `deleted_at` | TIMESTAMPTZ | DSGVO Soft Delete (NULL = aktiv) |

---

### 2.2 `events`

```sql
CREATE TYPE event_type AS ENUM ('conference', 'workshop', 'party');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'locked', 'completed');

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    event_type      event_type NOT NULL,
    location_name   VARCHAR(255),
    location_address TEXT,
    location_lat    DECIMAL(9,6),
    location_lng    DECIMAL(9,6),
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    capacity        INTEGER NOT NULL CHECK (capacity > 0),
    status          event_status NOT NULL DEFAULT 'draft',
    cover_image_url VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_events_dates CHECK (end_at > start_at),
    CONSTRAINT chk_events_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indices
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_slug ON events(slug);
-- Full-text search
CREATE INDEX idx_events_fts ON events USING GIN (
    to_tsvector('german', title || ' ' || COALESCE(description, ''))
);
```

**Spalten:**

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Primary Key |
| `organizer_id` | UUID | FK → users.id (Veranstalter) |
| `title` | VARCHAR(255) | Eventtitel |
| `slug` | VARCHAR(255) | URL-freundlicher Identifier (z.B. `techday-2026`) |
| `description` | TEXT | Beschreibung (Markdown erlaubt) |
| `event_type` | ENUM | `conference` \| `workshop` \| `party` |
| `location_name` | VARCHAR(255) | Ortsname |
| `location_address` | TEXT | Vollständige Adresse |
| `location_lat/lng` | DECIMAL | Koordinaten (optional) |
| `start_at` / `end_at` | TIMESTAMPTZ | Datum/Zeit (immer UTC) |
| `capacity` | INTEGER | Max. Teilnehmeranzahl |
| `status` | ENUM | `draft` → `published` → `completed` / `cancelled` / `locked` |
| `cover_image_url` | VARCHAR(500) | URL zum Titelbild |

**Status-Übergänge:**
```
draft → published → completed
              ↓
           cancelled (Organizer/Admin)
              ↓
           locked (nur Admin)
```

---

### 2.3 `registrations`

```sql
CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = Gast-Registrierung
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    status          registration_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL, -- DSGVO Soft Delete

    -- Ein User kann sich pro Event nur einmal registrieren
    CONSTRAINT uq_registration_user_event
        UNIQUE (user_id, event_id) DEFERRABLE INITIALLY DEFERRED,

    -- Gast-Registrierungen: einmalig pro E-Mail+Event
    CONSTRAINT uq_registration_email_event
        UNIQUE (email, event_id) DEFERRABLE INITIALLY DEFERRED
);

-- Indices
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_user ON registrations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_deleted ON registrations(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Kapazitätsprüfung** (via DB Trigger):

```sql
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    confirmed_count INTEGER;
    event_capacity  INTEGER;
BEGIN
    IF NEW.status = 'confirmed' THEN
        SELECT COUNT(*) INTO confirmed_count
        FROM registrations
        WHERE event_id = NEW.event_id
          AND status = 'confirmed'
          AND deleted_at IS NULL
          AND id != NEW.id;

        SELECT capacity INTO event_capacity
        FROM events WHERE id = NEW.event_id;

        IF confirmed_count >= event_capacity THEN
            RAISE EXCEPTION 'Event capacity exceeded (max: %)', event_capacity;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_capacity
    BEFORE INSERT OR UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION check_event_capacity();
```

---

### 2.4 `tickets`

```sql
CREATE TABLE tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id     UUID NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
    token               VARCHAR(64) NOT NULL UNIQUE, -- QR-Code-Inhalt (UUID v4 oder ULID)
    qr_code_data        TEXT,           -- Base64-PNG des QR-Codes (optional, für schnellen Abruf)
    pdf_url             VARCHAR(500),   -- URL zu generiertem PDF (S3/Object Storage)
    pdf_generated_at    TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,    -- Zeitpunkt der Mail-Zustellung
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE UNIQUE INDEX idx_tickets_token ON tickets(token);
CREATE INDEX idx_tickets_registration ON tickets(registration_id);
```

**Token-Format:** ULID (26 Zeichen, sortierbar, URL-sicher, via `python-ulid`)  
Beispiel: `01HXYZ123456789ABCDEFGHIJK`

---

### 2.5 `check_ins`

```sql
CREATE TABLE check_ins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    checked_in_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source              VARCHAR(20) NOT NULL DEFAULT 'qr_scan'
                        CHECK (source IN ('qr_scan', 'manual'))
);

-- Indices
CREATE UNIQUE INDEX idx_check_ins_ticket ON check_ins(ticket_id);
CREATE INDEX idx_check_ins_by ON check_ins(checked_in_by_id);
CREATE INDEX idx_check_ins_at ON check_ins(checked_in_at);
```

**Hinweis:** `UNIQUE` auf `ticket_id` stellt sicher, dass jedes Ticket nur einmal eingecheckt werden kann.

---

## 3. Beziehungen & Constraints

| Beziehung | Art | Details |
|---|---|---|
| user → events | 1:N | Ein Organizer hat viele Events |
| event → registrations | 1:N | Ein Event hat viele Registrierungen |
| user → registrations | 1:N (opt) | Ein User hat viele Registrierungen (optional: Gast ohne User) |
| registration → ticket | 1:1 | Jede Registrierung hat genau 1 Ticket |
| ticket → check_in | 1:1 (opt) | Ein Ticket kann 0 oder 1 Check-in haben |

---

## 4. Datenbank-Trigger

```sql
-- Auto-Update für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. DSGVO-Konzept

### 5.1 Was wird gespeichert?

| Tabelle | Personenbezogene Daten | Zweck | Rechtsgrundlage |
|---|---|---|---|
| `users` | E-Mail, Name, Passwort-Hash | Account-Funktionalität | Vertrag (Art. 6(1)(b) DSGVO) |
| `registrations` | E-Mail, Name | Eventregistrierung & Ticket | Vertrag |
| `tickets` | Token (nicht persönlich), PDF-Link | Einlassberechtigung | Vertrag |
| `check_ins` | Zeitstempel + Referenz | Sicherheit & Abrechnung | Berechtigtes Interesse |

### 5.2 Soft Delete

```sql
-- User-Löschanfrage (DSGVO Art. 17)
UPDATE users SET deleted_at = NOW() WHERE id = $1;
UPDATE registrations SET deleted_at = NOW() WHERE user_id = $1;

-- Nach 30 Tagen: physische Löschung via Cron
DELETE FROM registrations WHERE deleted_at < NOW() - INTERVAL '30 days';
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
```

### 5.3 Anonymisierung (statt Löschung bei Archiv-Bedarf)

```sql
-- Optional: Anonymisierung statt Löschung für statistische Zwecke
UPDATE users SET
    email = 'deleted_' || id || '@example.com',
    name = 'Gelöschter Nutzer',
    password_hash = 'DELETED',
    deleted_at = NOW()
WHERE id = $1;
```

### 5.4 Daten-Export (DSGVO Art. 20)

Via API: `GET /auth/me/export` → JSON mit allen gespeicherten Daten des Nutzers.

---

## 6. Indizierungsstrategie

| Index | Tabelle | Spalten | Typ | Begründung |
|---|---|---|---|---|
| `idx_users_email` | users | email (WHERE deleted_at IS NULL) | UNIQUE PARTIAL | Login-Lookup |
| `idx_users_role` | users | role | BTREE | Admin-Filterung |
| `idx_events_status` | events | status | BTREE | Öffentliche Liste |
| `idx_events_start_at` | events | start_at | BTREE | Sortierung/Filter |
| `idx_events_fts` | events | title, description | GIN | Volltextsuche |
| `idx_registrations_event` | registrations | event_id | BTREE | Teilnehmerliste |
| `idx_registrations_email` | registrations | email | BTREE | Duplicate-Check |
| `idx_tickets_token` | tickets | token | UNIQUE BTREE | QR-Code Lookup |
| `idx_check_ins_ticket` | check_ins | ticket_id | UNIQUE BTREE | Doppel-Check-in verhindern |

---

## 7. Migrations-Strategie (Alembic)

```
alembic/
  env.py
  versions/
    0001_initial_schema.py
    0002_add_event_fts_index.py
    0003_add_cover_image_url.py
    ...
```

**Regeln:**
- Jede Schema-Änderung = eigene Migration
- `upgrade()` und `downgrade()` immer implementiert
- Migrations im CI getestet (gegen leere Test-DB)
- Niemals manuell in Produktion — immer via `alembic upgrade head`

---

## 8. Seed-Daten (Entwicklung)

```sql
-- Admin User
INSERT INTO users (id, email, name, password_hash, role) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@eventhub.local',
    'Admin User',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6uk5gIxl4m', -- 'password123'
    'admin'
);

-- Organizer User
INSERT INTO users (id, email, name, password_hash, role) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'organizer@eventhub.local',
    'Test Organizer',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6uk5gIxl4m', -- 'password123'
    'organizer'
);

-- Regular User
INSERT INTO users (id, email, name, password_hash, role) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'user@eventhub.local',
    'Test User',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6uk5gIxl4m', -- 'password123'
    'user'
);

-- Sample Events
INSERT INTO events (id, organizer_id, title, slug, description, event_type, location_name, start_at, end_at, capacity, status) VALUES
(
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'TechDay 2026',
    'techday-2026',
    'Die führende Tech-Konferenz im Rheinland. Talks, Workshops und Networking.',
    'conference',
    'Kölner Messe, Köln',
    '2026-06-15 09:00:00+02',
    '2026-06-15 18:00:00+02',
    200,
    'published'
),
(
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'React Workshop: State Management',
    'react-workshop-state-2026',
    'Intensiver Hands-on Workshop zu modernem State Management mit Zustand und TanStack Query.',
    'workshop',
    'Online (Zoom)',
    '2026-04-20 10:00:00+02',
    '2026-04-20 17:00:00+02',
    30,
    'published'
),
(
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'Summer Party 2026',
    'summer-party-2026',
    'Das jährliche Team-Event mit Livemusik, BBQ und Spaß!',
    'party',
    'Stadtgarten, Köln',
    '2026-07-04 18:00:00+02',
    '2026-07-05 02:00:00+02',
    150,
    'draft'
);
```

---

*Erstellt von Peter (Backend Developer) — EventHub Phase 1*
