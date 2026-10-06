"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { WeeklyMenuEntry } from "@/lib/types";

export function useWeeklyMenu() {
  const [entries, setEntries] = useState<WeeklyMenuEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("weekly_menu").select("*");
    if (data) setEntries(data as WeeklyMenuEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("weekly-menu-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_menu" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function setDayFood(dayOfWeek: number, foodId: string | null) {
    await supabase
      .from("weekly_menu")
      .upsert({ day_of_week: dayOfWeek, food_id: foodId }, { onConflict: "day_of_week" });
  }

  return { entries, loading, setDayFood };
}
