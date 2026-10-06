"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppSettings } from "@/lib/types";

const DEFAULTS: AppSettings = {
  id: 1,
  monthly_income: 0,
  weekly_budget: 0,
  show_money_analogies: true,
  helper_name: null,
  meal_reminder_time: null,
  last_meal_reminder_sent: null,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setSettings(data as AppSettings);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("app-settings-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateSettings(patch: Partial<AppSettings>) {
    await supabase.from("app_settings").update(patch).eq("id", 1);
  }

  return { settings, loading, updateSettings };
}
