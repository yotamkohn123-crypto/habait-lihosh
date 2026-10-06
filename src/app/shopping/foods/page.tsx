"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useFoods } from "@/lib/use-foods";
import { Food } from "@/lib/types";

export default function FoodsPage() {
  const { foods, loading } = useFoods();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [cost, setCost] = useState("");
  const [isNoCook, setIsNoCook] = useState(false);

  function resetForm() {
    setName("");
    setIngredients("");
    setSteps("");
    setCost("");
    setIsNoCook(false);
    setFormOpen(false);
    setEditingId(null);
  }

  function startEdit(food: Food) {
    setEditingId(food.id);
    setName(food.name);
    setIngredients(food.ingredients ?? "");
    setSteps(food.steps ?? "");
    setCost(food.estimated_cost !== null ? String(food.estimated_cost) : "");
    setIsNoCook(food.is_no_cook);
    setFormOpen(true);
  }

  async function saveFood(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const payload = {
      name: trimmed,
      ingredients: ingredients.trim() || null,
      steps: steps.trim() || null,
      estimated_cost: cost ? Number(cost) : null,
      is_no_cook: isNoCook,
    };

    if (editingId) {
      await supabase.from("foods").update(payload).eq("id", editingId);
    } else {
      await supabase.from("foods").insert(payload);
    }

    resetForm();
  }

  async function deleteFood(id: string) {
    await supabase.from("foods").delete().eq("id", id);
    setConfirmDeleteId(null);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/shopping"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
            >
              ‹
            </Link>
            <div>
              <h1 className="text-base font-bold text-stone-900 leading-tight">המאכלים שלי</h1>
              <p className="text-[11px] font-medium text-stone-500">
                רשימת המאכלים שאת אוהבת. את קובעת מה ברשימה.
              </p>
            </div>
          </div>
          <button
            onClick={() => (formOpen ? resetForm() : setFormOpen(true))}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
          >
            {formOpen ? "סגרי" : "הוסיפי מאכל"}
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {formOpen && (
          <form
            onSubmit={saveFood}
            className="rounded-3xl bg-white border border-stone-100 p-5 shadow-sm space-y-3"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם המאכל, למשל: פסטה"
              className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <div>
              <label className="text-xs text-stone-500 block mb-1">
                מצרכים (כל מצרך בשורה נפרדת)
              </label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder={"פסטה\nרוטב עגבניות\nגבינה צהובה"}
                rows={3}
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-stone-500 block mb-1">
                איך מכינים (כל שלב בשורה נפרדת)
              </label>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={"להרתיח מים\nלשים פסטה למים למשך 10 דקות\nלחמם רוטב ולערבב"}
                rows={3}
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-stone-500 block mb-1">עלות משוערת (₪)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={isNoCook}
                onChange={(e) => setIsNoCook(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              אפשר לאכול בלי בישול
            </label>

            <button
              type="submit"
              className="w-full bg-primary text-white rounded-xl py-3 font-semibold active:scale-[0.98] transition-transform"
            >
              {editingId ? "שמרי שינויים" : "הוסיפי מאכל"}
            </button>
          </form>
        )}

        {foods.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            עדיין לא הוספת מאכלים. אפשר להוסיף למעלה, למשל פסטה או פיצה.
          </p>
        ) : (
          <div className="space-y-1.5">
            {foods.map((food) => {
              const confirming = confirmDeleteId === food.id;
              return (
                <div
                  key={food.id}
                  className="rounded-2xl bg-white shadow-sm border border-stone-100 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => startEdit(food)}
                      className="flex-1 text-right"
                    >
                      <span className="text-sm font-semibold text-stone-800 block">
                        {food.name}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {food.is_no_cook && "בלי בישול • "}
                        {food.estimated_cost !== null && `כ-${food.estimated_cost} ₪`}
                      </span>
                    </button>
                    {!confirming && (
                      <button
                        onClick={() => setConfirmDeleteId(food.id)}
                        className="text-stone-300 px-1"
                        aria-label="מחקי מאכל"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {confirming && (
                    <div className="flex items-center justify-between rounded-xl bg-stone-50 mt-2 px-3 py-2">
                      <span className="text-xs text-stone-600">
                        למחוק את {food.name}?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-stone-500"
                        >
                          בטלי
                        </button>
                        <button
                          onClick={() => deleteFood(food.id)}
                          className="text-xs font-bold text-white bg-red-500 rounded-lg px-3 py-1.5"
                        >
                          מחקי
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
