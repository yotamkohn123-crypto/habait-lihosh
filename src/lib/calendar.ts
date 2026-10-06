import { CalendarEvent } from "@/lib/types";

export function nextOccurrenceDate(eventDateISO: string, recurring: boolean): Date {
  const original = new Date(`${eventDateISO}T00:00:00`);
  if (!recurring) return original;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidate = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
}

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ageOnNextOccurrence(eventDateISO: string): number {
  const original = new Date(`${eventDateISO}T00:00:00`);
  const next = nextOccurrenceDate(eventDateISO, true);
  return next.getFullYear() - original.getFullYear();
}

export function eventCountdownLabel(event: CalendarEvent): string {
  const days = daysUntil(nextOccurrenceDate(event.event_date, event.recurring));
  if (days === 0) return "היום! 🎉";
  if (days === 1) return "מחר";
  if (days < 0) return "עבר";
  return `בעוד ${days} ימים`;
}

export function isUpcoming(event: CalendarEvent): boolean {
  if (event.recurring) return true;
  return daysUntil(nextOccurrenceDate(event.event_date, event.recurring)) >= 0;
}

export function sortByNextOccurrence(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (a, b) =>
      daysUntil(nextOccurrenceDate(a.event_date, a.recurring)) -
      daysUntil(nextOccurrenceDate(b.event_date, b.recurring))
  );
}

export function formatEventDate(eventDateISO: string): string {
  return new Date(`${eventDateISO}T00:00:00`).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
  });
}
