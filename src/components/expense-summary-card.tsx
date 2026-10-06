import Link from "next/link";
import { MemberTotal } from "@/lib/expense-calc";

export default function ExpenseSummaryCard({
  totalSpent,
  memberTotals,
  monthLabel,
  linkToExpenses = false,
}: {
  totalSpent: number;
  memberTotals: MemberTotal[];
  monthLabel: string;
  linkToExpenses?: boolean;
}) {
  const body = (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 transition group-hover:border-primary/40">
      <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
        <span>הוצאות מצטברות החודש</span>
        <span className="text-primary bg-emerald-50 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-emerald-200/60">
          {monthLabel}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold text-stone-900 tracking-tight">
          ₪{totalSpent.toLocaleString()}
        </span>
        <span className="text-xs text-stone-400 font-medium">סך הכול יצא</span>
      </div>

      {memberTotals.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100">
          {memberTotals.map((m) => (
            <div key={m.name} className="rounded-2xl bg-background p-2.5">
              <span className="text-[11px] text-stone-400 block">{m.name}</span>
              <span className="text-sm font-bold" style={{ color: m.color }}>
                ₪{m.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!linkToExpenses) return body;

  return (
    <Link href="/expenses" className="block group">
      {body}
    </Link>
  );
}
