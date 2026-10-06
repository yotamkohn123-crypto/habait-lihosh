"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { Chore, ChoreStep, Recurrence } from "@/lib/types";
import { memberColor } from "@/lib/members";
import { CHORE_TEMPLATES } from "@/lib/chore-templates";

const EVERYONE = "כולם";
const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function choreMinutes(chore: Chore, steps: ChoreStep[]): number | null {
  if (chore.estimated_minutes !== null) return chore.estimated_minutes;
  if (steps.length === 0) return null;
  const sum = steps.reduce((s, step) => s + (step.estimated_minutes ?? 0), 0);
  return sum > 0 ? sum : null;
}

function recurrenceLabel(chore: Chore): string | null {
  if (!chore.recurrence) return null;
  if (chore.recurrence === "יומי") return "חוזרת כל יום";
  if (chore.recurrence === "שבועי") {
    const day = chore.recurrence_day !== null ? WEEKDAYS[chore.recurrence_day] : null;
    return day ? `חוזרת כל שבוע ביום ${day}` : "חוזרת כל שבוע";
  }
  if (chore.recurrence === "חודשי") {
    return chore.recurrence_day ? `חוזרת כל חודש ב-${chore.recurrence_day} לחודש` : "חוזרת כל חודש";
  }
  return null;
}

