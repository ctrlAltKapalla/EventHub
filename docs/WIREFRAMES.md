# Wireframes — EventHub MVP
> ASCII-Textbeschreibung aller MVP-Seiten. Alle Layouts zeigen Desktop-Ansicht; Mobile-Varianten sind beschrieben.

---

## 1. Startseite / Event-Übersicht (`/`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ [EventHub Logo]    [🔍 Events suchen...]    [Login] [Start] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HERO                                                         │
│  "Finde Events in deiner Stadt"                              │
│  [Suchfeld mit Ort + Datum Filter]   [🔍 Suchen]            │
└─────────────────────────────────────────────────────────────┘

┌─── FILTER BAR ──────────────────────────────────────────────┐
│ Kategorie: [Alle ▾]  Datum: [Heute ▾]  Ort: [Berlin ▾]     │
└─────────────────────────────────────────────────────────────┘

┌─── EVENT GRID (3 Spalten Desktop) ──────────────────────────┐
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                  │
│ │ [Bild]    │ │ [Bild]    │ │ [Bild]    │                  │
│ │ Titel     │ │ Titel     │ │ Titel     │                  │
│ │ 📅 Datum  │ │ 📅 Datum  │ │ 📅 Datum  │                  │
│ │ 📍 Ort    │ │ 📍 Ort    │ │ 📍 Ort    │                  │
│ │ [Anmelden]│ │ [Anmelden]│ │ [Anmelden]│                  │
│ └───────────┘ └───────────┘ └───────────┘                  │
│ ... (Pagination / Infinite Scroll)                          │
└─────────────────────────────────────────────────────────────┘

FOOTER: Impressum | Datenschutz | Kontakt
```

**Mobile:** 1 Spalte, Hero kompakter, Filter als horizontale Scroll-Chips.

---

## 2. Event-Detailseite (`/events/:slug`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ EVENT BILD (2/3)         │ TICKET-BOX (1/3)                 │
│                          │ ┌──────────────────────────────┐ │
│                          │ │ Preis: Kostenlos / €XX       │ │
│                          │ │ Verfügbar: XX Plätze         │ │
│                          │ │ [Jetzt anmelden]             │ │
│                          │ └──────────────────────────────┘ │
└──────────────────────────┴──────────────────────────────────┘

EVENT INFO
  Titel: [Event-Titel]
  📅 Datum: DD.MM.YYYY, HH:MM Uhr
  📍 Ort: Veranstaltungsort, Adresse
  👤 Veranstalter: [Name]

BESCHREIBUNG
  [Langer Text / Rich Text]

AGENDA (optional)
  HH:MM — Programmpunkt
  HH:MM — Programmpunkt

KARTE (embedded Map Placeholder)
  [──────────────── MAP ────────────────]
```

**Mobile:** Ticket-Box unter dem Bild, sticky CTA-Button unten.

---

## 3. Registrierungsformular (`/events/:slug/register`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
└─────────────────────────────────────────────────────────────┘

┌─── FORTSCHRITTSANZEIGE ─────────────────────────────────────┐
│ ① Angaben  →  ② Bestätigung  →  ③ Ticket                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ FORMULAR (max-w-lg)      │ EVENT-ZUSAMMENFASSUNG            │
│                          │ [Event Titel]                    │
│ Vorname *                │ 📅 Datum                         │
│ [________________]       │ 📍 Ort                           │
│                          │ Preis: Kostenlos                 │
│ Nachname *               │                                  │
│ [________________]       │                                  │
│                          │                                  │
│ E-Mail *                 │                                  │
│ [________________]       │                                  │
│                          │                                  │
│ Anzahl Tickets           │                                  │
│ [1 ▾]                    │                                  │
│                          │                                  │
│ ☐ AGB akzeptieren *      │                                  │
│                          │                                  │
│ [Weiter →]               │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

**Mobile:** 1 Spalte, Zusammenfassung oben als Accordion.

---

