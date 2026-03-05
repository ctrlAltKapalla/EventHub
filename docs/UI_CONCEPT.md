# UI Concept — EventHub MVP

## 1. Sitemap (alle MVP-Seiten)

```
EventHub
├── Public
│   ├── / — Startseite / Event-Übersicht
│   ├── /events/:slug — Event-Detailseite
│   ├── /events/:slug/register — Registrierungsformular
│   ├── /tickets/:token — Ticket-Ansicht (QR-Code)
│   ├── /login — Login
│   └── /register — Registrierung (Organizer)
│
└── Admin / Organizer (geschützt)
    ├── /dashboard — Übersicht (eigene Events + Statistiken)
    ├── /events/new — Neues Event erstellen
    ├── /events/:id/edit — Event bearbeiten
    ├── /events/:id/attendees — Teilnehmerliste
    └── /events/:id/checkin — Check-in Scanner
```

---

## 2. Navigationskonzept

### Header (alle Seiten)
- **Links:** Logo „EventHub" → /
- **Mitte (Desktop):** Suchfeld (Events filtern)
- **Rechts:**
  - Nicht eingeloggt: `Login` | `Veranstalter werden`
  - Eingeloggt (Organizer/Admin): Avatar-Dropdown → Dashboard, Logout

### Footer
- Links: Impressum, Datenschutz, Kontakt
- Rechts: Social-Links (optional)
- Mobile: gestapelt, zentriert

### Sidebar (Admin/Organizer — Desktop only)
Sichtbar ab `/dashboard` und allen `/events/:id/*`-Routen.

| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Dashboard | /dashboard |
| 📅 | Meine Events | /events |
| ➕ | Event erstellen | /events/new |
| 👤 | Profil | /profile |

Mobile: Sidebar kollabiert zu Bottom Navigation Bar (4 Icons).

---

## 3. Responsive Breakpoints

| Breakpoint | Tailwind | Breite | Verhalten |
|------------|----------|--------|-----------|
| Mobile | `sm` | < 640px | 1 Spalte, Stack-Layout, Bottom Nav |
| Tablet | `md` | 640–1024px | 2 Spalten Grid, Header Nav |
| Desktop | `lg` | > 1024px | 3–4 Spalten Grid, Sidebar, voller Header |

### Grid-Strategie
- Event-Karten: 1 Spalte (Mobile) → 2 Spalten (Tablet) → 3 Spalten (Desktop)
- Admin-Tabellen: horizontal scrollbar auf Mobile
- Formulare: full-width auf Mobile, max-w-lg zentriert auf Desktop

---

## 4. Seitenüberblick

| Seite | Zugang | Hauptzweck |
|-------|--------|------------|
| Startseite | Public | Events entdecken, filtern |
| Event-Detail | Public | Infos lesen, Ticket kaufen/reservieren |
| Registrierungsformular | Public | Anmeldung zu Event |
| Ticket-Ansicht | Public (mit Token) | QR-Code zeigen beim Einlass |
| Login | Public | Authentifizierung |
| Register | Public | Organizer-Konto erstellen |
| Dashboard | Organizer+ | Events & Statistiken verwalten |
| Event-Erstellen/Bearbeiten | Organizer+ | Event-CRUD |
| Teilnehmerliste | Organizer+ | Anmeldungen einsehen |
| Check-in | Organizer+ | QR-Codes scannen |
