"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useIdentity } from "@/lib/identity-context";

export function useOnlinePresence() {
  const { identity } = useIdentity();
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    if (!identity) return;

    const channel = supabase.channel("app-presence", {
      config: { presence: { key: identity } },
    });

    channel.on("presence", { event: "sync" }, () => {
      setOnlineCount(Object.keys(channel.presenceState()).length);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [identity]);

  return onlineCount;
}
