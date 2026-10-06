import { FixedBillStatus } from "@/lib/expense-calc";

export default function FixedBillsCard({
  bills,
  onPayClick,
}: {
  bills: FixedBillStatus[];
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
          <h2 className="text-sm font-bold text-stone-900">הוצאות קבועות לבית</h2>
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
            <button
              key={bill.name}
              type="button"
              onClick={() => !isPaid && onPayClick(bill)}
              disabled={isPaid}
              className="w-full py-2.5 flex items-center justify-between text-right disabled:cursor-default"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs border ${
                    isPaid
                      ? "bg-emerald-50 text-primary border-emerald-200"
                      : "bg-background text-stone-300 border-stone-200"
                  }`}
                >
                  {isPaid ? "✓" : "○"}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{bill.icon}</span>
                    <span
                      className={`text-xs font-bold ${
                        isPaid ? "text-stone-900" : "text-stone-600"
                      }`}
                    >
                      {bill.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-medium">
                    {isPaid ? `${bill.expense!.paid_by} • שולם החודש` : "טרם שולם החודש"}
                  </span>
                </div>
              </div>

              <div className="text-left">
                {isPaid ? (
                  <>
                    <span className="text-xs font-bold text-stone-900 block">
                      ₪{Number(bill.expense!.amount).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">הוסדר ✓</span>
                  </>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600">+ הוסף ‹</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
