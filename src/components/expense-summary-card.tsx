import Link from "next/link";
import { MemberTotal } from "@/lib/expense-calc";

export default function ExpenseSummaryCard({
  monthlyIncome,
  fixedTotal,
  memberTotals,
  monthLabel,
  linkToExpenses = false,
}: {
  monthlyIncome: number;
  fixedTotal: number;
  memberTotals: MemberTotal[];
  monthLabel: string;
  linkToExpenses?: boolean;
}) {
  const remaining = monthlyIncome - fixedTotal;
  const fixedPercent = monthlyIncome > 0 ? Math.min((fixedTotal / monthlyIncome) * 100, 100) : 0;

  const body = (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 transition group-hover:border-primary/40 space-y-3">
      <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
        <span>הכסף שלי החודש</span>
        <span className="text-primary bg-emerald-50 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-emerald-200/60">
          {monthLabel}
        </span>
      </div>

      {monthlyIncome === 0 ? (
        <div className="rounded-2xl bg-background p-3 text-xs text-stone-600 leading-relaxed">
          עדיין לא הוספת כמה כסף נכנס החודש. אפשר להוסיף את זה בהגדרות.
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">נכנס החודש</span>
              <span className="font-bold text-stone-900">₪{monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">הולך על חשבונות קבועים</span>
              <span className="font-bold text-stone-900">₪{fixedTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">נשאר לאוכל ולשאר הדברים</span>
              <span className="font-bold text-primary">₪{remaining.toLocaleString()}</span>
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${fixedPercent}%` }}
            />
          </div>
        </>
      )}

      {memberTotals.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100">
          {memberTotals.map((m) => (
            <div key={m.name} className="rounded-2xl bg-background p-2.5">
              <span className="text-[11px] text-stone-400 block">{m.name} — סכום ששולם החודש</span>
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
