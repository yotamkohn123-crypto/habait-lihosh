"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSettings } from "@/lib/use-app-settings";

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useAppSettings();

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [weeklyBudget, setWeeklyBudget] = useState("");
  const [helperName, setHelperName] = useState("");
  const [mealReminderTime, setMealReminderTime] = useState("");
  const [savedField, setSavedField] = useState<string | null>(null);

  useEffect(() => {
    setMonthlyIncome(settings.monthly_income ? String(settings.monthly_income) : "");
    setWeeklyBudget(settings.weekly_budget ? String(settings.weekly_budget) : "");
    setHelperName(settings.helper_name ?? "");
    setMealReminderTime(settings.meal_reminder_time ?? "");
  }, [settings]);

  function showSaved(field: string) {
    setSavedField(field);
    setTimeout(() => setSavedField((f) => (f === field ? null : f)), 2000);
  }

  async function saveMonthlyIncome() {
    const value = Number(monthlyIncome) || 0;
    await updateSettings({ monthly_income: value });
    showSaved("income");
  }

  async function saveWeeklyBudget() {
    const value = Number(weeklyBudget) || 0;
    await updateSettings({ weekly_budget: value });
    showSaved("weeklyBudget");
  }

  async function saveHelperName() {
    await updateSettings({ helper_name: helperName.trim() || null });
    showSaved("helper");
  }

  async function saveMealReminderTime() {
    await updateSettings({ meal_reminder_time: mealReminderTime || null });
    showSaved("reminder");
  }

  async function toggleAnalogies() {
    await updateSettings({ show_money_analogies: !settings.show_money_analogies });
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
            href="/expenses"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition"
          >
            ‹
          </Link>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-tight">הגדרות</h1>
            <p className="text-[11px] font-medium text-stone-500">
              כאן אפשר לשנות פרטים על הכסף והאוכל
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            כמה כסף נכנס בחודש
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder="0"
              className="flex-1 h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-sm text-stone-800 focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={saveMonthlyIncome}
              className="rounded-2xl bg-primary px-4 h-11 text-xs font-bold text-white"
            >
              {savedField === "income" ? "נשמר ✓" : "שמרי"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            תקציב שבועי לאוכל ולהוצאות קטנות
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={weeklyBudget}
              onChange={(e) => setWeeklyBudget(e.target.value)}
              placeholder="0"
              className="flex-1 h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-sm text-stone-800 focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={saveWeeklyBudget}
              className="rounded-2xl bg-primary px-4 h-11 text-xs font-bold text-white"
            >
              {savedField === "weeklyBudget" ? "נשמר ✓" : "שמרי"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            מי עוזר/ת בתשלום החשבונות
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={helperName}
              onChange={(e) => setHelperName(e.target.value)}
              placeholder="למשל: אמא, דני"
              className="flex-1 h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-sm text-stone-800 focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={saveHelperName}
              className="rounded-2xl bg-primary px-4 h-11 text-xs font-bold text-white"
            >
              {savedField === "helper" ? "נשמר ✓" : "שמרי"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            תזכורת לארוחה בשעה קבועה (אופציונלי)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={mealReminderTime}
              onChange={(e) => setMealReminderTime(e.target.value)}
              className="flex-1 h-11 rounded-2xl border border-stone-300 bg-white px-3.5 text-sm text-stone-800 focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={saveMealReminderTime}
              className="rounded-2xl bg-primary px-4 h-11 text-xs font-bold text-white"
            >
              {savedField === "reminder" ? "נשמר ✓" : "שמרי"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-700">
              הראי השוואות לדברים מוכרים
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              למשל: "400 ₪ זה בערך כמו 8 פיצות"
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAnalogies}
            className={`relative h-7 w-12 rounded-full transition flex-shrink-0 ${
              settings.show_money_analogies ? "bg-primary" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                settings.show_money_analogies ? "right-1" : "right-6"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
