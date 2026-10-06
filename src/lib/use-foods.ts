"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Food } from "@/lib/types";

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("foods").select("*").order("name", { ascending: true });
    if (data) setFoods(data as Food[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("foods-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "foods" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { foods, loading };
}
