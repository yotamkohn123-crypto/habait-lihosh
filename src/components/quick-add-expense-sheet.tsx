"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { SHARED_FUND_LABEL } from "@/lib/types";

export interface ExpensePrefill {
  title: string;
  category: string;
  amount?: string;
  paidBy?: string;
}

export default function QuickAddExpenseSheet({
  prefill,
  onClose,
}: {
  prefill: ExpensePrefill | null;
  onClose: () => void;
}) {
  const { identity, members } = useIdentity();
  const isFixedBill = Boolean(prefill);

  const [title, setTitle] = useState(prefill?.title ?? "");
  const [amount, setAmount] = useState(prefill?.amount ?? "");
  const [paidBy, setPaidBy] = useState<string>(
    prefill?.paidBy ?? identity ?? SHARED_FUND_LABEL
  );
  const [category, setCategory] = useState(prefill?.category ?? EXPENSE_CATEGORIES[0]);

  useEffect(() => {
    setTitle(prefill?.title ?? "");
    setCategory(prefill?.category ?? EXPENSE_CATEGORIES[0]);
    setAmount(prefill?.amount ?? "");
    setPaidBy(prefill?.paidBy ?? identity ?? SHARED_FUND_LABEL);
  }, [prefill, identity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!title.trim() || !amountNum || amountNum <= 0) return;

    await supabase.from("expenses").insert({
      title: title.trim(),
      amount: amountNum,
      category,
      paid_by: paidBy,
      is_recurring: isFixedBill,
    });

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-background p-5 shadow-2xl border-t border-stone-200"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="text-sm font-bold text-stone-900">
            {isFixedBill ? `רישום תשלום: ${title}` : "הוספת הוצאה"}
          </h3>
          <button onClick={onClose} className="text-stone-400 text-sm font-bold">
            סגרי ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-3">
          {!isFixedBill && (
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1">
                על מה?
              </label>
              <input
                type="text"
                required
                placeholder="למשל: לחם, אוטובוס, תספורת"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          )}

          <div className={isFixedBill ? "grid grid-cols-2 gap-2" : ""}>
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1">סכום (₪)</label>
              <input
                type="number"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={isFixedBill}
                className="w-full h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-xs text-stone-800 focus:outline-none focus:border-primary"
              />
            </div>

            {isFixedBill && (
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">מי שילם?</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-stone-300 bg-white px-3 text-xs text-stone-800 focus:outline-none focus:border-primary"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  <option value={SHARED_FUND_LABEL}>{SHARED_FUND_LABEL} 🏠</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-md transition"
          >
            {isFixedBill ? "שמרי תשלום" : "שמרי הוצאה"}
          </button>
        </form>
      </div>
    </div>
  );
}
