"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { useMonthlyExpenses } from "@/lib/use-monthly-expenses";
import { useLastMonthRecurring } from "@/lib/use-last-month-recurring";
import { useAppSettings } from "@/lib/use-app-settings";
import { useFoods } from "@/lib/use-foods";
import { useWeeklyMenu } from "@/lib/use-weekly-menu";
import { computeFixedBillsStatus } from "@/lib/expense-calc";
import { Chore, CalendarEvent } from "@/lib/types";
import { eventCountdownLabel, isUpcoming, sortByNextOccurrence } from "@/lib/calendar";
import { startOfWeekISO, nextSundayLabel, formatDueDate } from "@/lib/date";
import { FIXED_BILLS } from "@/lib/expense-categories";
import QuickAddExpenseSheet, { ExpensePrefill } from "@/components/quick-add-expense-sheet";
import NotificationPrompt from "@/components/notification-prompt";

export default function HomePage() {
  const { identity, setIdentity, members } = useIdentity();
  const onlineCount = useOnlinePresence();
  const { expenses, loading: expensesLoading } = useMonthlyExpenses();
  const lastMonthRecurring = useLastMonthRecurring();
  const { settings } = useAppSettings();
  const { foods } = useFoods();
  const { entries: menuEntries } = useWeeklyMenu();

  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState<Chore[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekSpent, setWeekSpent] = useState(0);

  const [addPrefill, setAddPrefill] = useState<ExpensePrefill | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  async function loadData() {
    const [choresRes, eventsRes, weekExpensesRes] = await Promise.all([
      supabase
        .from("chores")
        .select("*")
        .eq("is_completed", false)
        .order("created_at", { ascending: true }),
      supabase.from("events").select("*"),
      supabase.from("expenses").select("title, amount").gte("date", startOfWeekISO()),
    ]);

    if (choresRes.data) setChores(choresRes.data as Chore[]);
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[]);
    if (weekExpensesRes.data) {
      const fixedBillNames = new Set(FIXED_BILLS.map((b) => b.name));
      const sum = weekExpensesRes.data
        .filter((e) => !fixedBillNames.has(e.title))
        .reduce((s, e) => s + Number(e.amount), 0);
      setWeekSpent(sum);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("today-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggleChore(chore: Chore) {
    await supabase.from("chores").update({ is_completed: true }).eq("id", chore.id);

    if (chore.recurrence) {
      await supabase.from("chores").insert({
        title: chore.title,
        assigned_to: chore.assigned_to,
        due_date: chore.due_date,
        recurrence: chore.recurrence,
        recurrence_day: chore.recurrence_day,
        estimated_minutes: chore.estimated_minutes,
      });
    }
  }

  function openAddExpense(prefill: ExpensePrefill | null = null) {
    setAddPrefill(prefill);
    setIsAddOpen(true);
  }

  const nextChore = chores[0] ?? null;
  const nextEvent = sortByNextOccurrence(events.filter(isUpcoming))[0] ?? null;

  const fixedBillsStatus = computeFixedBillsStatus(expenses, lastMonthRecurring);
  const nextUnpaidBill = fixedBillsStatus.find((b) => !b.expense) ?? null;

  const todayIndex = new Date().getDay();
  const todayMenuEntry = menuEntries.find((e) => e.day_of_week === todayIndex);
  const todayFood = todayMenuEntry?.food_id
    ? foods.find((f) => f.id === todayMenuEntry.food_id) ?? null
    : null;

  const todayLabel = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading || expensesLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground/40">
        טוען...
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-background/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl shadow-sm">
              🏡
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900 leading-tight">
                הבית של ליהוש
              </h1>
              <p className="text-[11px] font-medium text-emerald-700">
                סנכרון מיידי • {onlineCount} מחובר{onlineCount === 1 ? "" : "ים"}{" "}
                {onlineCount > 1 ? "🟢" : "⚪"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 border border-stone-200/70 shadow-sm text-xs font-medium overflow-x-auto max-w-[140px]">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setIdentity(m.name)}
                className={`rounded-xl px-2.5 py-1 transition whitespace-nowrap flex-shrink-0 ${
                  identity === m.name ? "text-white font-bold" : "text-stone-500"
                }`}
                style={identity === m.name ? { backgroundColor: m.color } : undefined}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <div>
          <p className="text-xs text-stone-400 font-medium">{todayLabel}</p>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            היי {identity ?? ""}
          </h2>
        </div>

        <NotificationPrompt />

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-3">
          <p className="text-[11px] font-bold text-primary">המטלה הבאה</p>
          {nextChore ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleChore(nextChore)}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-300 hover:border-primary transition flex-shrink-0 bg-white"
                aria-label="סמני מטלה כבוצעה"
              />
              <span className="text-sm font-bold text-stone-900">{nextChore.title}</span>
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              אין מטלה פתוחה. אפשר להוסיף אחת בעמוד המטלות.
            </p>
          )}
          <Link href="/chores" className="text-[11px] font-bold text-primary hover:underline">
            הציגי את כל המטלות ‹
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <p className="text-[11px] font-bold text-amber-700">בתפריט היום</p>
          {todayFood ? (
            <p className="text-sm font-bold text-stone-900">{todayFood.name}</p>
          ) : (
            <p className="text-sm text-stone-400">
              לא נבחרה ארוחה להיום. אפשר לבחור בתפריט השבועי.
            </p>
          )}
          <Link
            href="/shopping/menu"
            className="text-[11px] font-bold text-amber-700 hover:underline"
          >
            עברי לתפריט השבועי ‹
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <p className="text-[11px] font-bold text-stone-500">הכסף שלי</p>
          {settings.weekly_budget > 0 && (
            <p className="text-sm text-stone-700">
              נשארו{" "}
              <span className="font-bold text-primary">
                ₪{Math.max(settings.weekly_budget - weekSpent, 0).toLocaleString()}
              </span>{" "}
              לאוכל ולהוצאות קטנות עד יום ראשון ה-{nextSundayLabel()}
            </p>
          )}
          {nextUnpaidBill && (
            <p className="text-sm text-stone-700">
              {nextUnpaidBill.icon} {nextUnpaidBill.name} צריך לשלם עד{" "}
              {formatDueDate(nextUnpaidBill.dueDay)}
            </p>
          )}
          {settings.weekly_budget === 0 && !nextUnpaidBill && (
            <p className="text-sm text-stone-400">אין כרגע משהו דחוף בכסף.</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <Link href="/expenses" className="text-[11px] font-bold text-stone-500 hover:underline">
              עברי להכסף שלי ‹
            </Link>
            <button
              onClick={() => openAddExpense()}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              הוסיפי הוצאה
            </button>
          </div>
        </div>

        {nextEvent && (
          <Link href="/calendar" className="block group">
            <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 flex items-center justify-between group-hover:border-rose-400/50 transition">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-2xl shadow-inner">
                  {nextEvent.category === "יום הולדת" ? "🎂" : "📅"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{nextEvent.title}</h3>
                  <p className="text-xs text-stone-500">{eventCountdownLabel(nextEvent)}</p>
                </div>
              </div>
              <span className="rounded-2xl bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
                עברי ללוח ‹
              </span>
            </div>
          </Link>
        )}
      </div>

      {isAddOpen && (
        <QuickAddExpenseSheet prefill={addPrefill} onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}
