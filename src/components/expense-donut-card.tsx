import { EXPENSE_ICONS } from "@/lib/expense-categories";
import { DonutSegment } from "@/lib/expense-calc";

export default function ExpenseDonutCard({
  segments,
  totalSpent,
}: {
  segments: DonutSegment[];
  totalSpent: number;
}) {
  if (segments.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-stone-900">לאן הולך הכסף החודש?</h2>
        <p className="text-[11px] text-stone-400">חלוקה צבעונית לפי קטגוריות</p>
      </div>

      <div className="flex items-center justify-center gap-6 py-2">
        <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F5F3EF" strokeWidth="3.8" />
            {segments.map((seg) => (
              <circle
                key={seg.name}
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="3.8"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
              />
            ))}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-stone-400 font-medium">הוצאות</span>
            <span className="text-xs font-bold text-stone-800">₪{totalSpent.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {segments.map((seg) => (
            <div key={seg.name} className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                ></span>
                <span className="font-medium text-stone-700 truncate">
                  {EXPENSE_ICONS[seg.name] ?? "💳"} {seg.name}
                </span>
              </div>
              <span className="font-bold text-stone-900 flex-shrink-0">{seg.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
