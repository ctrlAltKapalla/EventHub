# EventHub — API-Spezifikation

**Version:** 1.0  
**Stand:** 2026-03-05  
**Autor:** Peter (Backend Developer)  
**Base URL:** `https://api.eventhub.example.com/api/v1`  
**Format:** JSON (UTF-8)  
**Auth:** Bearer Token (JWT Access Token im Authorization Header)

---

## 1. Allgemeine Konventionen

### 1.1 Versionierung

Alle Endpunkte unter `/api/v1/`. Breaking changes → neue Major-Version.

### 1.2 Authentifizierung

```http
Authorization: Bearer <access_token>
```

Nicht-authentifizierte Anfragen an geschützte Endpunkte → `401 Unauthorized`.

### 1.3 Pagination

```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

Query-Parameter: `?page=1&page_size=20`

### 1.4 Datumsformat

Immer ISO 8601 mit Zeitzone: `"2026-06-15T09:00:00+02:00"`

### 1.5 Fehlerformat

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Eingabe ungültig",
    "details": [
      {
        "field": "email",
        "message": "Keine gültige E-Mail-Adresse"
      }
    ]
  }
}
```

### 1.6 HTTP Status Codes

| Code | Bedeutung |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content (z.B. Logout, Löschen) |
| 400 | Bad Request (Validation-Fehler) |
| 401 | Unauthorized (kein/ungültiger Token) |
| 403 | Forbidden (Rolle fehlt oder fremde Ressource) |
| 404 | Not Found |
| 409 | Conflict (z.B. E-Mail bereits registriert) |
| 422 | Unprocessable Entity (Business-Logic-Fehler) |
| 429 | Too Many Requests (Rate Limit) |
| 500 | Internal Server Error |

---

## 2. Auth-Endpunkte

### POST /auth/register

Neuen User registrieren.

**Auth:** Nicht erforderlich  
**Rate Limit:** 10 Registrierungen / 10 Min / IP

**Request:**
```json
{
  "email": "user@example.com",
  "name": "Max Mustermann",
  "password": "securePassword123!"
}
```

**Validation:**
- `email`: gültige E-Mail, max 255 Zeichen
- `name`: 2–255 Zeichen, nicht leer
- `password`: min 8 Zeichen, min 1 Großbuchstabe, min 1 Zahl

**Response: 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "Max Mustermann",
  "role": "user",
  "created_at": "2026-03-05T10:00:00+00:00"
}
```

**Fehler:**
- `409 Conflict` → E-Mail bereits registriert (`EMAIL_ALREADY_EXISTS`)
- `400 Bad Request` → Validierungsfehler

---

### POST /auth/login

Login mit E-Mail und Passwort.

**Auth:** Nicht erforderlich  
**Rate Limit:** 5 Versuche / 15 Min / IP (danach 429)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response: 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```
```http
Set-Cookie: refresh_token=<uuid>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
```

**JWT Payload:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "iat": 1709640000,
  "exp": 1709640900
}
```

**Fehler:**
- `401 Unauthorized` → Ungültige Credentials (`INVALID_CREDENTIALS`)
- `403 Forbidden` → Account deaktiviert (`ACCOUNT_DISABLED`)
- `429 Too Many Requests` → Rate Limit überschritten

---

### POST /auth/refresh

Access Token erneuern.

**Auth:** Nicht erforderlich (Cookie wird geprüft)

**Request:** Kein Body — Refresh Token aus Cookie wird automatisch gelesen.

**Response: 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```
```http
Set-Cookie: refresh_token=<new_uuid>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
```

**Fehler:**
- `401 Unauthorized` → Kein/ungültiger/abgelaufener Refresh Token

---

### POST /auth/logout

Logout: Refresh Token invalidieren.

**Auth:** Erforderlich (Bearer + Cookie)

**Request:** Kein Body

**Response: 204 No Content**
```http
Set-Cookie: refresh_token=; HttpOnly; Secure; Max-Age=0
```

---

### GET /auth/me

Eigenes Profil abrufen.

**Auth:** Erforderlich

