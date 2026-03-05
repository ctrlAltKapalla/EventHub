# Design System — EventHub MVP

---

## 1. Farbpalette

### Primary (Brand)
| Token | Hex | Tailwind | Verwendung |
|-------|-----|----------|------------|
| `primary-50` | `#EEF2FF` | `indigo-50` | Hintergründe, Hover-States |
| `primary-100` | `#E0E7FF` | `indigo-100` | Badges, Tags |
| `primary-600` | `#4F46E5` | `indigo-600` | Haupt-CTAs, Links aktiv |
| `primary-700` | `#4338CA` | `indigo-700` | Hover auf Primary-Button |
| `primary-900` | `#312E81` | `indigo-900` | Schwere Akzente |

### Secondary (Akzent)
| Token | Hex | Tailwind | Verwendung |
|-------|-----|----------|------------|
| `accent-400` | `#FB923C` | `orange-400` | Badges, Highlights |
| `accent-500` | `#F97316` | `orange-500` | Wichtige Akzente |

### Neutral (Graustufen)
| Token | Hex | Tailwind | Verwendung |
|-------|-----|----------|------------|
| `neutral-50` | `#F9FAFB` | `gray-50` | Seitenhintergründe |
| `neutral-100` | `#F3F4F6` | `gray-100` | Card-Hintergründe |
| `neutral-300` | `#D1D5DB` | `gray-300` | Borders, Divider |
| `neutral-600` | `#4B5563` | `gray-600` | Sekundärer Text |
| `neutral-900` | `#111827` | `gray-900` | Haupttext |

### Status-Farben
| Status | Farbe | Tailwind | Verwendung |
|--------|-------|----------|------------|
| Success | `#16A34A` | `green-600` | Bestätigungen, Tickets ✅ |
| Warning | `#D97706` | `amber-600` | Warnungen, ausstehend ⏳ |
| Error | `#DC2626` | `red-600` | Fehler, gesperrt ❌ |
| Info | `#2563EB` | `blue-600` | Hinweise, neutral ℹ️ |

---

## 2. Typografie

### Schriftarten
```css
/* Headings */
font-family: 'Inter', system-ui, sans-serif;

/* Body */
font-family: 'Inter', system-ui, sans-serif;

/* Monospace (Ticket-Nr, Code) */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Größen-Hierarchie
| Stufe | Tailwind | px | Verwendung |
|-------|----------|----|------------|
| `display` | `text-5xl font-bold` | 48px | Hero-Titel |
| `h1` | `text-3xl font-bold` | 30px | Seitentitel |
| `h2` | `text-2xl font-semibold` | 24px | Sektionsüberschriften |
| `h3` | `text-xl font-semibold` | 20px | Card-Titel |
| `h4` | `text-lg font-medium` | 18px | Sub-Sections |
| `body-lg` | `text-base` | 16px | Haupttext |
| `body-sm` | `text-sm` | 14px | Sekundärer Text, Labels |
| `caption` | `text-xs` | 12px | Metadaten, Zeitstempel |

### Zeilenhöhen
- Headings: `leading-tight` (1.25)
- Body: `leading-relaxed` (1.625)
- Compact UI: `leading-snug` (1.375)

---

## 3. Spacing & Grid System

### Spacing-Skala (Tailwind)
```
4px  → space-1   (tight padding)
8px  → space-2   (inline gaps)
12px → space-3   (small gaps)
16px → space-4   (standard padding)
24px → space-6   (card padding)
32px → space-8   (section gaps)
48px → space-12  (page sections)
64px → space-16  (hero padding)
```

### Container
```css
.container {
  max-width: 1280px;  /* max-w-7xl */
  padding: 0 1rem;    /* px-4 */
  margin: 0 auto;
}
/* md: px-6, lg: px-8 */
```

### Grid
- **Event-Liste:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Dashboard Stats:** `grid grid-cols-2 lg:grid-cols-4 gap-4`
- **Formular + Sidebar:** `grid grid-cols-1 lg:grid-cols-3 gap-8` (Formular 2/3, Info 1/3)

---

## 4. Button-Stile

### Primary Button
```html
<button class="
  inline-flex items-center justify-center
  px-6 py-2.5 rounded-lg
  bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
  text-white font-medium text-sm
  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors duration-150
">
  Jetzt anmelden
