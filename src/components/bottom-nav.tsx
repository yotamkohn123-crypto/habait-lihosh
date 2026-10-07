"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { notifyOthers } from "@/lib/push";

const TABS = [
  { href: "/", label: "הבית", icon: "🏠" },
  { href: "/shopping", label: "קניות", icon: "🛒" },
  { href: "/chores", label: "מטלות", icon: "🧹" },
  { href: "/expenses", label: "הוצאות", icon: "💰" },
  { href: "/notes", label: "פתקים", icon: "📌" },
];

type SheetView = "menu" | "add_shopping" | "add_note" | "add_chore";

export default function BottomNav() {
  const pathname = usePathname();
  const { identity } = useIdentity();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SheetView>("menu");
  const [shoppingText, setShoppingText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [choreText, setChoreText] = useState("");

  if (pathname === "/shopping/mode") return null;

  function closeSheet() {
    setIsOpen(false);
    setView("menu");
  }

  async function addShopping(e: React.FormEvent) {
    e.preventDefault();
    const name = shoppingText.trim();
    if (!name) return;
    await supabase.from("shopping_items").insert({ name, added_by: identity ?? "משותף" });
    if (identity) notifyOthers(identity, "🛒 פריט חדש ברשימת הקניות", name);
    setShoppingText("");
    closeSheet();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const content = noteText.trim();
    if (!content || !identity) return;
    await supabase.from("fridge_notes").insert({ content, author: identity });
    notifyOthers(identity, "📌 פתק חדש על המקרר", content);
    setNoteText("");
    closeSheet();
  }

  async function addChore(e: React.FormEvent) {
    e.preventDefault();
    const title = choreText.trim();
    if (!title) return;
    await supabase.from("chores").insert({ title, assigned_to: identity ?? "כולם" });
    setChoreText("");
    closeSheet();
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeSheet}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-background p-5 shadow-2xl border-t border-stone-200"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    פעולה מהירה לבית
                  </h3>
                  <p className="text-[11px] font-medium text-stone-500">
                    תקתוק זריז בלי לעבור מסכים
                  </p>
                </div>
              </div>
              <button
                onClick={closeSheet}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {view === "menu" && (
              <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
                <Link
                  href="/expenses"
                  onClick={closeSheet}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80 active:scale-95 transition text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                    💰
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">רשום הוצאה</span>
                    <span className="text-[10px] text-stone-400">תקציב וסנכרון חודשי</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setView("add_shopping")}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80 active:scale-95 transition text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                    🛒
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">הוסף לקניות</span>
                    <span className="text-[10px] text-stone-400">מה חסר במקרר?</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setView("add_note")}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80 active:scale-95 transition text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
                    📌
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">פתק למקרר</span>
                    <span className="text-[10px] text-stone-400">הודעה לכל הבית</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setView("add_chore")}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80 active:scale-95 transition text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                    🧹
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">מטלה חדשה</span>
                    <span className="text-[10px] text-stone-400">מי עושה את זה היום?</span>
                  </div>
                </button>

                <Link
                  href="/calendar"
                  onClick={closeSheet}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80 active:scale-95 transition text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
                    📅
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">לוח שנה</span>
                    <span className="text-[10px] text-stone-400">ימי הולדת ואירועים</span>
                  </div>
                </Link>
              </div>
            )}

            {view === "add_shopping" && (
              <form onSubmit={addShopping} className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>🛒 מה צריך להביא הביתה?</span>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="text-stone-400 underline text-[11px]"
                  >
                    חזרה לתפריט
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="למשל: שמן זית, לחם מחמצת, חלב שיבולת שועל..."
                  value={shoppingText}
                  onChange={(e) => setShoppingText(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white shadow-md transition"
                >
                  + הוסף מיד לרשימת הקניות
                </button>
              </form>
            )}

            {view === "add_note" && (
              <form onSubmit={addNote} className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>📌 איזה פתק להשאיר על המקרר?</span>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="text-stone-400 underline text-[11px]"
                  >
                    חזרה לתפריט
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="למשל: קפה עלי הבוקר, תזכורת לקחת תיק לבית ספר..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full rounded-2xl border border-stone-300 bg-white p-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-rose-400 shadow-inner resize-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <span>❤️ הדבק פתק למקרר</span>
                </button>
              </form>
            )}

            {view === "add_chore" && (
              <form onSubmit={addChore} className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>🧹 איזו מטלה צריך לעשות?</span>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="text-stone-400 underline text-[11px]"
                  >
                    חזרה לתפריט
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="למשל: להוציא זבל, לקפל כביסה..."
                  value={choreText}
                  onChange={(e) => setChoreText(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-primary shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md transition"
                >
                  + הוסף מטלה
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <nav className="sticky bottom-0 z-40 bg-card/95 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-[#2ca88c] text-white shadow-xl shadow-primary/40 border-4 border-background active:scale-95 transition"
            title="פעולה מהירה"
          >
            <span className="text-2xl font-black leading-none">+</span>
          </button>

          <ul className="flex items-stretch justify-around">
            {TABS.map((tab) => {
              const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    className={`flex flex-col items-center gap-0.5 py-2.5 text-sm transition-colors ${
                      active ? "text-primary font-semibold" : "text-foreground/50"
                    }`}
                  >
                    <span className="text-xl leading-none">{tab.icon}</span>
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