export default function ChoresPage() {
  const { identity, members } = useIdentity();
  const onlineCount = useOnlinePresence();

  const [chores, setChores] = useState<Chore[]>([]);
  const [steps, setSteps] = useState<ChoreStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [expandedChoreId, setExpandedChoreId] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState("");
  const [newStepMinutes, setNewStepMinutes] = useState("");
  const [shortSuggestionId, setShortSuggestionId] = useState<string | null>(null);
  const [triedShortSuggestion, setTriedShortSuggestion] = useState(false);

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(EVERYONE);
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | "">("");
  const [recurrenceDay, setRecurrenceDay] = useState<number | "">("");

  function assigneeBadgeColor(name: string) {
    return name === EVERYONE ? "#78716c" : memberColor(members, name);
  }

  function stepsFor(choreId: string) {
    return steps
      .filter((s) => s.chore_id === choreId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async function loadAll() {
    const [choresRes, stepsRes] = await Promise.all([
      supabase.from("chores").select("*").order("created_at", { ascending: true }),
      supabase.from("chore_steps").select("*"),
    ]);
    if (choresRes.data) setChores(choresRes.data as Chore[]);
    if (stepsRes.data) setSteps(stepsRes.data as ChoreStep[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("chores-page-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "chore_steps" }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (identity) setAssignedTo(identity);
  }, [identity]);

  function resetForm() {
    setTitle("");
    setDueDate("");
    setRecurrence("");
    setRecurrenceDay("");
    setFormOpen(false);
  }

  async function addChore(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    await supabase.from("chores").insert({
      title: trimmed,
      assigned_to: assignedTo,
      due_date: dueDate.trim() || null,
      recurrence: recurrence || null,
      recurrence_day: recurrenceDay === "" ? null : recurrenceDay,
    });

    resetForm();
  }

  async function addFromTemplate(templateIndex: number) {
    const template = CHORE_TEMPLATES[templateIndex];
    const { data: newChore } = await supabase
      .from("chores")
      .insert({ title: template.name, assigned_to: identity ?? EVERYONE })
      .select()
      .single();

    if (newChore) {
      await supabase.from("chore_steps").insert(
        template.steps.map((s, i) => ({
          chore_id: newChore.id,
          text: s.text,
          estimated_minutes: s.minutes,
          order_index: i,
        }))
      );
    }
  }

  async function toggleChore(chore: Chore) {
    const nowCompleted = !chore.is_completed;
    await supabase.from("chores").update({ is_completed: nowCompleted }).eq("id", chore.id);

    if (nowCompleted && chore.recurrence) {
      const { data: newChore } = await supabase
        .from("chores")
        .insert({
          title: chore.title,
          assigned_to: chore.assigned_to,
          due_date: chore.due_date,
          recurrence: chore.recurrence,
          recurrence_day: chore.recurrence_day,
          estimated_minutes: chore.estimated_minutes,
        })
        .select()
        .single();

      const choreSteps = stepsFor(chore.id);
      if (newChore && choreSteps.length > 0) {
        await supabase.from("chore_steps").insert(
          choreSteps.map((s) => ({
            chore_id: newChore.id,
            text: s.text,
            estimated_minutes: s.estimated_minutes,
            order_index: s.order_index,
          }))
        );
      }
    }
  }

  async function toggleStep(step: ChoreStep) {
    await supabase
      .from("chore_steps")
      .update({ is_completed: !step.is_completed })
      .eq("id", step.id);
  }

  async function addStep(choreId: string) {
    const text = newStepText.trim();
    if (!text) return;
    const existing = stepsFor(choreId);
    await supabase.from("chore_steps").insert({
      chore_id: choreId,
      text,
      estimated_minutes: newStepMinutes ? Number(newStepMinutes) : null,
      order_index: existing.length,
    });
    setNewStepText("");
    setNewStepMinutes("");
  }

  async function deleteStep(id: string) {
    await supabase.from("chore_steps").delete().eq("id", id);
  }

  async function deleteChore(id: string) {
    await supabase.from("chores").delete().eq("id", id);
    setConfirmDeleteId(null);
  }

  async function clearCompleted() {
    await supabase.from("chores").delete().eq("is_completed", true);
    setConfirmClearCompleted(false);
  }

  function findShortChore(excludeId: string | null): Chore | null {
    const candidates = openChores.filter((c) => {
      if (c.id === excludeId) return false;
      const minutes = choreMinutes(c, stepsFor(c.id));
      return minutes !== null && minutes <= 10;
    });
    return candidates[0] ?? null;
  }

  const openChores = chores.filter((c) => !c.is_completed);
  const completedChores = chores.filter((c) => c.is_completed);

  const nextChore = openChores[0] ?? null;
  const restChores = openChores.slice(1);

  const shortSuggestion = shortSuggestionId
    ? chores.find((c) => c.id === shortSuggestionId) ?? null
    : null;

  function handleFindShortChore() {
    const found = findShortChore(nextChore?.id ?? null);
    setShortSuggestionId(found?.id ?? null);
    setTriedShortSuggestion(true);
  }

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
            onClick={() => (formOpen ? resetForm() : setFormOpen(true))}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
          >
            {formOpen ? "סגרי" : "הוסיפי מטלה"}
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">מטלות</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-primary">
              {openChores.length} פתוחות
            </span>
          </div>
          <span className="text-xs text-stone-400">
            {completedChores.length} מתוך {chores.length} בוצעו
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CHORE_TEMPLATES.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onClick={() => addFromTemplate(i)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-2xl bg-white border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 active:scale-95 transition"
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
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

            <div>
              <p className="text-xs text-stone-500 mb-2">האם המטלה חוזרת</p>
              <div className="flex gap-2 flex-wrap">
                {(["", "יומי", "שבועי", "חודשי"] as const).map((r) => (
                  <button
                    type="button"
                    key={r || "none"}
                    onClick={() => {
                      setRecurrence(r);
                      setRecurrenceDay("");
                    }}
                    className={`flex-1 min-w-[64px] py-2 rounded-xl text-xs font-medium transition-colors ${
                      recurrence === r ? "bg-primary text-white" : "bg-stone-50 text-stone-500"
                    }`}
                  >
                    {r || "לא חוזרת"}
                  </button>
                ))}
              </div>
            </div>

            {recurrence === "שבועי" && (
              <div>
                <p className="text-xs text-stone-500 mb-2">באיזה יום</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => setRecurrenceDay(i)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        recurrenceDay === i ? "bg-primary text-white" : "bg-stone-50 text-stone-500"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recurrence === "חודשי" && (
              <div>
                <p className="text-xs text-stone-500 mb-2">באיזה יום בחודש</p>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(e.target.value ? Number(e.target.value) : "")}
                  placeholder="למשל: 1"
                  className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

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
              הוסיפי מטלה
            </button>
          </form>
        )}

        {!shortSuggestion && (
          <button
            type="button"
            onClick={handleFindShortChore}
            className="w-full rounded-2xl bg-amber-50 border border-amber-200 py-3 text-xs font-bold text-amber-800 active:scale-[0.99] transition"
          >
            10 דקות סדר — מצאי לי משימה קצרה
          </button>
        )}

        {shortSuggestion && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-900">הצעה למשימה קצרה (10 דקות או פחות):</p>
            <p className="text-sm font-semibold text-stone-800">{shortSuggestion.title}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toggleChore(shortSuggestion);
                  setShortSuggestionId(null);
                }}
                className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-white"
              >
                סיימתי את זה
              </button>
              <button
                type="button"
                onClick={() => setShortSuggestionId(null)}
                className="flex-1 rounded-xl bg-white border border-amber-200 py-2 text-xs font-bold text-amber-800"
              >
                לא עכשיו
              </button>
            </div>
          </div>
        )}

        {triedShortSuggestion && !shortSuggestion && (
          <p className="text-xs text-stone-400 text-center -mt-2">
            אין כרגע משימה קצרה מוכנה. אפשר להוסיף זמן משוער למטלה כדי שתופיע כאן.
          </p>
        )}

        {nextChore && (
          <div className="rounded-3xl bg-white border-2 border-primary p-4 space-y-3">
            <p className="text-[11px] font-bold text-primary">הצעד הבא</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleChore(nextChore)}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-300 hover:border-primary transition flex-shrink-0 bg-white"
                aria-label="סמני מטלה כבוצעה"
              />
              <div className="flex-1">
                <p className="text-base font-bold text-stone-900">{nextChore.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span
                    className="text-[10px] font-bold rounded-lg px-2 py-0.5 text-white"
                    style={{ backgroundColor: assigneeBadgeColor(nextChore.assigned_to) }}
                  >
                    {nextChore.assigned_to}
                  </span>
                  {recurrenceLabel(nextChore) && (
                    <span className="text-[10px] text-stone-400">{recurrenceLabel(nextChore)}</span>
                  )}
                  {nextChore.due_date && (
                    <span className="text-[10px] text-stone-400">{nextChore.due_date}</span>
                  )}
                </div>
              </div>
            </div>

            <ChoreSteps
              choreId={nextChore.id}
              steps={stepsFor(nextChore.id)}
              onToggleStep={toggleStep}
              onDeleteStep={deleteStep}
              newStepText={newStepText}
              newStepMinutes={newStepMinutes}
              onNewStepTextChange={setNewStepText}
              onNewStepMinutesChange={setNewStepMinutes}
              onAddStep={() => addStep(nextChore.id)}
            />
          </div>
        )}

        {restChores.length > 0 && (
          <div className="space-y-1.5">
            {restChores.map((chore) => {
              const confirming = confirmDeleteId === chore.id;
              const expanded = expandedChoreId === chore.id;
              return (
                <div
                  key={chore.id}
                  className="rounded-2xl bg-white shadow-sm border border-stone-100"
                >
                  <div className="flex items-center justify-between p-3.5">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setExpandedChoreId(expanded ? null : chore.id)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChore(chore);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-300 hover:border-primary transition flex-shrink-0 bg-white"
                        aria-label="סמני מטלה כבוצעה"
                      />
                      <div>
                        <span className="text-sm font-semibold text-stone-800">{chore.title}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {chore.due_date && (
                            <p className="text-[11px] text-stone-400 mt-0.5">{chore.due_date}</p>
                          )}
                          {recurrenceLabel(chore) && (
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              {recurrenceLabel(chore)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold rounded-lg px-2 py-0.5 text-white"
                        style={{ backgroundColor: assigneeBadgeColor(chore.assigned_to) }}
                      >
                        {chore.assigned_to}
                      </span>
                      {!confirming && (
                        <button
                          onClick={() => setConfirmDeleteId(chore.id)}
                          className="text-stone-300 px-1"
                          aria-label="מחקי מטלה"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {confirming && (
                    <div className="flex items-center justify-between rounded-xl bg-stone-50 mx-3.5 mb-3 px-3 py-2">
                      <span className="text-xs text-stone-600">למחוק את המטלה הזו?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-stone-500"
                        >
                          בטלי
                        </button>
                        <button
                          onClick={() => deleteChore(chore.id)}
                          className="text-xs font-bold text-white bg-red-500 rounded-lg px-3 py-1.5"
                        >
                          מחקי
                        </button>
                      </div>
                    </div>
                  )}

                  {expanded && !confirming && (
                    <div className="px-3.5 pb-3.5">
                      <ChoreSteps
                        choreId={chore.id}
                        steps={stepsFor(chore.id)}
                        onToggleStep={toggleStep}
                        onDeleteStep={deleteStep}
                        newStepText={newStepText}
                        newStepMinutes={newStepMinutes}
                        onNewStepTextChange={setNewStepText}
                        onNewStepMinutesChange={setNewStepMinutes}
                        onAddStep={() => addStep(chore.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {openChores.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-8">
            אין כרגע מטלות פתוחות. אפשר להוסיף מטלה חדשה למעלה.
          </p>
        )}

        {completedChores.length > 0 && (
          <div className="pt-4 border-t border-stone-200/60">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 py-1"
              >
                <span className="text-emerald-700">✓</span>
                <span>הציגי מטלות שבוצעו ({completedChores.length})</span>
                <span className="text-[11px] font-normal text-stone-400">
                  {showCompleted ? "▴" : "▾"}
                </span>
              </button>
              {!confirmClearCompleted ? (
                <button
                  onClick={() => setConfirmClearCompleted(true)}
                  className="text-[11px] font-medium text-stone-400 underline"
                >
                  מחקי מטלות שבוצעו
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmClearCompleted(false)}
                    className="text-[11px] font-semibold text-stone-500"
                  >
                    בטלי
                  </button>
                  <button
                    onClick={clearCompleted}
                    className="text-[11px] font-bold text-white bg-red-500 rounded-lg px-2 py-1"
                  >
                    מחקי הכל
                  </button>
                </div>
              )}
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

function ChoreSteps({
  steps,
  onToggleStep,
  onDeleteStep,
  newStepText,
  newStepMinutes,
  onNewStepTextChange,
  onNewStepMinutesChange,
  onAddStep,
}: {
  choreId: string;
  steps: ChoreStep[];
  onToggleStep: (step: ChoreStep) => void;
  onDeleteStep: (id: string) => void;
  newStepText: string;
  newStepMinutes: string;
  onNewStepTextChange: (v: string) => void;
  onNewStepMinutesChange: (v: string) => void;
  onAddStep: () => void;
}) {
  return (
    <div className="space-y-1.5 pt-1">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleStep(step)}
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition flex-shrink-0 ${
                step.is_completed
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-stone-300 bg-white"
              }`}
            >
              {step.is_completed && <span className="text-[10px]">✓</span>}
            </button>
            <span
              className={`text-xs ${
                step.is_completed ? "line-through text-stone-400" : "text-stone-700"
              }`}
            >
              {step.text}
            </span>
            {step.estimated_minutes !== null && (
              <span className="text-[10px] text-stone-400">~{step.estimated_minutes} דק׳</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDeleteStep(step.id)}
            className="text-stone-300 text-xs px-1"
            aria-label="מחקי שלב"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1.5 pt-1">
        <input
          value={newStepText}
          onChange={(e) => onNewStepTextChange(e.target.value)}
          placeholder="הוסיפי שלב..."
          className="flex-1 h-9 rounded-xl bg-stone-50 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          value={newStepMinutes}
          onChange={(e) => onNewStepMinutesChange(e.target.value)}
          type="number"
          placeholder="דק׳"
          className="w-14 h-9 rounded-xl bg-stone-50 px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={onAddStep}
          className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-bold"
        >
          הוסיפי
        </button>
      </div>
    </div>
  );
}