</button>
```

### Secondary Button
```html
<button class="
  px-6 py-2.5 rounded-lg
  bg-white hover:bg-gray-50
  border border-gray-300
  text-gray-700 font-medium text-sm
  focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
  transition-colors duration-150
">
  Abbrechen
</button>
```

### Danger Button
```html
<button class="
  px-6 py-2.5 rounded-lg
  bg-red-600 hover:bg-red-700
  text-white font-medium text-sm
  focus:ring-2 focus:ring-red-500
  transition-colors duration-150
">
  Event löschen
</button>
```

### Ghost Button
```html
<button class="
  px-4 py-2 rounded-lg
  text-indigo-600 hover:bg-indigo-50
  font-medium text-sm
  transition-colors duration-150
">
  Mehr anzeigen
</button>
```

---

## 5. Form-Elemente

### Input / Textarea
```html
<label class="block text-sm font-medium text-gray-700 mb-1">
  E-Mail *
</label>
<input class="
  w-full px-3 py-2 rounded-lg
  border border-gray-300 bg-white
  text-gray-900 text-sm
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
  disabled:bg-gray-100 disabled:cursor-not-allowed
  invalid:border-red-500
  transition-shadow duration-150
" type="email" />
<p class="mt-1 text-xs text-red-600">Pflichtfeld</p>
```

### Select
```html
<select class="
  w-full px-3 py-2 rounded-lg
  border border-gray-300 bg-white
  text-gray-900 text-sm
  focus:ring-2 focus:ring-indigo-500 focus:border-transparent
  appearance-none
">
```

### Checkbox
```html
<label class="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" class="
    h-4 w-4 rounded
    border-gray-300 text-indigo-600
    focus:ring-indigo-500
  " />
  <span class="text-sm text-gray-700">AGB akzeptieren</span>
</label>
```

### Radio
```html
<label class="flex items-center gap-2 cursor-pointer">
  <input type="radio" class="
    h-4 w-4
    border-gray-300 text-indigo-600
    focus:ring-indigo-500
  " />
  <span class="text-sm text-gray-700">Organizer</span>
</label>
```

---

## 6. Card-Komponente (Event-Karte)

```html
<article class="
  bg-white rounded-xl overflow-hidden
  border border-gray-100
  shadow-sm hover:shadow-md
  transition-shadow duration-200
  flex flex-col
">
  <!-- Bild -->
  <div class="aspect-video bg-gray-200 overflow-hidden">
    <img class="w-full h-full object-cover" src="..." alt="..." />
  </div>

  <!-- Body -->
  <div class="p-4 flex flex-col flex-1">
    <!-- Badge -->
    <span class="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 w-fit mb-2">
      Musik
    </span>

    <!-- Titel -->
    <h3 class="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
      Summer Vibes Festival
    </h3>

    <!-- Meta -->
    <div class="text-sm text-gray-500 space-y-1 mb-3">
      <p>📅 15. Juli 2026, 18:00 Uhr</p>
      <p>📍 Tempelhof, Berlin</p>
    </div>

    <!-- CTA -->
    <div class="mt-auto">
      <a href="..." class="block text-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
        Details ansehen
      </a>
    </div>
  </div>
</article>
```

---

## 7. Toast / Alert-Stile

### Toast (oben rechts, auto-dismiss)
```html
<!-- Success -->
<div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 shadow-md">
  <span class="text-green-600">✅</span>
  <p class="text-sm text-green-800 font-medium">Anmeldung erfolgreich!</p>
  <button class="ml-auto text-green-400 hover:text-green-600">✕</button>
</div>

<!-- Error -->
<div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 shadow-md">
  <span class="text-red-600">❌</span>
  <p class="text-sm text-red-800 font-medium">Fehler beim Speichern.</p>
</div>
```

### Alert (inline, persistent)
```html
<div class="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
  <span class="text-amber-600 shrink-0">⚠️</span>
  <div>
    <p class="text-sm font-medium text-amber-800">Nur noch 3 Plätze verfügbar!</p>
    <p class="text-xs text-amber-700 mt-0.5">Melde dich jetzt an.</p>
  </div>
</div>
```

---

## 8. Tailwind Config Vorschlag

```js
// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },
        accent: {
          400: '#FB923C',
          500: '#F97316',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
}
```

**Benötigte Pakete:**
```bash
npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography @tailwindcss/line-clamp
```
