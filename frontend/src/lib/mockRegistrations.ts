export interface MockRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  ticketToken: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

// In-memory store for mock registrations (resets on page reload)
export const mockRegistrationStore: MockRegistration[] = [
  {
    id: "reg-001",
    eventId: "1",
    name: "Anna Schmidt",
    email: "anna@example.com",
    ticketToken: "TICKET-DEMO-001",
    checkedIn: true,
    checkedInAt: "2026-07-15T18:05:00Z",
    createdAt: "2026-07-01T10:00:00Z",
  },
  {
    id: "reg-002",
    eventId: "1",
    name: "Max Muster",
    email: "max@example.com",
    ticketToken: "TICKET-DEMO-002",
    checkedIn: false,
    checkedInAt: null,
    createdAt: "2026-07-02T11:00:00Z",
  },
  {
    id: "reg-003",
    eventId: "2",
    name: "Lisa Weber",
    email: "lisa@example.com",
    ticketToken: "TICKET-DEMO-003",
    checkedIn: false,
    checkedInAt: null,
    createdAt: "2026-07-03T09:00:00Z",
  },
];

export function addMockRegistration(
  eventId: string,
  data: { name: string; email: string; phone?: string; company?: string }
): MockRegistration {
  const reg: MockRegistration = {
    id: `reg-${crypto.randomUUID()}`,
    eventId,
    ...data,
    ticketToken: `TICKET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    checkedIn: false,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
  };
  mockRegistrationStore.push(reg);
  return reg;
}

export function getRegistrationByToken(token: string): MockRegistration | undefined {
  return mockRegistrationStore.find((r) => r.ticketToken === token);
}

export function checkInByToken(token: string): MockRegistration | null {
  const reg = mockRegistrationStore.find((r) => r.ticketToken === token);
  if (!reg) return null;
  reg.checkedIn = true;
  reg.checkedInAt = new Date().toISOString();
  return reg;
}
