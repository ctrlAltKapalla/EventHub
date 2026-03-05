# User Flows — EventHub MVP

Drei Rollen: **Teilnehmer**, **Organizer**, **Admin**

---

## 1. Teilnehmer: Event finden → Registrieren → Ticket → Check-in

```
START
  │
  ▼
[Startseite /]
  │  Event-Karten durchsuchen / filtern
  │
  ▼
[Event-Detailseite /events/:slug]
  │  Infos lesen (Datum, Ort, Beschreibung)
  │
  ├─── Ausgebucht? → Anzeige "Keine Plätze mehr" → STOP
  │
  ▼
[Anmelden Button klicken]
  │
  ├─── Nicht eingeloggt? → /login (nach Login: redirect zurück)
  │
  ▼
[Registrierungsformular /events/:slug/register]
  │  Name, E-Mail, Anzahl Tickets, AGB ☑
  │
  ├─── Validierungsfehler → Inline-Fehlermeldung → zurück zu Formular
  │
  ▼
[Bestätigungsseite / Schritt 2]
  │  Zusammenfassung prüfen
  │
  ▼
[Anmeldung absenden]
  │
  ├─── Fehler (Server) → Toast "Fehler beim Anmelden" → Retry
  │
  ▼
[Ticket-Ansicht /tickets/:token]
  │  QR-Code anzeigen
  │  [📥 PDF herunterladen]
  │  E-Mail mit Ticket-Link erhalten (Bestätigungs-Mail)
  │
  ▼
[EVENT-TAG: Check-in]
  │  QR-Code vorzeigen (Handy oder Ausdruck)
  │
  ▼
[Einlass bestätigt ✅]
  │
  DONE
```

**Fehlerpfade:**
- Event nicht gefunden → 404-Seite
- Token ungültig/abgelaufen → Fehlermeldung auf Ticket-Seite
- E-Mail bereits registriert → Hinweis + Link zu bestehendem Ticket

---

## 2. Organizer: Event erstellen → Veröffentlichen → Teilnehmer verwalten → Check-in

```
START
  │
  ▼
[Login /login]
  │  Mit Organizer-Account einloggen
  │
  ▼
[Dashboard /dashboard]
  │  Eigene Events und Statistiken sehen
  │
  ▼
[+ Event erstellen Button]
  │
  ▼
[Event-Formular /events/new]
  │  Titel, Beschreibung (Rich Text), Datum, Uhrzeit
  │  Ort (Adresse + optional Karte)
  │  Kapazität, Preis (0 = kostenlos)
  │  Kategorie, Titelbild hochladen
  │  Status: Entwurf / Veröffentlicht
  │
  ├─── Speichern als Entwurf → Status "📝 Entwurf", nicht öffentlich sichtbar
  │
  ▼
[Event veröffentlichen]
  │  Status → "✅ Live"
  │  Event erscheint auf Startseite
  │
  ▼
[Teilnehmer verwalten /events/:id/attendees]
  │  Liste aller Anmeldungen einsehen
  │  Suchen nach Name / E-Mail
  │  [📥 CSV Export]
  │  Einzelne Anmeldungen stornieren (mit Bestätigungsdialog)
  │
  ▼
[Check-in durchführen /events/:id/checkin]
  │  QR-Code-Scanner öffnen (Kamera-Zugriff)
  │
  ├─── QR-Code scannen
  │     ├─── Gültig → Grüne Bestätigung, Teilnehmer als eingecheckt markiert ✅
  │     ├─── Bereits eingecheckt → Warnung "Bereits gescannt" ⚠️
  │     └─── Ungültig / Falschem Event → Fehler "Ungültiges Ticket" ❌
  │
  ▼
[Event abschließen]
  │  Event manuell auf "Beendet" setzen (optional)
  │
  DONE
```

**Fehlerpfade:**
- Event-Formular Validierung schlägt fehl → Inline-Fehler, kein Submit
- Bild zu groß → Hinweis auf Max-Dateigröße
- Kamera-Zugriff verweigert → Fallback: manuelle Ticket-Nr. eingeben

---

## 3. Admin: Events moderieren → Sperren / Löschen

```
START
  │
  ▼
[Login /login]
  │  Mit Admin-Account einloggen
  │
  ▼
[Admin Dashboard /dashboard]
  │  Alle Events aller Organizer sehen (Tabellen-View)
  │  Filter: Status (Live / Entwurf / Gesperrt / Beendet)
  │  Suche: Titel, Organizer
  │
  ▼
[Event auswählen → /events/:id/admin]
  │  Event-Details und Organizer-Info sehen
  │  Anmeldezahlen, Ticket-Status
  │
  ├─────────────────── SPERREN ──────────────────────────────┐
  │                                                          │
  ▼                                                          │
[Event sperren]                                              │
  │  Bestätigungs-Dialog: "Event wirklich sperren?"          │
  │  Grund eingeben (optional, für Organizer sichtbar)       │
  │  [Sperren bestätigen]                                    │
  │   → Event nicht mehr auf Startseite sichtbar            │
  │   → Status: "🚫 Gesperrt"                               │
  │   → Organizer erhält Benachrichtigung (E-Mail)           │
  │   → Neue Registrierungen gesperrt                        │
  │   → Bestehende Tickets bleiben gültig                    │
  │                                                          │
  │  [Sperrung aufheben] → Status zurück auf "✅ Live"       │
  └──────────────────────────────────────────────────────────┘

  ├─────────────────── LÖSCHEN ──────────────────────────────┐
  │                                                          │
  ▼                                                          │
[Event löschen]                                              │
  │  Bestätigungs-Dialog: "Unwiderruflich löschen?"          │
  │  Warnung: "XX Anmeldungen sind betroffen"                │
  │  Eingabe: Event-Titel zur Bestätigung tippen             │
  │  [Endgültig löschen]                                     │
  │   → Event gelöscht                                       │
  │   → Alle Tickets invalidiert                             │
  │   → Organizer und Teilnehmer erhalten Benachrichtigung   │
  └──────────────────────────────────────────────────────────┘

  DONE
```

**Fehlerpfade:**
- Admin löscht Event mit laufendem Check-in → Warnung vor Bestätigung
- Netzwerkfehler bei Sperraktion → Toast "Aktion fehlgeschlagen", Retry

---

## Rollen-Übersicht

| Aktion | Teilnehmer | Organizer | Admin |
|--------|-----------|-----------|-------|
| Events ansehen | ✅ | ✅ | ✅ |
| Event-Details sehen | ✅ | ✅ | ✅ |
| Ticket kaufen/reservieren | ✅ | ✅ | ✅ |
| Ticket ansehen | ✅ (eigen) | ✅ (eigen) | ✅ (alle) |
| Event erstellen | ❌ | ✅ | ✅ |
| Event bearbeiten | ❌ | ✅ (eigen) | ✅ (alle) |
| Teilnehmerliste sehen | ❌ | ✅ (eigen) | ✅ (alle) |
| Check-in durchführen | ❌ | ✅ (eigen) | ✅ (alle) |
| CSV Export | ❌ | ✅ (eigen) | ✅ (alle) |
| Event sperren | ❌ | ❌ | ✅ |
| Event löschen | ❌ | ✅ (eigen, nicht live) | ✅ |
| Andere Accounts verwalten | ❌ | ❌ | ✅ |
