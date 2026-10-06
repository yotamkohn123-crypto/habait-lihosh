"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";
import { useFoods } from "@/lib/use-foods";
import { useWeeklyMenu } from "@/lib/use-weekly-menu";
import { WEEKDAYS, Food } from "@/lib/types";

function linesOf(text: string | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

async function addIngredientsToShoppingList(foods: Food[], identity: string | null) {
  const allIngredients = new Map<string, string>();
  for (const food of foods) {
    for (const line of linesOf(food.ingredients)) {
      allIngredients.set(line.toLowerCase(), line);
    }
  }
  if (allIngredients.size === 0) return 0;

  const { data: existing } = await supabase.from("shopping_items").select("name");
  const existingNames = new Set((existing ?? []).map((i) => i.name.trim().toLowerCase()));

  const missing = Array.from(allIngredients.entries()).filter(
    ([lower]) => !existingNames.has(lower)
  );
  if (missing.length === 0) return 0;

  await supabase.from("shopping_items").insert(
    missing.map(([, name]) => ({ name, added_by: identity ?? "משותף" }))
  );
  return missing.length;
}

export default function WeeklyMenuPage() {
  const { identity } = useIdentity();
  const { foods, loading: foodsLoading } = useFoods();
  const { entries, loading: menuLoading, setDayFood } = useWeeklyMenu();

  const [openDay, setOpenDay] = useState<number | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  function foodForDay(day: number): Food | null {
    const entry = entries.find((e) => e.day_of_week === day);
    if (!entry || !entry.food_id) return null;
    return foods.find((f) => f.id === entry.food_id) ?? null;
  }

  async function handleAddDay(food: Food) {
    const count = await addIngredientsToShoppingList([food], identity);
    setAddedMessage(
      count > 0 ? `${count} מצרכים נוספו לרשימת הקניות` : "כל המצרכים כבר ברשימת הקניות"
    );
    setTimeout(() => setAddedMessage(null), 3000);
  }

  async function handleAddWeek() {
    const weekFoods = WEEKDAYS.map((_, i) => foodForDay(i)).filter(
      (f): f is Food => f !== null
    );
    const count = await addIngredientsToShoppingList(weekFoods, identity);
    setAddedMessage(
      count > 0 ? `${count} מצרכים נוספו לרשימת הקניות` : "כל המצרכים כבר ברשימת הקניות"
    );
    setTimeout(() => setAddedMessage(null), 3000);
  }

  if (foodsLoading || menuLoading) {
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
              התפריט השבועי שלי
            </h1>
            <p className="text-[11px] font-medium text-stone-500">
              בוחרים מאכל מהרשימה שלך לכל יום
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {foods.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            קודם צריך להוסיף מאכלים ב"המאכלים שלי". אחר כך אפשר לבחור אותם לכל יום כאן.
          </p>
        ) : (
          <>
            {addedMessage && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800 text-center">
                {addedMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddWeek}
              className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98] transition"
            >
              הוסיפי את כל מצרכי השבוע לרשימת הקניות
            </button>

            <div className="space-y-1.5">
              {WEEKDAYS.map((dayName, i) => {
                const food = foodForDay(i);
                const open = openDay === i;
                return (
                  <div
                    key={dayName}
                    className="rounded-2xl bg-white shadow-sm border border-stone-100"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDay(open ? null : i)}
                      className="w-full flex items-center justify-between p-3.5 text-right"
                    >
                      <div>
                        <span className="text-xs font-bold text-stone-500 block">{dayName}</span>
                        <span className="text-sm font-semibold text-stone-800">
                          {food ? food.name : "לא נבחרה ארוחה"}
                        </span>
                      </div>
                      <span className="text-stone-300 text-xs">{open ? "▴" : "▾"}</span>
                    </button>

                    {open && (
                      <div className="px-3.5 pb-3.5 space-y-3">
                        <div>
                          <p className="text-[11px] text-stone-500 mb-1.5">בחרי מאכל ליום הזה</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {foods.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setDayFood(i, f.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                  food?.id === f.id
                                    ? "bg-primary text-white"
                                    : "bg-stone-50 text-stone-600"
                                }`}
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {food && (
                          <div className="rounded-xl bg-stone-50 p-3 space-y-2">
                            {linesOf(food.ingredients).length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-stone-600 mb-1">
                                  מצרכים
                                </p>
                                <ul className="text-xs text-stone-700 space-y-0.5">
                                  {linesOf(food.ingredients).map((ing, idx) => (
                                    <li key={idx}>• {ing}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {linesOf(food.steps).length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-stone-600 mb-1">
                                  איך מכינים
                                </p>
                                <ol className="text-xs text-stone-700 space-y-0.5 list-decimal pr-4">
                                  {linesOf(food.steps).map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {food.estimated_cost !== null && (
                              <p className="text-[11px] text-stone-500">
                                עלות משוערת: {food.estimated_cost} ₪
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAddDay(food)}
                              className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-white"
                            >
                              הוסיפי את המצרכים לרשימת הקניות
                            </button>
                          </div>
                        )}
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