## 4. Ticket-Ansicht (`/tickets/:token`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (minimiert, nur Logo)                                 │
└─────────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │   EventHub Ticket  │
                    │                   │
                    │  [Event Titel]     │
                    │  📅 DD.MM.YYYY     │
                    │  ⏰ HH:MM Uhr      │
                    │  📍 Ort            │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │ [QR-CODE]   │  │
                    │  │   256×256   │  │
                    │  └─────────────┘  │
                    │                   │
                    │  Ticket-Nr: #XXXX │
                    │  Name: Max Muster │
                    │                   │
                    │  [📥 Download PDF] │
                    └────────────────────┘
```

**Mobile:** Full-width, QR-Code groß zentriert, optimiert für Vorzeigen.

---

## 5. Admin Dashboard (`/dashboard`)

```
┌───────┬─────────────────────────────────────────────────────┐
│SIDEBAR│ HEADER: [EventHub] ............ [👤 Avatar ▾]       │
│       ├─────────────────────────────────────────────────────┤
│ 🏠    │ STATS-REIHE                                         │
│ 📅    │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│ ➕    │ │ Events   │ │ Tickets  │ │ Einnahmen│ │ Check- │ │
│ 👤    │ │    12    │ │   248    │ │  €1.240  │ │  ins   │ │
│       │ │ aktive   │ │ gesamt   │ │  gesamt  │ │   87   │ │
│       │ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│       │                                                     │
│       │ MEINE EVENTS                        [+ Event]      │
│       │ ┌─────────────────────────────────────────────────┐ │
│       │ │ Titel          │ Datum    │ Tickets │ Status    │ │
│       │ │ Summer Vibes   │ 15.07.   │ 45/100  │ ✅ Live   │ │
│       │ │ Tech Meetup    │ 22.07.   │ 12/50   │ 📝 Entwurf│ │
│       │ │ ...            │          │         │           │ │
│       │ └─────────────────────────────────────────────────┘ │
└───────┴─────────────────────────────────────────────────────┘
```

**Mobile:** Sidebar → Bottom Nav, Stats 2×2, Tabelle scrollbar.

---

## 6. Admin Event-Detail (`/events/:id/attendees`)

```
┌───────┬─────────────────────────────────────────────────────┐
│SIDEBAR│ [← Zurück]  Summer Vibes — Teilnehmerliste          │
│       ├─────────────────────────────────────────────────────┤
│       │ SUBNAVIGATION                                        │
│       │ [Übersicht] [Teilnehmer ●] [Check-in] [Bearbeiten] │
│       │                                                     │
│       │ SUCHE & EXPORT                                      │
│       │ [🔍 Name/E-Mail suchen...]         [📥 CSV Export] │
│       │                                                     │
│       │ TEILNEHMERLISTE                                     │
│       │ ┌────────────────────────────────────────────────┐  │
│       │ │ ☐ │ Name       │ E-Mail      │ Ticket │ Status │  │
│       │ │ ☐ │ Max M.     │ max@…       │ #0001  │ ✅     │  │
│       │ │ ☐ │ Anna S.    │ anna@…      │ #0002  │ ⏳     │  │
│       │ │ ...                                            │  │
│       │ └────────────────────────────────────────────────┘  │
│       │ Zeige 1–20 von 45  [< Zurück] [Weiter >]           │
└───────┴─────────────────────────────────────────────────────┘
```

---

## 7. Login / Register (`/login`, `/register`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (minimiert)                                           │
└─────────────────────────────────────────────────────────────┘

                  ┌──────────────────────┐
                  │ [EventHub Logo]      │
                  │                      │
                  │ Willkommen zurück    │
                  │                      │
                  │ E-Mail               │
                  │ [__________________] │
                  │                      │
                  │ Passwort             │
                  │ [__________________] │
                  │                      │
                  │ [Passwort vergessen] │
                  │                      │
                  │ [     Einloggen    ] │
                  │                      │
                  │ ─── oder ─────────── │
                  │ [G  Google]          │
                  │                      │
                  │ Noch kein Konto?     │
                  │ [Registrieren]       │
                  └──────────────────────┘
```

**Register** (gleiche Box, zusätzlich): Vorname, Nachname, Passwort bestätigen, Rolle (Organizer).
