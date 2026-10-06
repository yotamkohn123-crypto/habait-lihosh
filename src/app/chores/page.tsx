"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { Chore } from "@/lib/types";
import { memberColor } from "@/lib/members";

const EVERYONE = "כולם";

export default function ChoresPage() {
  const { identity, members } = useIdentity();
  const onlineCount = useOnlinePresence();

  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(EVERYONE);
  const [dueDate, setDueDate] = useState("");

  function assigneeBadgeColor(name: string) {
    return name === EVERYONE ? "#78716c" : memberColor(members, name);
  }

  async function loadChores() {
    const { data } = await supabase
      .from("chores")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setChores(data as Chore[]);
    setLoading(false);
  }

  useEffect(() => {
    loadChores();

    const channel = supabase
      .channel("chores-page-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chores" },
        loadChores
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (identity) setAssignedTo(identity);
  }, [identity]);

  async function addChore(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    await supabase.from("chores").insert({
      title: trimmed,
      assigned_to: assignedTo,
      due_date: dueDate.trim() || null,
    });

    setTitle("");
    setDueDate("");
    setFormOpen(false);
  }

  async function toggleChore(chore: Chore) {
    await supabase
      .from("chores")
      .update({ is_completed: !chore.is_completed })
      .eq("id", chore.id);
  }

  async function deleteChore(id: string) {
    await supabase.from("chores").delete().eq("id", id);
  }

  async function clearCompleted() {
    await supabase.from("chores").delete().eq("is_completed", true);
  }

  const openChores = chores.filter((c) => !c.is_completed);
  const completedChores = chores.filter((c) => c.is_completed);

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
              🧹
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">מטלות הבית</h1>
              <p className="text-[11px] font-medium text-emerald-700">
                סנכרון מיידי • {onlineCount} מחובר{onlineCount === 1 ? "" : "ים"}{" "}
                {onlineCount > 1 ? "🟢" : "⚪"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
          >
            {formOpen ? "ביטול" : "+ מטלה"}
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              מטלות
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-primary">
              {openChores.length} פתוחות
            </span>
          </div>
          <span className="text-xs text-stone-400">
            {completedChores.length}/{chores.length} בוצעו
          </span>
        </div>

        {formOpen && (
          <form
            onSubmit={addChore}
            className="rounded-3xl bg-white border border-stone-100 p-5 shadow-sm space-y-3"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="איזו מטלה צריך לעשות?"
              className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <div>
              <p className="text-xs text-stone-500 mb-2">מי אחראי</p>
              <div className="flex gap-2 flex-wrap">
                {[...members.map((m) => m.name), EVERYONE].map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => setAssignedTo(a)}
                    className={`flex-1 min-w-[72px] py-2 rounded-xl text-sm font-medium transition-colors ${
                      assignedTo === a ? "text-white" : "bg-stone-50 text-stone-500"
                    }`}
                    style={assignedTo === a ? { backgroundColor: assigneeBadgeColor(a) } : undefined}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="תאריך יעד (אופציונלי, למשל: עד יום שישי)"
              className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              className="w-full bg-primary text-white rounded-xl py-3 font-semibold active:scale-[0.98] transition-transform"
            >
              הוספה
            </button>
          </form>
        )}

        {openChores.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            אין מטלות פתוחות כרגע 🎉
          </p>
        ) : (
          <div className="space-y-1.5">
            {openChores.map((chore) => (
              <div
                key={chore.id}
                className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border border-stone-100"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleChore(chore)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-300 hover:border-primary transition flex-shrink-0 bg-white"
                    aria-label="סמן כבוצע"
                  />
                  <div>
                    <span className="text-sm font-semibold text-stone-800">
                      {chore.title}
                    </span>
                    {chore.due_date && (
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {chore.due_date}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold rounded-lg px-2 py-0.5 text-white"
                    style={{ backgroundColor: assigneeBadgeColor(chore.assigned_to) }}
                  >
                    {chore.assigned_to}
                  </span>
                  <button
                    onClick={() => deleteChore(chore.id)}
                    className="text-stone-300 px-1"
                    aria-label="מחק"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {completedChores.length > 0 && (
          <div className="pt-4 border-t border-stone-200/60">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 py-1"
              >
                <span className="text-emerald-700">✓</span>
                <span>בוצעו ({completedChores.length})</span>
                <span className="text-[11px] font-normal text-stone-400">
                  {showCompleted ? "▴" : "▾"}
                </span>
              </button>
              <button
                onClick={clearCompleted}
                className="text-[11px] font-medium text-stone-400 underline"
              >
                נקה הכל
              </button>
            </div>

            {showCompleted && (
              <div className="mt-2 space-y-1.5 opacity-65">
                {completedChores.map((chore) => (
                  <div
                    key={chore.id}
                    onClick={() => toggleChore(chore)}
                    className="flex items-center justify-between rounded-2xl bg-stone-50/80 p-3 border border-stone-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                        ✓
                      </div>
                      <span className="text-xs font-medium line-through text-stone-500">
                        {chore.title}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold rounded-lg px-2 py-0.5 text-white"
                      style={{ backgroundColor: assigneeBadgeColor(chore.assigned_to) }}
                    >
                      {chore.assigned_to}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
