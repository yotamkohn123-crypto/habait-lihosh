"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { CalendarEvent } from "@/lib/types";
import {
  ageOnNextOccurrence,
  eventCountdownLabel,
  formatEventDate,
  isUpcoming,
  sortByNextOccurrence,
} from "@/lib/calendar";

const CATEGORIES: { name: CalendarEvent["category"]; icon: string }[] = [
  { name: "יום הולדת", icon: "🎂" },
  { name: "אירוע", icon: "📅" },
];

export default function CalendarPage() {
  const { identity } = useIdentity();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState<CalendarEvent["category"]>("יום הולדת");
  const [recurring, setRecurring] = useState(true);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*");
    if (data) setEvents(data as CalendarEvent[]);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel("calendar-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function selectCategory(next: CalendarEvent["category"]) {
    setCategory(next);
    if (next === "יום הולדת") setRecurring(true);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name || !eventDate) return;

    await supabase.from("events").insert({
      title: name,
      category,
      event_date: eventDate,
      recurring,
      created_by: identity ?? null,
    });

    setTitle("");
    setEventDate("");
    setCategory("יום הולדת");
    setRecurring(true);
  }

  async function deleteEvent(id: string) {
    await supabase.from("events").delete().eq("id", id);
    setConfirmDeleteId(null);
  }

  const upcoming = sortByNextOccurrence(events.filter(isUpcoming));
  const past = events.filter((e) => !isUpcoming(e));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground/40">
        טוען...
      </div>
    );
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-background/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition"
          >
            ‹
          </Link>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-tight">
              לוח שנה ואירועים 📅
            </h1>
            <p className="text-[11px] font-medium text-stone-500">
              ימי הולדת, אירועים ותזכורות לבית
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <form
          onSubmit={addEvent}
          className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-3"
        >
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => selectCategory(cat.name)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition ${
                  category === cat.name
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-stone-50 border border-stone-200 text-stone-600"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            required
            placeholder="למשל: יום הולדת לאמא, תור לרופא..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 rounded-2xl border border-stone-200 bg-background px-4 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-primary"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="flex-1 h-11 rounded-2xl border border-stone-200 bg-background px-3 text-sm text-stone-800 focus:outline-none focus:border-primary"
            />
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              חוזר כל שנה
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md transition"
          >
            הוסיפי ללוח
          </button>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-stone-900">בקרוב</h2>
            <span className="text-[11px] text-stone-400">{upcoming.length} אירועים</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">
              אין עדיין אירועים בלוח. אפשר להוסיף אירוע למעלה.
            </p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((event) => {
                const icon = event.category === "יום הולדת" ? "🎂" : "📅";
                const countdown = eventCountdownLabel(event);
                const soon = countdown === "היום! 🎉" || countdown === "מחר";
                const confirming = confirmDeleteId === event.id;
                return (
                  <div
                    key={event.id}
                    className={`rounded-2xl bg-white shadow-sm border transition ${
                      soon ? "border-amber-200/80 bg-amber-50/20" : "border-stone-100"
                    }`}
                  >
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-xl flex-shrink-0">
                          {icon}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-stone-800 block">
                            {event.title}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {formatEventDate(event.event_date)}
                            {event.category === "יום הולדת" &&
                              ` • גיל ${ageOnNextOccurrence(event.event_date)}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[11px] font-bold rounded-lg px-2 py-0.5 ${
                            soon ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {countdown}
                        </span>
                        {!confirming && (
                          <button
                            onClick={() => setConfirmDeleteId(event.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 text-xs"
                            aria-label="מחקי אירוע"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {confirming && (
                      <div className="flex items-center justify-between rounded-xl bg-stone-50 mx-3.5 mb-3 px-3 py-2">
                        <span className="text-xs text-stone-600">למחוק את {event.title}?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold text-stone-500"
                          >
                            בטלי
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-xs font-bold text-white bg-red-500 rounded-lg px-3 py-1.5"
                          >
                            מחקי
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div className="pt-2 border-t border-stone-200/60">
            <button
              onClick={() => setShowPast((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-stone-500 py-1"
            >
              <span>הציגי אירועים שעברו ({past.length})</span>
              <span className="text-[11px] font-normal text-stone-400">
                {showPast ? "▴" : "▾"}
              </span>
            </button>

            {showPast && (
              <div className="mt-2 space-y-1.5 opacity-60">
                {past.map((event) => {
                  const confirming = confirmDeleteId === event.id;
                  return (
                    <div
                      key={event.id}
                      className="rounded-2xl bg-stone-50/80 border border-stone-200/60 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">
                            {event.category === "יום הולדת" ? "🎂" : "📅"}
                          </span>
                          <span className="text-xs font-medium text-stone-500">
                            {event.title}
                          </span>
                        </div>
                        {!confirming && (
                          <button
                            onClick={() => setConfirmDeleteId(event.id)}
                            className="text-[11px] font-medium text-stone-400 underline"
                          >
                            מחקי
                          </button>
                        )}
                      </div>
                      {confirming && (
                        <div className="flex items-center justify-between rounded-xl bg-white mt-2 px-3 py-2">
                          <span className="text-xs text-stone-600">
                            למחוק את {event.title}?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-semibold text-stone-500"
                            >
                              בטלי
                            </button>
                            <button
                              onClick={() => deleteEvent(event.id)}
                              className="text-xs font-bold text-white bg-red-500 rounded-lg px-3 py-1.5"
                            >
                              מחקי
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