**Response: 200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "Max Mustermann",
  "role": "user",
  "is_active": true,
  "created_at": "2026-03-05T10:00:00+00:00"
}
```

---

### GET /auth/me/export

DSGVO-Datenexport: alle gespeicherten Daten des eingeloggten Users.

**Auth:** Erforderlich

**Response: 200 OK**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "...", "created_at": "..." },
  "registrations": [
    {
      "id": "...",
      "event_id": "...",
      "event_title": "TechDay 2026",
      "status": "confirmed",
      "created_at": "..."
    }
  ]
}
```

---

## 3. Event-Endpunkte

### GET /events

Öffentliche Event-Liste mit Filterung und Suche.

**Auth:** Nicht erforderlich  
**Cache:** Redis, TTL 60s (invalidiert bei Event-Änderung)

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `q` | string | Volltextsuche (Titel, Beschreibung) |
| `event_type` | string | `conference` \| `workshop` \| `party` |
| `status` | string | Default: `published` |
| `from_date` | ISO date | Events ab diesem Datum |
| `to_date` | ISO date | Events bis zu diesem Datum |
| `page` | integer | Default: 1 |
| `page_size` | integer | Default: 20, max: 100 |
| `sort` | string | `start_at` (default), `-start_at`, `title` |

**Response: 200 OK**
```json
{
  "items": [
    {
      "id": "...",
      "title": "TechDay 2026",
      "slug": "techday-2026",
      "description": "Die führende Tech-Konferenz...",
      "event_type": "conference",
      "location_name": "Kölner Messe, Köln",
      "start_at": "2026-06-15T09:00:00+02:00",
      "end_at": "2026-06-15T18:00:00+02:00",
      "capacity": 200,
      "registered_count": 87,
      "available_spots": 113,
      "status": "published",
      "cover_image_url": "https://cdn.eventhub.example.com/events/techday-2026.jpg",
      "organizer": {
        "id": "...",
        "name": "Test Organizer"
      }
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

---

### GET /events/{slug}

Einzelnes Event abrufen (öffentlich).

**Auth:** Nicht erforderlich

**Response: 200 OK** (gleiche Struktur wie Listenelement, plus `description` vollständig)

**Fehler:**
- `404 Not Found` → Event existiert nicht oder ist nicht `published`

---

### POST /events

Event erstellen.

**Auth:** Erforderlich, Rolle: `organizer` oder `admin`

**Request:**
```json
{
  "title": "TechDay 2026",
  "description": "Die führende Tech-Konferenz im Rheinland.",
  "event_type": "conference",
  "location_name": "Kölner Messe, Köln",
  "location_address": "Messeplatz 1, 50679 Köln",
  "start_at": "2026-06-15T09:00:00+02:00",
  "end_at": "2026-06-15T18:00:00+02:00",
  "capacity": 200,
  "cover_image_url": "https://cdn.eventhub.example.com/..."
}
```

**Slug-Generierung:** Automatisch aus `title` (lowercase, kebab-case, unique via Suffix falls nötig).

**Response: 201 Created**
```json
{
  "id": "...",
  "slug": "techday-2026",
  "status": "draft",
  "organizer_id": "...",
  ...
}
```

**Fehler:**
- `400` → Validierungsfehler (end_at vor start_at, capacity ≤ 0 etc.)

---

### PUT /events/{id}

Event aktualisieren.

**Auth:** Erforderlich  
**Berechtigung:** Organizer (nur eigene Events im Status `draft`/`published`), Admin (immer)

**Request:** Alle Felder optional (Partial Update):
```json
{
  "title": "TechDay 2026 — Updated",
  "capacity": 250,
  "status": "published"
}
```

**Status-Transition-Regeln:**
- `draft` → `published`: erlaubt für Organizer
- `published` → `cancelled`: erlaubt für Organizer/Admin
- `*` → `locked`: nur Admin (via PATCH /admin/events/{id}/lock)

**Response: 200 OK** — aktualisiertes Event-Objekt

**Fehler:**
- `403 Forbidden` → Fremdes Event oder unerlaubte Status-Transition
- `404 Not Found`
- `422 Unprocessable Entity` → ungültige Status-Transition

---

### DELETE /events/{id}

Event löschen (nur im Status `draft`).

**Auth:** Erforderlich  
**Berechtigung:** Organizer (eigene, nur `draft`), Admin (alle)

**Response: 204 No Content**

**Fehler:**
- `403 Forbidden` → Nicht `draft` oder fremdes Event
- `404 Not Found`

---

## 4. Registrierungs-Endpunkte

### POST /events/{id}/register

Für ein Event registrieren. Funktioniert für eingeloggte User und Gäste.

**Auth:** Optional (angemeldete User werden automatisch verknüpft)

**Request:**
```json
{
  "email": "teilnehmer@example.com",
  "name": "Anna Schmidt"
}
```

> Wenn `Authorization` Header vorhanden: `email`/`name` werden aus dem Token übernommen (können aber überschrieben werden).

**Business Logic:**
1. Event muss `published` sein
2. Kapazität darf nicht überschritten sein
3. Keine Doppelregistrierung (gleiche E-Mail + Event)
4. Registrierung anlegen (Status: `confirmed`)
5. Ticket generieren (Token + QR-Code)
6. Celery Task: Bestätigungsmail mit Ticket senden

**Response: 201 Created**
```json
{
  "registration": {
    "id": "...",
    "event_id": "...",
    "event_title": "TechDay 2026",
    "email": "teilnehmer@example.com",
    "name": "Anna Schmidt",
    "status": "confirmed",
    "created_at": "..."
  },
  "ticket": {
    "id": "...",
    "token": "01HXYZ123456789ABCDEFGHIJK",
    "ticket_url": "https://eventhub.example.com/ticket/01HXYZ123456789ABCDEFGHIJK",
    "pdf_url": "https://cdn.eventhub.example.com/tickets/01HXYZ123456789ABCDEFGHIJK.pdf"
  }
}
```

**Fehler:**
- `404 Not Found` → Event nicht gefunden oder nicht `published`
- `409 Conflict` → Bereits registriert (`ALREADY_REGISTERED`)
- `422 Unprocessable Entity` → Event ausgebucht (`EVENT_CAPACITY_EXCEEDED`)

---

### GET /registrations/{id}

Registrierung abrufen.

**Auth:** Erforderlich  
**Berechtigung:** Eigene Registrierung (User), alle Registrierungen des eigenen Events (Organizer), alle (Admin)

**Response: 200 OK**
```json
{
  "id": "...",
  "event_id": "...",
  "event_title": "TechDay 2026",
  "user_id": "...",
  "email": "teilnehmer@example.com",
  "name": "Anna Schmidt",
  "status": "confirmed",
  "created_at": "...",
  "ticket": {
    "id": "...",
    "token": "...",
    "ticket_url": "...",
    "pdf_url": "...",
    "sent_at": "...",
    "checked_in_at": null
  }
}
```

---

### DELETE /registrations/{id}

Registrierung stornieren.

**Auth:** Erforderlich  
**Berechtigung:** Eigene Registrierung (User), alle des eigenen Events (Organizer), alle (Admin)

**Business Logic:** Status wird auf `cancelled` gesetzt (Soft Delete).

**Response: 204 No Content**

---

## 5. Ticket-Endpunkte

### GET /tickets/{token}

Ticket abrufen (öffentlich über Token-Link).

**Auth:** Nicht erforderlich

**Response: 200 OK**
```json
{
  "id": "...",
  "token": "01HXYZ123456789ABCDEFGHIJK",
  "event": {
    "id": "...",
    "title": "TechDay 2026",
    "slug": "techday-2026",
    "start_at": "2026-06-15T09:00:00+02:00",
    "location_name": "Kölner Messe, Köln"
  },
  "holder_name": "Anna Schmidt",
  "status": "valid",
  "check_in": null,
  "qr_code_url": "https://cdn.eventhub.example.com/qr/01HXYZ123456789ABCDEFGHIJK.png"
}
```

`status`: `valid` | `used` (bereits eingecheckt) | `cancelled`

---

### GET /tickets/{token}/pdf

Ticket als PDF herunterladen.

**Auth:** Nicht erforderlich (Token ist die Zugriffskontrolle)

**Response: 200 OK**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="ticket-techday-2026-anna-schmidt.pdf"
```

