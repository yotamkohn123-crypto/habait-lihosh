"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { ShoppingItem } from "@/lib/types";
import { memberColor, memberInitial } from "@/lib/members";
import { notifyOthers } from "@/lib/push";

const CATEGORIES = [
  { name: "ירקות ופירות", icon: "🥑", badgeBg: "bg-emerald-50 text-primary" },
  { name: "מוצרי חלב וביצים", icon: "🥛", badgeBg: "bg-amber-50 text-amber-700" },
  { name: "מזווה", icon: "🥫", badgeBg: "bg-stone-100 text-stone-700" },
  { name: "ניקיון ובית", icon: "✨", badgeBg: "bg-teal-50 text-teal-700" },
];

const RECENT_WINDOW_MS = 10 * 60 * 1000;

function isRecent(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < RECENT_WINDOW_MS;
}

export default function ShoppingPage() {
  const { identity, setIdentity, members } = useIdentity();
  const onlineCount = useOnlinePresence();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].name);
  const [showBought, setShowBought] = useState(true);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as ShoppingItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel("shopping-list-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        loadItems
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    setNewItemName("");
    await supabase.from("shopping_items").insert({
      name,
      category: activeCategory,
      added_by: identity ?? "משותף",
    });
    if (identity) notifyOthers(identity, "🛒 פריט חדש ברשימת הקניות", name);
  }

  async function toggleItem(item: ShoppingItem) {
    await supabase
      .from("shopping_items")
      .update({ is_bought: !item.is_bought })
      .eq("id", item.id);
  }

  async function clearBought() {
    await supabase.from("shopping_items").delete().eq("is_bought", true);
  }

  const unboughtItems = items.filter((i) => !i.is_bought);
  const boughtItems = items.filter((i) => i.is_bought);

  const itemsByCategory = useMemo(() => {
    const known = CATEGORIES.map((cat) => ({
      ...cat,
      items: unboughtItems.filter((item) => item.category === cat.name),
    }));
    const knownNames = new Set(CATEGORIES.map((c) => c.name));
    const other = unboughtItems.filter((item) => !knownNames.has(item.category));
    return [
      ...known,
      ...(other.length > 0
        ? [{ name: "אחר", icon: "🗂️", badgeBg: "bg-stone-100 text-stone-700", items: other }]
        : []),
    ].filter((cat) => cat.items.length > 0);
  }, [unboughtItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground/40">
        טוען...
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-background/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl">
              🏡
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">
                הבית של ליהוש
              </h1>
              <p className="text-[11px] font-medium text-emerald-700">
                סנכרון מיידי פעיל • {onlineCount} מחובר{onlineCount === 1 ? "" : "ים"}{" "}
                {onlineCount > 1 ? "🟢" : "⚪"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 border border-stone-200/70 shadow-sm text-xs font-medium overflow-x-auto max-w-[140px]">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setIdentity(m.name)}
                className={`rounded-xl px-2.5 py-1 transition whitespace-nowrap flex-shrink-0 ${
                  identity === m.name ? "text-white font-bold" : "text-stone-500"
                }`}
                style={identity === m.name ? { backgroundColor: m.color } : undefined}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 pb-28">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              רשימת קניות
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-primary">
              {unboughtItems.length} פריטים
            </span>
          </div>
          <span className="text-xs text-stone-400">הבית שלנו</span>
        </div>

        <form onSubmit={addItem} className="flex gap-2">
          <button
            type="submit"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-95 transition flex-shrink-0"
          >
            +
          </button>
          <input
            type="text"
            placeholder="מה צריך לקנות לבית?"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full h-12 flex-1 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-stone-800 placeholder-stone-400 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ${
                activeCategory === cat.name
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white border border-stone-200 text-stone-600"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-5 pt-1">
          {itemsByCategory.map((cat) => (
            <div key={cat.name} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <h3 className="text-sm font-bold text-stone-900">{cat.name}</h3>
                </div>
                <span className="text-[11px] font-medium text-stone-400">
                  {cat.items.length} פריטים
                </span>
              </div>

              <div className="space-y-1.5">
                {cat.items.map((item) => {
                  const recent = isRecent(item.created_at);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border transition ${
                        recent ? "border-amber-200/80 bg-amber-50/20" : "border-stone-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleItem(item)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-300 hover:border-primary transition flex-shrink-0 bg-white"
                          aria-label="סמן כנקנה"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-800">
                              {item.name}
                            </span>
                            {item.amount && (
                              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                {item.amount}
                              </span>
                            )}
                          </div>
                          {item.note && (
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              ״{item.note}״
                            </p>
                          )}
                          {recent && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                              נוסף הרגע ע״י {item.added_by} ✨
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: memberColor(members, item.added_by) }}
                        title={`נוסף על ידי ${item.added_by}`}
                      >
                        {memberInitial(item.added_by)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {unboughtItems.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">
              הרשימה ריקה כרגע 🌿
            </p>
          )}
        </div>

        {boughtItems.length > 0 && (
          <div className="pt-4 border-t border-stone-200/60">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowBought((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 py-1"
              >
                <span className="text-emerald-700">✓</span>
                <span>נקנו ({boughtItems.length} פריטים)</span>
                <span className="text-[11px] font-normal text-stone-400">
                  {showBought ? "▴" : "▾"}
                </span>
              </button>
              <button
                onClick={clearBought}
                className="text-[11px] font-medium text-stone-400 underline"
              >
                נקה הכל
              </button>
            </div>

            {showBought && (
              <div className="mt-2 space-y-1.5 opacity-65">
                {boughtItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className="flex items-center justify-between rounded-2xl bg-stone-50/80 p-3 border border-stone-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                        ✓
                      </div>
                      <span className="text-xs font-medium line-through text-stone-500">
                        {item.name}
                      </span>
                    </div>
                    {item.amount && (
                      <span className="text-[11px] text-stone-400">{item.amount}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-[84px] z-30 px-6 pointer-events-none">
        <Link
          href="/shopping/mode"
          className="pointer-events-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98] transition"
        >
          <span className="text-lg">🛒</span>
          <span>יוצאים לקנות (מעבר למצב סופר)</span>
        </Link>
      </div>
    </div>
  );
}
