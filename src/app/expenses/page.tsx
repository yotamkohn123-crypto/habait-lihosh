"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useMonthlyExpenses } from "@/lib/use-monthly-expenses";
import { useExpenseTrend } from "@/lib/use-expense-trend";
import { useLastMonthRecurring } from "@/lib/use-last-month-recurring";
import { useAppSettings } from "@/lib/use-app-settings";
import { computeMemberTotals, computeDonutSegments, computeFixedBillsStatus } from "@/lib/expense-calc";
import { Expense } from "@/lib/types";
import { EXPENSE_ICONS, FIXED_BILLS } from "@/lib/expense-categories";
import { startOfWeekISO, nextSundayLabel } from "@/lib/date";
import { moneyAnalogy } from "@/lib/money-analogy";
import ExpenseSummaryCard from "@/components/expense-summary-card";
import ExpenseDonutCard from "@/components/expense-donut-card";
import ExpenseTrendCard from "@/components/expense-trend-card";
import FixedBillsCard from "@/components/fixed-bills-card";
import QuickAddExpenseSheet, { ExpensePrefill } from "@/components/quick-add-expense-sheet";

export default function ExpensesPage() {
  const { members } = useIdentity();
  const { expenses, loading } = useMonthlyExpenses();
  const { months: trendMonths } = useExpenseTrend();
  const lastMonthRecurring = useLastMonthRecurring();
  const { settings } = useAppSettings();

  const [addPrefill, setAddPrefill] = useState<ExpensePrefill | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openAddExpense(prefill: ExpensePrefill | null = null) {
    setAddPrefill(prefill);
    setIsAddOpen(true);
  }

  async function deleteExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    setConfirmDeleteId(null);
  }

  const { totalSpent, memberTotals } = computeMemberTotals(expenses, members);
  const donutSegments = computeDonutSegments(expenses, totalSpent);
  const fixedBillsStatus = computeFixedBillsStatus(expenses, lastMonthRecurring);
  const fixedTotal = fixedBillsStatus.reduce(
    (sum, b) => sum + (b.expense ? Number(b.expense.amount) : 0),
    0
  );

  // ההוצאות השוטפות למטה הן כל מה שלא כבר מוצג למעלה כ"הוצאה קבועה" - כדי לא לשכפל מידע
  const fixedExpenseIds = new Set(
    fixedBillsStatus.map((b) => b.expense?.id).filter(Boolean)
  );
  const dynamicExpenses = expenses.filter((e) => !fixedExpenseIds.has(e.id));

  const byCategory = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of dynamicExpenses) {
      const list = groups.get(e.category) ?? [];
      list.push(e);
      groups.set(e.category, list);
    }
    return Array.from(groups.entries()).sort(
      (a, b) =>
        b[1].reduce((s, e) => s + Number(e.amount), 0) -
        a[1].reduce((s, e) => s + Number(e.amount), 0)
    );
  }, [dynamicExpenses]);

  const recurringCandidates = useMemo(() => {
    const fixedBillNames = new Set(FIXED_BILLS.map((b) => b.name));
    const thisMonthTitles = new Set(expenses.map((e) => e.title));
    const seen = new Set<string>();
    return lastMonthRecurring.filter((e) => {
      if (fixedBillNames.has(e.title) || thisMonthTitles.has(e.title) || seen.has(e.title)) {
        return false;
      }
      seen.add(e.title);
      return true;
    });
  }, [lastMonthRecurring, expenses]);

  const weekSpent = useMemo(() => {
    const weekStart = startOfWeekISO();
    return dynamicExpenses
      .filter((e) => e.date >= weekStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [dynamicExpenses]);

  const weekRemaining = settings.weekly_budget - weekSpent;

  const biggestCategory = donutSegments[0] ?? null;
  const monthlyRemaining = settings.monthly_income - fixedTotal;

  const monthLabel = new Date().toLocaleDateString("he-IL", { month: "long" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground/40">
        טוען...
      </div>
    );
  }

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/50 bg-background/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-2xl shadow-sm">
            💰
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 leading-tight">הכסף שלי</h1>
            <p className="text-xs font-medium text-stone-500">הבית של ליהוש 🌿</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600"
            aria-label="הגדרות"
          >
            ⚙️
          </Link>
          <button
            onClick={() => openAddExpense()}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
          >
            <span>הוסיפי הוצאה</span>
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        <ExpenseSummaryCard
          monthlyIncome={settings.monthly_income}
          fixedTotal={fixedTotal}
          memberTotals={memberTotals}
          monthLabel={monthLabel}
        />

        {settings.weekly_budget > 0 && (
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 space-y-1.5">
            <h2 className="text-sm font-bold text-stone-900 mb-1">תקציב השבוע לאוכל ולהוצאות קטנות</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">השבוע יש לך</span>
              <span className="font-bold text-stone-900">₪{settings.weekly_budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">הוצאת</span>
              <span className="font-bold text-stone-900">₪{weekSpent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">נשארו עד יום ראשון ה-{nextSundayLabel()}</span>
              <span className="font-bold text-primary">₪{Math.max(weekRemaining, 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <ExpenseDonutCard segments={donutSegments} totalSpent={totalSpent} />

        <ExpenseTrendCard months={trendMonths} />

        <FixedBillsCard
          bills={fixedBillsStatus}
          helperName={settings.helper_name}
          onPayClick={(bill) => openAddExpense({ title: bill.name, category: "בית" })}
        />

        {recurringCandidates.length > 0 && (
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900">הוצאות חוזרות מהחודש שעבר</h2>
              <p className="text-[11px] text-stone-400">לחצי על הוצאה כדי לרשום אותה שוב החודש</p>
            </div>
            <div className="space-y-1.5">
              {recurringCandidates.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() =>
                    openAddExpense({
                      title: e.title,
                      category: e.category,
                      amount: String(e.amount),
                      paidBy: e.paid_by,
                    })
                  }
                  className="w-full flex items-center justify-between rounded-2xl bg-stone-50/70 p-3 border border-stone-100 active:scale-[0.99] transition text-right"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{EXPENSE_ICONS[e.category] ?? "💳"}</span>
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{e.title}</span>
                      <span className="text-[10px] text-stone-400">
                        {e.category} • ₪{Number(e.amount).toLocaleString()} בחודש שעבר
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-primary whitespace-nowrap">
                    הוסיפי שוב
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-stone-900 px-1 mb-2">הוצאות שוטפות</h2>

          {byCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white/70 px-6 py-12 text-center shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-4xl mb-4 shadow-inner">
                🌱
              </div>
              <h3 className="text-base font-bold text-stone-800">עדיין אין הוצאות שוטפות</h3>
              <p className="text-xs text-stone-500 max-w-[240px] mt-1.5 leading-relaxed">
                לחצי על "הוסיפי הוצאה" למעלה כדי לרשום הוצאה ראשונה, כמו קניות או אוטובוס.
              </p>
              <button
                onClick={() => openAddExpense()}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
              >
                <span>הוסיפי הוצאה ראשונה</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {byCategory.map(([cat, items]) => {
                const subtotal = items.reduce((s, e) => s + Number(e.amount), 0);
                return (
                  <section key={cat}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-semibold text-stone-500">{cat}</h3>
                      <span className="text-sm text-stone-500">{subtotal.toLocaleString()} ₪</span>
                    </div>
                    <ul className="space-y-2">
                      {items.map((e) => {
                        const analogy = settings.show_money_analogies
                          ? moneyAnalogy(Number(e.amount))
                          : null;
                        const confirming = confirmDeleteId === e.id;
                        return (
                          <li
                            key={e.id}
                            className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm space-y-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-stone-800">
                                  {e.title}
                                  {e.is_recurring && (
                                    <span className="mr-1 text-xs text-secondary">🔁</span>
                                  )}
                                </p>
                                <p className="text-xs text-stone-400">{e.paid_by}</p>
                                {analogy && (
                                  <p className="text-[11px] text-stone-400 mt-0.5">{analogy}</p>
                                )}
                              </div>
                              <span className="font-semibold text-stone-800">
                                {Number(e.amount).toLocaleString()} ₪
                              </span>
                              {!confirming && (
                                <button
                                  onClick={() => setConfirmDeleteId(e.id)}
                                  className="text-stone-300 px-1"
                                  aria-label="מחקי הוצאה"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {confirming && (
                              <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                                <span className="text-xs text-stone-600">למחוק את ההוצאה הזו?</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-xs font-semibold text-stone-500"
                                  >
                                    בטלי
                                  </button>
                                  <button
                                    onClick={() => deleteExpense(e.id)}
                                    className="text-xs font-bold text-white bg-red-500 rounded-lg px-3 py-1.5"
                                  >
                                    מחקי
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {biggestCategory && (
          <div className="rounded-3xl bg-primary/10 p-4 border border-primary/20">
            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              החודש הכי הרבה כסף הלך על {biggestCategory.name} — ₪
              {biggestCategory.amount.toLocaleString()}.{" "}
              {settings.monthly_income > 0 && (
                <>נשארו {Math.max(monthlyRemaining, 0).toLocaleString()} ₪ לשאר החודש.</>
              )}
            </p>
          </div>
        )}
      </div>

      {isAddOpen && (
        <QuickAddExpenseSheet prefill={addPrefill} onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}
