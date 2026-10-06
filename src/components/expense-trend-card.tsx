import { MonthlyTotal } from "@/lib/use-expense-trend";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpenseTrendCard({ months }: { months: MonthlyTotal[] }) {
  if (months.length === 0) return null;

  const max = Math.max(...months.map((m) => m.total), 1);
  const thisMonth = currentMonthKey();

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-stone-900">מגמת הוצאות</h2>
        <p className="text-[11px] text-stone-400">השוואה בין {months.length} החודשים האחרונים</p>
      </div>

      <div className="flex items-end justify-between gap-1.5 px-1">
        {months.map((m) => {
          const isCurrent = m.monthKey === thisMonth;
          const heightPct = m.total > 0 ? Math.max((m.total / max) * 100, 6) : 3;
          return (
            <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-bold text-stone-500 truncate w-full text-center">
                {m.total > 0 ? `₪${Math.round(m.total).toLocaleString()}` : ""}
              </span>
              <div className="w-full flex items-end h-20">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isCurrent ? "bg-primary" : "bg-stone-200"
                  }`}
                  style={{ height: `${heightPct}%` }}
                ></div>
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? "text-primary font-bold" : "text-stone-400"
                }`}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
