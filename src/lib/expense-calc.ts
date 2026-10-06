import { Expense, Member } from "@/lib/types";
import { EXPENSE_HEX_COLORS, FIXED_BILLS } from "@/lib/expense-categories";
import { memberColor } from "@/lib/members";

export interface MemberTotal {
  name: string;
  color: string;
  total: number;
}

export function computeMemberTotals(expenses: Expense[], members: Member[]): {
  totalSpent: number;
  memberTotals: MemberTotal[];
} {
  const totals = new Map<string, number>();
  let totalSpent = 0;
  for (const e of expenses) {
    const amount = Number(e.amount);
    totals.set(e.paid_by, (totals.get(e.paid_by) ?? 0) + amount);
    totalSpent += amount;
  }

  const memberTotals = Array.from(totals.entries())
    .map(([name, total]) => ({ name, color: memberColor(members, name), total }))
    .sort((a, b) => b.total - a.total);

  return { totalSpent, memberTotals };
}

export interface DonutSegment {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  strokeDasharray: string;
  strokeDashoffset: number;
}

export function computeDonutSegments(expenses: Expense[], totalSpent: number): DonutSegment[] {
  const groups = new Map<string, number>();
  for (const e of expenses) {
    groups.set(e.category, (groups.get(e.category) ?? 0) + Number(e.amount));
  }
  let accumulated = 0;
  return Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => {
      const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
      const seg: DonutSegment = {
        name,
        amount,
        percentage: Math.round(percentage),
        color: EXPENSE_HEX_COLORS[name] ?? "#a8a29e",
        strokeDasharray: `${percentage} ${100 - percentage}`,
        strokeDashoffset: -accumulated,
      };
      accumulated += percentage;
      return seg;
    });
}

export interface FixedBillStatus {
  name: string;
  icon: string;
  dueDay: number;
  expense: Expense | null;
  lastMonthAmount: number | null;
}

export function computeFixedBillsStatus(
  expenses: Expense[],
  lastMonthExpenses: Expense[] = []
): FixedBillStatus[] {
  return FIXED_BILLS.map((bill) => {
    const lastMonthExpense = lastMonthExpenses.find((e) => e.title === bill.name) ?? null;
    return {
      ...bill,
      expense: expenses.find((e) => e.title === bill.name) ?? null,
      lastMonthAmount: lastMonthExpense ? Number(lastMonthExpense.amount) : null,
    };
  });
}