---

## 6. Check-in-Endpunkte

### POST /check-in

Teilnehmer einchecken via QR-Code.

**Auth:** Erforderlich  
**Berechtigung:** Organizer (eigene Events), Admin (alle)

**Request:**
```json
{
  "token": "01HXYZ123456789ABCDEFGHIJK",
  "source": "qr_scan"
}
```

`source`: `qr_scan` | `manual`

**Business Logic:**
1. Token suchen → Registrierung + Event laden
2. Prüfen: Ticket gehört zum richtigen Event (falls `event_id` mitgegeben)
3. Prüfen: Ticket nicht bereits eingecheckt
4. Prüfen: Registrierung ist `confirmed` und nicht `cancelled`
5. Check-in anlegen

**Response: 200 OK**
```json
{
  "success": true,
  "check_in": {
    "id": "...",
    "ticket_id": "...",
    "checked_in_at": "2026-06-15T09:12:34+02:00",
    "source": "qr_scan"
  },
  "attendee": {
    "name": "Anna Schmidt",
    "email": "teilnehmer@example.com"
  },
  "event": {
    "title": "TechDay 2026"
  }
}
```

**Fehler:**
- `404 Not Found` → Token ungültig
- `409 Conflict` → Bereits eingecheckt (`ALREADY_CHECKED_IN`)
- `422 Unprocessable Entity` → Registrierung storniert (`REGISTRATION_CANCELLED`)
- `403 Forbidden` → Ticket gehört nicht zu einem der eigenen Events

