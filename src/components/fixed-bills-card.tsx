import { FixedBillStatus } from "@/lib/expense-calc";
import { formatDueDate } from "@/lib/date";

function billSentence(bill: FixedBillStatus, helperName: string | null): string {
  const isPaid = Boolean(bill.expense);
  const dueDateLabel = formatDueDate(bill.dueDay);

  if (isPaid) {
    const amount = Number(bill.expense!.amount);
    let comparison = "";
    if (bill.lastMonthAmount !== null) {
      const diff = Math.round(amount - bill.lastMonthAmount);
      if (diff === 0) {
        comparison = " אותו סכום כמו החודש שעבר.";
      } else if (diff > 0) {
        comparison = ` עלה ${diff} ₪ לעומת החודש שעבר.`;
      } else {
        comparison = ` ירד ${Math.abs(diff)} ₪ לעומת החודש שעבר.`;
      }
    }
    return `${bill.name}: ${amount.toLocaleString()} ₪. שולם החודש.${comparison}`;
  }

  const amountPart =
    bill.lastMonthAmount !== null
      ? `כ-${Math.round(bill.lastMonthAmount).toLocaleString()} ₪, לפי החודש שעבר`
      : "הסכום עוד לא ידוע";
  const payPart = helperName
    ? `משלמים יחד עם ${helperName} עד ${dueDateLabel}.`
    : `צריך לשלם עד ${dueDateLabel}.`;

  return `${bill.name}: ${amountPart}. עוד לא שולם. ${payPart}`;
}

export default function FixedBillsCard({
  bills,
  helperName,
  onPayClick,
}: {
  bills: FixedBillStatus[];
  helperName: string | null;
  onPayClick: (bill: { name: string }) => void;
}) {
  const fixedTotal = bills.reduce(
    (sum, b) => sum + (b.expense ? Number(b.expense.amount) : 0),
    0
  );

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-stone-900">חשבונות קבועים</h2>
          <p className="text-[11px] text-stone-400">שכ״ד, חשבונות ומסים שחוזרים בכל חודש</p>
        </div>
        <span className="text-xs font-bold text-stone-700 bg-background px-2 py-0.5 rounded-lg">
          ₪{fixedTotal.toLocaleString()}
        </span>
      </div>

      <div className="divide-y divide-stone-100 pt-1">
        {bills.map((bill) => {
          const isPaid = Boolean(bill.expense);
          return (
            <div key={bill.name} className="py-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-7 w-7 flex-shrink-0 rounded-xl flex items-center justify-center text-xs border ${
                    isPaid
                      ? "bg-emerald-50 text-primary border-emerald-200"
                      : "bg-background text-stone-300 border-stone-200"
                  }`}
                >
                  {isPaid ? "✓" : "○"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{bill.icon}</span>
                  <p className="text-xs leading-relaxed text-stone-700">
                    {billSentence(bill, helperName)}
                  </p>
                </div>
              </div>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => onPayClick(bill)}
                  className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-white active:scale-[0.98] transition"
                >
                  שילמנו
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
