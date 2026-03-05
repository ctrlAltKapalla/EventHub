export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
  capacity: number;
  registrations: number;
  imageUrl: string;
  organizer: string;
  status: "live" | "draft" | "ended";
}

export const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    slug: "summer-vibes-festival-2026",
    title: "Summer Vibes Festival 2026",
    description: "Das größte Musikfestival des Sommers mit Live-Bands, Food & Fun.",
    date: "2026-07-15",
    time: "18:00",
    location: "Tempelhof, Berlin",
    category: "Musik",
    price: 0,
    capacity: 500,
    registrations: 342,
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
    organizer: "Max Muster",
    status: "live",
  },
  {
    id: "2",
    slug: "tech-meetup-juli-2026",
    title: "Tech Meetup Berlin — July Edition",
    description: "Monatliches Networking-Event für Entwickler, Designer und Produktmenschen.",
    date: "2026-07-22",
    time: "19:00",
    location: "Co-Working Space Mitte, Berlin",
    category: "Tech",
    price: 0,
    capacity: 80,
    registrations: 54,
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    organizer: "Berlin Tech Community",
    status: "live",
  },
  {
    id: "3",
    slug: "yoga-im-park-2026",
    title: "Yoga im Mauerpark",
    description: "Entspannter Yoga-Morgen im Grünen — alle Levels willkommen.",
    date: "2026-08-03",
    time: "09:00",
    location: "Mauerpark, Berlin",
    category: "Sport",
    price: 10,
    capacity: 30,
    registrations: 28,
    imageUrl: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&q=80",
    organizer: "Yoga Berlin",
    status: "live",
  },
  {
    id: "4",
    slug: "startup-pitch-night",
    title: "Startup Pitch Night",
    description: "5 Startups, 5 Minuten, 1 Sieger. Live-Voting durch das Publikum.",
    date: "2026-08-10",
    time: "18:30",
    location: "Factory Berlin, Görlitzer Park",
    category: "Business",
    price: 15,
    capacity: 200,
    registrations: 87,
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80",
    organizer: "StartupHub Berlin",
    status: "live",
  },
  {
    id: "5",
    slug: "fotoworkshop-street-photography",
    title: "Fotoworkshop: Street Photography",
    description: "Lerne die Kunst der Straßenfotografie mit einem professionellen Fotografen.",
    date: "2026-08-16",
    time: "11:00",
    location: "Kreuzberg, Berlin",
    category: "Kunst",
    price: 45,
    capacity: 12,
    registrations: 9,
    imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80",
    organizer: "Foto Berlin e.V.",
    status: "live",
  },
  {
    id: "6",
    slug: "kochwerkstatt-sommer",
    title: "Kochwerkstatt: Mediterrane Küche",
    description: "Gemeinsam kochen, essen, genießen. Mediterrane Rezepte für Zuhause.",
    date: "2026-08-22",
    time: "17:00",
    location: "Kochstudio Prenzlauer Berg",
    category: "Food",
    price: 35,
    capacity: 16,
    registrations: 16,
    imageUrl: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80",
    organizer: "Kochstudio Berlin",
    status: "live",
  },
];

export const CATEGORIES = ["Alle", "Musik", "Tech", "Sport", "Business", "Kunst", "Food"];
