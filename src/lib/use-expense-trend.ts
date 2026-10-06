"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const MONTHS_BACK = 5;

export interface MonthlyTotal {
  monthKey: string;
  label: string;
  total: number;
}

function monthStartISO(monthsAgo: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1).toISOString().slice(0, 10);
}

function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useExpenseTrend() {
  const [months, setMonths] = useState<MonthlyTotal[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("expenses")
      .select("amount, date")
      .gte("date", monthStartISO(MONTHS_BACK));

    const now = new Date();
    const totals = new Map<string, number>();
    for (let i = MONTHS_BACK; i >= 0; i--) {
      totals.set(monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)), 0);
    }

    (data as { amount: number; date: string }[] | null)?.forEach((e) => {
      const key = monthKeyOf(new Date(e.date));
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + Number(e.amount));
    });

    const result: MonthlyTotal[] = Array.from(totals.entries()).map(([key, total]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        monthKey: key,
        label: new Date(y, m - 1, 1).toLocaleDateString("he-IL", { month: "short" }),
        total,
      };
    });

    setMonths(result);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("expense-trend-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { months, loading };
}