---

### GET /events/{id}/check-ins

Check-in-Liste eines Events.

**Auth:** Erforderlich  
**Berechtigung:** Organizer (eigenes Event), Admin

**Query-Parameter:** `?page=1&page_size=50`

**Response: 200 OK**
```json
{
  "items": [
    {
      "check_in_id": "...",
      "checked_in_at": "2026-06-15T09:12:34+02:00",
      "source": "qr_scan",
      "attendee": {
        "name": "Anna Schmidt",
        "email": "teilnehmer@example.com"
      }
    }
  ],
  "total_checked_in": 42,
  "total_registered": 87,
  "total": 42,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

---

## 7. Dashboard-Endpunkte (Organizer)

### GET /dashboard/events

Eigene Events des eingeloggten Organizers.

**Auth:** Erforderlich, Rolle: `organizer` oder `admin`

**Query-Parameter:** `?status=all&page=1&page_size=20`

**Response: 200 OK** — Paginierte Liste eigener Events (alle Status inkl. `draft`).

---

### GET /dashboard/events/{id}/registrations

Teilnehmerliste eines eigenen Events.

**Auth:** Erforderlich  
**Berechtigung:** Organizer (eigenes Event), Admin

**Query-Parameter:** `?status=confirmed&page=1&page_size=50&q=<name_or_email>`

**Response: 200 OK**
```json
{
  "items": [
    {
      "registration_id": "...",
      "name": "Anna Schmidt",
      "email": "teilnehmer@example.com",
      "status": "confirmed",
      "registered_at": "...",
      "checked_in_at": "2026-06-15T09:12:34+02:00"
    }
  ],
  "total": 87,
  "confirmed_count": 85,
  "cancelled_count": 2,
  "checked_in_count": 42,
  ...
}
```

---

## 8. Admin-Endpunkte

### GET /admin/events

Alle Events aller Organizer.

**Auth:** Erforderlich, Rolle: `admin`

**Query-Parameter:** `?status=all&organizer_id=<uuid>&page=1`

**Response: 200 OK** — Paginierte Liste aller Events.

---

### PATCH /admin/events/{id}/lock

Event sperren (nur Admin).

**Auth:** Erforderlich, Rolle: `admin`

**Request:**
```json
{
  "reason": "Verstoß gegen Nutzungsbedingungen"
}
```

**Response: 200 OK**
```json
{
  "id": "...",
  "status": "locked",
  "locked_reason": "Verstoß gegen Nutzungsbedingungen",
  "updated_at": "..."
}
```

---

### GET /admin/events/{id}/export

Teilnehmerliste als CSV exportieren.

**Auth:** Erforderlich  
**Berechtigung:** Organizer (eigenes Event), Admin (alle)

**Response: 200 OK**
```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="teilnehmer-techday-2026-2026-03-05.csv"
```

**CSV-Format:**
```csv
Name,Email,Registriert am,Status,Eingecheckt am
Anna Schmidt,teilnehmer@example.com,2026-03-05T10:00:00+00:00,confirmed,2026-06-15T09:12:34+02:00
Max Müller,max@example.com,2026-03-06T12:00:00+00:00,confirmed,
```

---

### GET /admin/users

Alle User auflisten.

**Auth:** Erforderlich, Rolle: `admin`

**Query-Parameter:** `?role=all&q=<email_or_name>&page=1&page_size=50`

**Response: 200 OK**
```json
{
  "items": [
    {
      "id": "...",
      "email": "user@example.com",
      "name": "Max Mustermann",
      "role": "user",
      "is_active": true,
      "created_at": "..."
    }
  ],
  "total": 150,
  ...
}
```

---

### PATCH /admin/users/{id}/role

Rolle eines Users ändern.

**Auth:** Erforderlich, Rolle: `admin`

**Request:**
```json
{
  "role": "organizer"
}
```

**Response: 200 OK** — aktualisiertes User-Objekt

**Fehler:**
- `403 Forbidden` → Admin kann eigene Rolle nicht ändern
- `400 Bad Request` → Ungültige Rolle

---

### DELETE /admin/users/{id}

User löschen (DSGVO-Anfrage). Soft Delete mit 30-Tage-Karenz.

**Auth:** Erforderlich, Rolle: `admin`

**Response: 204 No Content**

---

## 9. Mail-Konzept

### 9.1 Bestätigungsmail nach Registrierung

**Trigger:** `POST /events/{id}/register` (Status: `confirmed`)  
**Async:** Celery Task (kein Blocking der API-Response)  
**Absender:** `noreply@eventhub.example.com` (konfigurierbar via `MAIL_FROM`)

**Mail-Inhalt:**
```
Betreff: Dein Ticket für "TechDay 2026" ✓

