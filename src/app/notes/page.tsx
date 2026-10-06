"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useOnlinePresence } from "@/lib/use-presence";
import { relativeTime } from "@/lib/time";
import { FridgeNote, NoteReaction } from "@/lib/types";
import { memberColor } from "@/lib/members";
import { notifyOthers } from "@/lib/push";

const NOTE_EMOJIS = ["❤️", "😊", "☕", "🌿", "🎉", "😘", "🙏", "🥰"];
const REACTION_EMOJIS = ["❤️", "💋", "🤗", "😂", "☕"];

const QUICK_NOTES = ["קפה עלי הבוקר ☕", "אוהב/ת אותך ❤️", "המשך יום מושלם ✨"];

const COLOR_STYLES: Record<string, { bg: string; pin: string; label: string }> = {
  yellow: { bg: "bg-amber-100/90 border-amber-200 text-amber-950", pin: "#EF4444", label: "צהוב פסטל" },
  pink: { bg: "bg-rose-100/90 border-rose-200 text-rose-950", pin: "#EC4899", label: "ורוד בייבי" },
  green: { bg: "bg-emerald-100/90 border-emerald-200 text-emerald-950", pin: "#1F6F5C", label: "מנטה" },
};

export default function NotesPage() {
  const { identity, setIdentity, members } = useIdentity();
  const onlineCount = useOnlinePresence();

  const [notes, setNotes] = useState<FridgeNote[]>([]);
  const [reactions, setReactions] = useState<NoteReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState(NOTE_EMOJIS[0]);
  const [color, setColor] = useState("yellow");
  const [poppedKey, setPoppedKey] = useState<string | null>(null);

  async function loadNotes() {
    const { data } = await supabase
      .from("fridge_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotes(data as FridgeNote[]);
    setLoading(false);
  }

  async function loadReactions() {
    const { data } = await supabase.from("note_reactions").select("*");
    if (data) setReactions(data as NoteReaction[]);
  }

  useEffect(() => {
    loadNotes();
    loadReactions();

    const channel = supabase
      .channel("notes-page-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_notes" }, loadNotes)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_reactions" },
        loadReactions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openWithText(text: string) {
    setContent(text);
    setFormOpen(true);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !identity) return;

    await supabase.from("fridge_notes").insert({
      content: trimmed,
      author: identity,
      emoji,
      color,
    });
    notifyOthers(identity, "📌 פתק חדש על המקרר", trimmed);

    setContent("");
    setEmoji(NOTE_EMOJIS[0]);
    setColor("yellow");
    setFormOpen(false);
  }

  async function deleteNote(id: string) {
    await supabase.from("fridge_notes").delete().eq("id", id);
  }

  async function toggleReaction(noteId: string, reactionEmoji: string) {
    if (!identity) return;
    const key = `${noteId}:${reactionEmoji}`;
    const existing = reactions.find(
      (r) => r.note_id === noteId && r.emoji === reactionEmoji && r.author === identity
    );

    if (existing) {
      await supabase.from("note_reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("note_reactions")
        .insert({ note_id: noteId, emoji: reactionEmoji, author: identity });
      setPoppedKey(key);
      setTimeout(() => setPoppedKey((k) => (k === key ? null : k)), 200);

      const note = notes.find((n) => n.id === noteId);
      if (note && note.author !== identity) {
        notifyOthers(identity, `${reactionEmoji} ${identity} הגיב/ה לפתק שלך`, note.content);
      }
    }
  }

  function reactionsFor(noteId: string) {
    const groups = new Map<string, string[]>();
    for (const r of reactions.filter((r) => r.note_id === noteId)) {
      const list = groups.get(r.emoji) ?? [];
      list.push(r.author);
      groups.set(r.emoji, list);
    }
    return Array.from(groups.entries());
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-xl">
              📌
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">פתקים על המקרר</h1>
              <p className="text-[11px] font-medium text-emerald-700">
                סנכרון מיידי • {onlineCount} מחובר{onlineCount === 1 ? "" : "ים"}{" "}
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

      <div className="px-4 pt-4 pb-6 space-y-3">
        {!formOpen && (
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">
                השארת פתק חם על המקרר 💌
              </span>
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
              >
                + כתוב פתק
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_NOTES.map((text) => (
                <button
                  key={text}
                  onClick={() => openWithText(text)}
                  className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-700 transition"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {formOpen && (
          <form
            onSubmit={addNote}
            className="rounded-3xl bg-white p-4 shadow-md border border-stone-300 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-bold text-stone-900">
                פתק חדש מאת {identity}
              </span>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-stone-400 text-xs font-bold"
              >
                ביטול ✕
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתבו משהו מתוק, תזכורת או נשיקה..."
              rows={3}
              autoFocus
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-800 placeholder-stone-400 outline-none focus:border-primary focus:bg-white resize-none"
            />

            <div className="flex items-center gap-1.5 flex-wrap">
              {NOTE_EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition ${
                    emoji === e ? "bg-primary shadow-sm" : "bg-stone-50 border border-stone-200"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-stone-500">צבע הפתק:</span>
              <div className="flex items-center gap-2">
                {Object.entries(COLOR_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    title={style.label}
                    onClick={() => setColor(key)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      color === key ? "border-stone-800 scale-110" : "border-transparent opacity-70"
                    }`}
                    style={{ backgroundColor: style.pin }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
            >
              הדבקה על המקרר 📌
            </button>
          </form>
        )}

        {notes.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-stone-300 p-8 text-center bg-white/50 mt-2">
            <span className="text-3xl block mb-2">📌</span>
            <h3 className="text-sm font-bold text-stone-700">עדיין אין פתקים על המקרר</h3>
            <p className="text-xs text-stone-400 mt-1">השאירו הודעה קטנה וחמה אחד לשנייה</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {notes.map((note, index) => {
              const style = COLOR_STYLES[note.color] ?? COLOR_STYLES.yellow;
              const rotation = index % 2 === 0 ? "-rotate-1" : "rotate-1";

              return (
                <div
                  key={note.id}
                  className={`relative rounded-3xl p-5 border shadow-sm transition hover:shadow-md transform ${rotation} ${style.bg}`}
                >
                  <div
                    className="absolute -top-3 right-1/2 translate-x-1/2 h-6 w-6 rounded-full shadow-md flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: style.pin }}
                  >
                    📍
                  </div>

                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-3 left-3 text-black/30 text-xs"
                    aria-label="מחק פתק"
                  >
                    ✕
                  </button>

                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap mt-1 pl-4">
                    <span className="ml-1">{note.emoji}</span>״{note.content}״
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] opacity-75 border-t border-black/5 pt-2">
                    <span className="font-bold" style={{ color: memberColor(members, note.author) }}>
                      {note.author}
                    </span>
                    <span>{relativeTime(note.created_at)}</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {reactionsFor(note.id).map(([emo, users]) => {
                        const hasReacted = identity ? users.includes(identity) : false;
                        const key = `${note.id}:${emo}`;
                        return (
                          <button
                            key={emo}
                            onClick={() => toggleReaction(note.id, emo)}
                            title={users.join(", ")}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition active:scale-90 ${
                              poppedKey === key ? "scale-125" : "scale-100"
                            } ${
                              hasReacted
                                ? "bg-white shadow-sm border border-stone-300 text-stone-900"
                                : "bg-black/5 text-stone-700"
                            }`}
                          >
                            <span>{emo}</span>
                            <span className="text-[10px]">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-white/80 backdrop-blur-sm px-2 py-0.5 shadow-sm border border-black/5">
                      {REACTION_EMOJIS.map((emo) => (
                        <button
                          key={emo}
                          onClick={() => toggleReaction(note.id, emo)}
                          className="text-xs hover:scale-125 active:scale-90 transition p-0.5"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
