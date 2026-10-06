"use client";

import { useEffect, useState } from "react";
import { useIdentity } from "@/lib/identity-context";
import { isPushSupported, subscribeToPush } from "@/lib/push";

export default function NotificationPrompt() {
  const { identity } = useIdentity();
  const [visible, setVisible] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!identity || !isPushSupported()) return;
    const dismissed = localStorage.getItem("push-prompt-dismissed");
    if (dismissed) return;
    if (Notification.permission === "default") setVisible(true);
  }, [identity]);

  async function enable() {
    if (!identity) return;
    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeToPush(identity);
      }
    } catch {
      // ignore - user can try again later
    }
    setWorking(false);
    setVisible(false);
    localStorage.setItem("push-prompt-dismissed", "1");
  }

  function dismiss() {
    localStorage.setItem("push-prompt-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-3xl bg-primary/10 border border-primary/20 p-4 flex items-center gap-3">
      <span className="text-2xl">🔔</span>
      <div className="flex-1">
        <p className="text-xs font-bold text-stone-900">הפעילו התראות</p>
        <p className="text-[11px] text-stone-500">
          כדי לא לפספס פתקים, פריטי קניות ועדכונים בזמן אמת
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={enable}
          disabled={working}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition disabled:opacity-50"
        >
          הפעל
        </button>
        <button onClick={dismiss} className="text-[10px] text-stone-400">
          לא עכשיו
        </button>
      </div>
    </div>
  );
}
