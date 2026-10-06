"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { ShoppingItem, SHARED_FUND_LABEL } from "@/lib/types";
import { memberColor, memberInitial } from "@/lib/members";

const STORES = ["שופרסל", "רמי לוי", "ירקניה", "טיב טעם"];

export default function ShoppingModePage() {
  const router = useRouter();
  const { identity, members } = useIdentity();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inCart, setInCart] = useState<Set<string>>(new Set());

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutAmount, setCheckoutAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string>(identity ?? SHARED_FUND_LABEL);
  const [storeName, setStoreName] = useState(STORES[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("shopping_items")
      .select("*")
      .eq("is_bought", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data as ShoppingItem[]);
        setLoading(false);
      });
  }, []);

  const totalItems = items.length;
  const inCartCount = inCart.size;
  const remainingCount = totalItems - inCartCount;
  const progressPercent =
    totalItems > 0 ? Math.round((inCartCount / totalItems) * 100) : 100;

  function toggleItem(id: string) {
    setInCart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sortedItems = [...items].sort((a, b) => {
    const aIn = inCart.has(a.id) ? 1 : 0;
    const bIn = inCart.has(b.id) ? 1 : 0;
    return aIn - bIn;
  });

  async function markCollectedAsBought() {
    const ids = Array.from(inCart);
    if (ids.length === 0) return;
    await supabase.from("shopping_items").update({ is_bought: true }).in("id", ids);
  }

  async function handleConfirmExpense(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(checkoutAmount);
    if (!amountNum || amountNum <= 0) return;

    setSaving(true);
    await markCollectedAsBought();
    await supabase.from("expenses").insert({
      title: `קניות ב${storeName}`,
      amount: amountNum,
      category: "סופר",
      paid_by: paidBy,
    });
    setSaving(false);
    setShowCheckoutModal(false);
    router.push("/shopping");
  }

  async function finishWithoutExpense() {
    setSaving(true);
    await markCollectedAsBought();
    setSaving(false);
    setShowCheckoutModal(false);
    router.push("/shopping");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground/40">
        טוען...
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-20 border-b border-amber-200/70 bg-amber-500/95 px-5 py-3.5 text-white shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                מצב קנייה בסופר
              </h1>
              <p className="text-[11px] font-medium text-amber-100">
                {remainingCount === 0
                  ? "✨ כל המוצרים בעגלה!"
                  : `נותרו עוד ${remainingCount} פריטים לאסוף`}
              </p>
            </div>
          </div>

          <Link
            href="/shopping"
            className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition"
          >
            יציאה ✕
          </Link>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-medium text-amber-100 mb-1">
            <span>התקדמות בסל ({progressPercent}%)</span>
            <span>
              {inCartCount} מתוך {totalItems} נאספו
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-2.5">
        {totalItems === 0 ? (
          <p className="text-center text-stone-400 mt-16">
            אין פריטים ברשימה כרגע 🌿
          </p>
        ) : (
          sortedItems.map((item) => {
            const collected = inCart.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center justify-between rounded-2xl p-4 shadow-sm border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  collected
                    ? "bg-stone-100/80 border-stone-200 opacity-60"
                    : "bg-white border-stone-200 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 transition flex-shrink-0 ${
                      collected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "border-stone-300 bg-white"
                    }`}
                  >
                    {collected && <span className="text-base font-bold">✓</span>}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-bold ${
                          collected ? "line-through text-stone-500" : "text-stone-900"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.amount && (
                        <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                          {item.amount}
                        </span>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-xs text-amber-700 font-medium mt-0.5">
                        💬 ״{item.note}״
                      </p>
                    )}
                    {collected && (
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700">
                        בעגלה 🛒
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: memberColor(members, item.added_by) }}
                >
                  {memberInitial(item.added_by)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 z-30 p-4 bg-white/95 border-t border-stone-200/80 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowCheckoutModal(true)}
          disabled={totalItems === 0}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-primary py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition disabled:opacity-40"
        >
          <span>🎉 סיימתי לקנות ({inCartCount} מוצרים בסל)</span>
        </button>
      </div>

      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-t-3xl bg-background p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧾</span>
                <div>
                  <h3 className="text-base font-bold text-stone-900">כמה יצא בקופה?</h3>
                  <p className="text-[11px] text-stone-500">
                    נרשום את זה ישירות לתקציב החודשי
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="rounded-full bg-stone-100 p-1.5 text-stone-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  סכום לתשלום (₪)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={checkoutAmount}
                    onChange={(e) => setCheckoutAmount(e.target.value)}
                    className="w-full h-14 rounded-2xl border border-stone-300 bg-white px-4 text-2xl font-extrabold text-primary placeholder-stone-300 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <span className="absolute left-4 top-4 text-xl font-bold text-stone-400">
                    ₪
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  מקום הקנייה
                </label>
                <div className="flex gap-2 flex-wrap">
                  {STORES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStoreName(s)}
                      className={`flex-1 rounded-xl py-2 text-xs font-medium border transition ${
                        storeName === s
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white border-stone-200 text-stone-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  מי שילם בקופה?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[...members.map((m) => m.name), SHARED_FUND_LABEL].map((payer) => (
                    <button
                      key={payer}
                      type="button"
                      onClick={() => setPaidBy(payer)}
                      className={`rounded-2xl py-2.5 text-xs font-bold border transition ${
                        paidBy === payer
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      {payer}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-md active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>✓ שמור הוצאה וסיים קנייה</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={finishWithoutExpense}
                  className="w-full mt-2 py-2 text-xs font-medium text-stone-400"
                >
                  סיים בלי לרשום הוצאה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