Hallo Anna Schmidt,

deine Registrierung für TechDay 2026 am 15. Juni 2026 in der Kölner Messe wurde bestätigt.

[QR-Code Bild eingebettet]

Ticket-Link: https://eventhub.example.com/ticket/01HXYZ123456789ABCDEFGHIJK

Details:
• Event: TechDay 2026
• Datum: 15. Juni 2026, 09:00–18:00 Uhr
• Ort: Kölner Messe, Messeplatz 1, 50679 Köln
• Ticket-Nr.: 01HXYZ123456789ABCDEFGHIJK

Das Ticket ist auch als PDF angehängt.
Bitte zeige den QR-Code beim Einlass vor (digital oder ausgedruckt).

Wir freuen uns auf dich!
Das EventHub-Team
```

**Anhang:** Ticket-PDF (generiert via WeasyPrint)

### 9.2 Ticket-PDF-Inhalt

```
┌─────────────────────────────────────────────┐
│  EVENTHUB                   [Event Logo]    │
├─────────────────────────────────────────────┤
│  TechDay 2026                               │
│  15. Juni 2026 · 09:00–18:00 Uhr           │
│  Kölner Messe, Köln                        │
├─────────────────────────────────────────────┤
│  TEILNEHMER                                 │
│  Anna Schmidt                               │
│  anna@example.com                           │
├─────────────────────────────────────────────┤
│  TICKET-NR.                                 │
│  01HXYZ123456789ABCDEFGHIJK                 │
│                                             │
│           ██████████████████               │
│           ██ QR-Code ██████               │
│           ██████████████████               │
│                                             │
│  Gültig für 1 Einlass                      │
└─────────────────────────────────────────────┘
```

### 9.3 SMTP-Konfiguration (env-basiert)

```env
# Provider: resend (empfohlen) oder smtp (self-hosted)
MAIL_PROVIDER=resend
MAIL_FROM=noreply@eventhub.example.com
MAIL_FROM_NAME=EventHub

