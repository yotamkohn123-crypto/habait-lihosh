"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { UsualShoppingItem } from "@/lib/types";

export function useUsualShopping() {
  const [items, setItems] = useState<UsualShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("usual_shopping_items")
      .select("*")
      .order("name", { ascending: true });
    if (data) setItems(data as UsualShoppingItem[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("usual-shopping-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "usual_shopping_items" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading };
}
