"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { startOfMonthISO } from "@/lib/date";
import { Expense } from "@/lib/types";

export function useMonthlyExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", startOfMonthISO())
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setExpenses(data as Expense[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("monthly-expenses-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { expenses, loading };
}
