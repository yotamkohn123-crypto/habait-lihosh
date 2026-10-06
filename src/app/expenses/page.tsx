"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useMonthlyExpenses } from "@/lib/use-monthly-expenses";
import { useExpenseTrend } from "@/lib/use-expense-trend";
import { useLastMonthRecurring } from "@/lib/use-last-month-recurring";
import { computeMemberTotals, computeDonutSegments, computeFixedBillsStatus } from "@/lib/expense-calc";
import { Expense } from "@/lib/types";
import { EXPENSE_ICONS, FIXED_BILLS } from "@/lib/expense-categories";
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

  const [addPrefill, setAddPrefill] = useState<ExpensePrefill | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  function openAddExpense(prefill: ExpensePrefill | null = null) {
    setAddPrefill(prefill);
    setIsAddOpen(true);
  }

  async function deleteExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
  }

  const { totalSpent, memberTotals } = computeMemberTotals(expenses, members);
  const donutSegments = computeDonutSegments(expenses, totalSpent);
  const fixedBillsStatus = computeFixedBillsStatus(expenses);

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
            <h1 className="text-lg font-bold text-stone-900 leading-tight">מעקב הוצאות</h1>
            <p className="text-xs font-medium text-stone-500">הבית של ליהוש 🌿</p>
          </div>
        </div>
        <button
          onClick={() => openAddExpense()}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
        >
          <span>+ הוצאה</span>
        </button>
      </header>

      <div className="px-4 pt-5 space-y-4">
        <ExpenseSummaryCard
          totalSpent={totalSpent}
          memberTotals={memberTotals}
          monthLabel={monthLabel}
        />

        <ExpenseDonutCard segments={donutSegments} totalSpent={totalSpent} />

        <ExpenseTrendCard months={trendMonths} />

        <FixedBillsCard
          bills={fixedBillsStatus}
          onPayClick={(bill) => openAddExpense({ title: bill.name, category: "בית" })}
        />

        {recurringCandidates.length > 0 && (
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900">הוצאות חוזרות מהחודש שעבר</h2>
              <p className="text-[11px] text-stone-400">לחצו כדי לרשום שוב החודש</p>
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
                    + הוסף שוב
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
                כל הוצאה של סופר, חשבונות או בילויים משותפים שתזינו תופיע כאן.
              </p>
              <button
                onClick={() => openAddExpense()}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
              >
                <span>+ רשמו את ההוצאה הראשונה</span>
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
                      {items.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl p-4 shadow-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-stone-800">
                              {e.title}
                              {e.is_recurring && (
                                <span className="mr-1 text-xs text-secondary">🔁</span>
                              )}
                            </p>
                            <p className="text-xs text-stone-400">{e.paid_by}</p>
                          </div>
                          <span className="font-semibold text-stone-800">
                            {Number(e.amount).toLocaleString()} ₪
                          </span>
                          <button
                            onClick={() => deleteExpense(e.id)}
                            className="text-stone-300 px-1"
                            aria-label="מחק"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
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
