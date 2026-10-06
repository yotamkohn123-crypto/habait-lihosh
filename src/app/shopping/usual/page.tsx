"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useUsualShopping } from "@/lib/use-usual-shopping";
import { EXPENSE_ICONS } from "@/lib/expense-categories";

export default function UsualShoppingPage() {
  const router = useRouter();
  const { identity } = useIdentity();
  const { items, loading } = useUsualShopping();

  const [name, setName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.from("usual_shopping_items").insert({ name: trimmed });
    setName("");
  }

  async function deleteItem(id: string) {
    await supabase.from("usual_shopping_items").delete().eq("id", id);
    setConfirmDeleteId(null);
  }

  async function addAllToCart() {
    if (items.length === 0) return;
    setAdding(true);

    const { data: existing } = await supabase.from("shopping_items").select("name");
    const existingNames = new Set((existing ?? []).map((i) => i.name.trim().toLowerCase()));

    const missing = items.filter((i) => !existingNames.has(i.name.trim().toLowerCase()));
    if (missing.length > 0) {
      await supabase.from("shopping_items").insert(
        missing.map((i) => ({
          name: i.name,
          category: i.category,
          added_by: identity ?? "משותף",
        }))
      );
    }

    setAdding(false);
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
    <div className="pb-6">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-background/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link
            href="/shopping"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
          >
            ‹
          </Link>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-tight">
              הקנייה הרגילה שלי
            </h1>
            <p className="text-[11px] font-medium text-stone-500">
              רשימה קבועה שאפשר להוסיף לעגלה במגע אחד
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <form onSubmit={addItem} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="מה להוסיף לרשימה הקבועה?"
            className="flex-1 h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-stone-800 shadow-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-sm"
          >
            הוסיפי
          </button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            עדיין אין פריטים ברשימה הקבועה. אפשר להוסיף למעלה.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={addAllToCart}
              disabled={adding}
              className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98] transition disabled:opacity-50"
            >
              {adding ? "מוסיפה..." : "הוסיפי הכול לרשימת הקניות"}
            </button>

            <div className="space-y-1.5">
              {items.map((item) => {
                const confirming = confirmDeleteId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm border border-stone-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{EXPENSE_ICONS[item.category] ?? "🛒"}</span>
                      <span className="text-sm font-medium text-stone-800">{item.name}</span>
                    </div>
                    {!confirming ? (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="text-stone-300 px-1"
                        aria-label="מחקי מהרשימה הקבועה"
                      >
                        ✕
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-stone-500"
                        >
                          בטלי
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs font-bold text-white bg-red-500 rounded-lg px-2.5 py-1"
                        >
                          מחקי
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
