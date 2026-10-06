"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Expense } from "@/lib/types";

function lastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function useLastMonthRecurring() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const { start, end } = lastMonthRange();
    supabase
      .from("expenses")
      .select("*")
      .eq("is_recurring", true)
      .gte("date", start)
      .lt("date", end)
      .then(({ data }) => {
        if (data) setExpenses(data as Expense[]);
      });
  }, []);

  return expenses;
}
