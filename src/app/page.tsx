"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { useMonthlyExpenses } from "@/lib/use-monthly-expenses";
import { useLastMonthRecurring } from "@/lib/use-last-month-recurring";
import { useAppSettings } from "@/lib/use-app-settings";
import { computeMemberTotals, computeDonutSegments, computeFixedBillsStatus } from "@/lib/expense-calc";
import { relativeTime } from "@/lib/time";
import { ShoppingItem, Chore, FridgeNote, CalendarEvent } from "@/lib/types";
import { EXPENSE_ICONS } from "@/lib/expense-categories";
import { eventCountdownLabel, isUpcoming, sortByNextOccurrence } from "@/lib/calendar";
import { memberColor } from "@/lib/members";
import ExpenseSummaryCard from "@/components/expense-summary-card";
import ExpenseDonutCard from "@/components/expense-donut-card";
import FixedBillsCard from "@/components/fixed-bills-card";
import QuickAddExpenseSheet, { ExpensePrefill } from "@/components/quick-add-expense-sheet";
import NotificationPrompt from "@/components/notification-prompt";
import { notifyOthers } from "@/lib/push";

export default function HomePage() {
  const { identity, setIdentity, members } = useIdentity();
  const onlineCount = useOnlinePresence();
  const { expenses, loading: expensesLoading } = useMonthlyExpenses();
  const lastMonthRecurring = useLastMonthRecurring();
  const { settings } = useAppSettings();

  const [loading, setLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [fridgeNote, setFridgeNote] = useState<FridgeNote | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const [addPrefill, setAddPrefill] = useState<ExpensePrefill | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  async function loadData() {
    const [shoppingRes, choresRes, noteRes, eventsRes] = await Promise.all([
      supabase.from("shopping_items").select("*").eq("is_bought", false),
      supabase.from("chores").select("*").order("created_at", { ascending: false }),
      supabase
        .from("fridge_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("events").select("*"),
    ]);

    if (shoppingRes.data) setShoppingItems(shoppingRes.data as ShoppingItem[]);
    if (choresRes.data) setChores(choresRes.data as Chore[]);
    setFridgeNote((noteRes.data as FridgeNote) ?? null);
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_notes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggleChore(chore: Chore) {
    await supabase
      .from("chores")
      .update({ is_completed: !chore.is_completed })
      .eq("id", chore.id);
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const content = noteDraft.trim();
    if (!content || !identity) return;

    await supabase.from("fridge_notes").insert({
      content,
      author: identity,
    });
    notifyOthers(identity, "📌 פתק חדש על המקרר", content);
    setNoteDraft("");
    setEditingNote(false);
  }

  function openAddExpense(prefill: ExpensePrefill | null = null) {
    setAddPrefill(prefill);
    setIsAddOpen(true);
  }

  const nextEvent = sortByNextOccurrence(events.filter(isUpcoming))[0] ?? null;

  const { totalSpent, memberTotals } = computeMemberTotals(expenses, members);
  const donutSegments = computeDonutSegments(expenses, totalSpent);
  const fixedBillsStatus = computeFixedBillsStatus(expenses, lastMonthRecurring);
  const fixedTotal = fixedBillsStatus.reduce(
    (sum, b) => sum + (b.expense ? Number(b.expense.amount) : 0),
    0
  );
  const recentExpenses = expenses.slice(0, 4);

  const monthLabel = new Date().toLocaleDateString("he-IL", { month: "long" });

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
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs text-stone-400 font-medium">יום נעים ומלא שלווה 🌿</p>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
              היי {identity ?? ""}, מה קורה בבית?
            </h2>
          </div>
          <button
            onClick={() => openAddExpense()}
            className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm active:scale-95 transition"
          >
            <span>הוסיפי הוצאה</span>
          </button>
        </div>

        <NotificationPrompt />

        <ExpenseSummaryCard
          monthlyIncome={settings.monthly_income}
          fixedTotal={fixedTotal}
          memberTotals={memberTotals}
          monthLabel={monthLabel}
          linkToExpenses
        />

        <ExpenseDonutCard segments={donutSegments} totalSpent={totalSpent} />

        <FixedBillsCard
          bills={fixedBillsStatus}
          helperName={settings.helper_name}
          onPayClick={(bill) => openAddExpense({ title: bill.name, category: "בית" })}
        />

        <div className="rounded-3xl bg-amber-50/70 p-4 border border-amber-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <span>📌</span>
              <span>פתק על המקרר</span>
            </div>
            <div className="flex items-center gap-2">
              {fridgeNote && (
                <span className="text-[10px] text-amber-700/80 font-medium">
                  {relativeTime(fridgeNote.created_at)}
                </span>
              )}
              <Link href="/notes" className="text-[10px] font-bold text-amber-900 hover:underline">
                היסטוריה ‹
              </Link>
            </div>
          </div>

          {editingNote ? (
            <form onSubmit={saveNote} className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="מה תרצה להשאיר לה/לו?"
                rows={3}
                autoFocus
                className="w-full rounded-xl border border-amber-200 bg-white/80 p-2.5 text-sm text-stone-800 outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEditingNote(false)}
                  className="text-stone-500 px-3 py-1.5"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 text-white rounded-xl px-3 py-1.5"
                >
                  שמירה
                </button>
              </div>
            </form>
          ) : fridgeNote ? (
            <>
              <p className="text-sm font-medium text-stone-800 leading-relaxed pr-1">
                <span className="ml-1">{fridgeNote.emoji}</span>״{fridgeNote.content}״
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-amber-200/40 pt-2 text-[11px]">
                <span className="text-amber-800 font-semibold">
                  — נכתב ע״י {fridgeNote.author}
                </span>
                <button
                  onClick={() => setEditingNote(true)}
                  className="text-amber-900 font-bold hover:underline"
                >
                  החלף פתק ✏️
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-800/70">אין עדיין פתק על המקרר</p>
              <button
                onClick={() => setEditingNote(true)}
                className="text-amber-900 font-bold text-[11px] hover:underline"
              >
                כתבו אחד ✏️
              </button>
            </div>
          )}
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
                ללוח ‹
              </span>
            </div>
          </Link>
        )}

        <Link href="/shopping" className="block group">
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 flex items-center justify-between group-hover:border-amber-400/50 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-2xl shadow-inner">
                🛒
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">רשימת קניות לבית</h3>
                <p className="text-xs text-stone-500">
                  {shoppingItems.length} פריטים ממתינים בעגלה
                </p>
              </div>
            </div>
            <span className="rounded-2xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
              לרשימה ‹
            </span>
          </div>
        </Link>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="text-sm font-bold text-stone-900">מטלות הבית</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-stone-400">
                {chores.filter((c) => c.is_completed).length}/{chores.length} בוצעו
              </span>
              <Link href="/chores" className="text-xs font-bold text-primary hover:underline">
                הכול ‹
              </Link>
            </div>
          </div>

          {chores.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-3">
              עדיין אין מטלות מוגדרות
            </p>
          ) : (
            <div className="space-y-1.5">
              {[...chores]
                .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
                .slice(0, 4)
                .map((chore) => (
                  <div
                    key={chore.id}
                    onClick={() => toggleChore(chore)}
                    className="flex items-center justify-between rounded-2xl bg-stone-50/70 p-3 border border-stone-100 cursor-pointer hover:bg-stone-50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                          chore.is_completed
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-stone-300 bg-white"
                        }`}
                      >
                        {chore.is_completed && <span className="text-xs">✓</span>}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          chore.is_completed
                            ? "line-through text-stone-400"
                            : "text-stone-800"
                        }`}
                      >
                        {chore.title}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold rounded-lg px-2 py-0.5 text-white"
                      style={{
                        backgroundColor:
                          chore.assigned_to === "כולם"
                            ? "#78716c"
                            : memberColor(members, chore.assigned_to),
                      }}
                    >
                      {chore.assigned_to}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900">הוצאות שוטפות אחרונות</h2>
              <p className="text-[11px] text-stone-400">מה שרשמתם בימים האחרונים</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/expenses" className="text-xs font-bold text-primary hover:underline">
                הכול ‹
              </Link>
            </div>
          </div>

          {recentExpenses.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-3">
              עדיין אין הוצאות החודש
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              {recentExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-background border border-stone-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-sm shadow-sm border border-stone-100">
                      {EXPENSE_ICONS[item.category] ?? "💳"}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                      <span className="text-[10px] text-stone-400">
                        {item.paid_by} • {relativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-stone-900">
                    ₪{Number(item.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <QuickAddExpenseSheet prefill={addPrefill} onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}