# Resend (API-basiert)
RESEND_API_KEY=re_...

# SMTP-Fallback
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=noreply@eventhub.example.com
SMTP_PASS=...
```

### 9.4 Retry-Strategie

- Celery: max 3 Retry-Versuche (Exponential Backoff: 60s, 300s, 900s)
- Bei endgültigem Fehlschlag: `sent_at` bleibt `NULL`, Ticket-Link weiterhin abrufbar
- Monitoring: Failed Tasks in Flower (Celery Dashboard)

---

## 10. Fehlercode-Referenz

| Code | HTTP Status | Bedeutung |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Eingabe ungültig |
| `EMAIL_ALREADY_EXISTS` | 409 | E-Mail bereits registriert |
| `INVALID_CREDENTIALS` | 401 | Falsche E-Mail oder Passwort |
| `ACCOUNT_DISABLED` | 403 | Account gesperrt |
| `TOKEN_EXPIRED` | 401 | Access Token abgelaufen |
| `TOKEN_INVALID` | 401 | Token ungültig oder manipuliert |
| `FORBIDDEN` | 403 | Keine Berechtigung |
| `NOT_FOUND` | 404 | Ressource nicht gefunden |
| `ALREADY_REGISTERED` | 409 | Bereits für dieses Event registriert |
| `EVENT_CAPACITY_EXCEEDED` | 422 | Event ausgebucht |
| `REGISTRATION_CANCELLED` | 422 | Registrierung storniert |
| `ALREADY_CHECKED_IN` | 409 | Ticket bereits eingecheckt |
| `INVALID_STATUS_TRANSITION` | 422 | Ungültiger Status-Wechsel |
| `RATE_LIMIT_EXCEEDED` | 429 | Zu viele Anfragen |
| `INTERNAL_ERROR` | 500 | Interner Serverfehler |

---

## 11. Endpunkt-Übersicht

| Methode | Endpunkt | Beschreibung | Rollen |
|---|---|---|---|
| POST | /auth/register | Registrierung | Public |
| POST | /auth/login | Login | Public |
| POST | /auth/refresh | Token Refresh | Public |
| POST | /auth/logout | Logout | Authenticated |
| GET | /auth/me | Eigenes Profil | Authenticated |
| GET | /auth/me/export | DSGVO-Export | Authenticated |
| GET | /events | Event-Liste | Public |
| GET | /events/{slug} | Event-Detail | Public |
| POST | /events | Event erstellen | Organizer, Admin |
| PUT | /events/{id} | Event aktualisieren | Organizer (own), Admin |
| DELETE | /events/{id} | Event löschen | Organizer (own, draft), Admin |
| POST | /events/{id}/register | Registrieren | Public |
| GET | /events/{id}/check-ins | Check-in-Liste | Organizer (own), Admin |
| GET | /registrations/{id} | Registrierung | User (own), Organizer, Admin |
| DELETE | /registrations/{id} | Stornieren | User (own), Organizer, Admin |
| GET | /tickets/{token} | Ticket ansehen | Public |
| GET | /tickets/{token}/pdf | Ticket PDF | Public |
| POST | /check-in | Einchecken | Organizer, Admin |
| GET | /dashboard/events | Eigene Events | Organizer, Admin |
| GET | /dashboard/events/{id}/registrations | Teilnehmerliste | Organizer (own), Admin |
| GET | /admin/events | Alle Events | Admin |
| PATCH | /admin/events/{id}/lock | Event sperren | Admin |
| GET | /admin/events/{id}/export | CSV-Export | Organizer (own), Admin |
| GET | /admin/users | Alle User | Admin |
| PATCH | /admin/users/{id}/role | Rolle setzen | Admin |
| DELETE | /admin/users/{id} | User löschen | Admin |

---

*Erstellt von Peter (Backend Developer) — EventHub Phase 1*
