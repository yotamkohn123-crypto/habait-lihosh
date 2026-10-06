import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function israelNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
}

function todayIsraelDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!settings || !settings.meal_reminder_time) {
    return NextResponse.json({ sent: 0, reason: "no reminder set" });
  }

  const now = israelNow();
  const currentHour = `${String(now.getHours()).padStart(2, "0")}:00`;
  const today = todayIsraelDate(now);

  if (settings.meal_reminder_time !== currentHour) {
    return NextResponse.json({ sent: 0, reason: "not this hour" });
  }

  if (settings.last_meal_reminder_sent === today) {
    return NextResponse.json({ sent: 0, reason: "already sent today" });
  }

  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*");
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no subscriptions" });
  }

  const dayOfWeek = now.getDay();
  const { data: menuEntry } = await supabaseAdmin
    .from("weekly_menu")
    .select("food_id")
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  let foodName: string | null = null;
  if (menuEntry?.food_id) {
    const { data: food } = await supabaseAdmin
      .from("foods")
      .select("name")
      .eq("id", menuEntry.food_id)
      .maybeSingle();
    foodName = food?.name ?? null;
  }

  const title = "🍽️ הגיע זמן ארוחה";
  const body = foodName ? `בתפריט היום: ${foodName}` : "אפשר לבדוק מה יש לאכול היום";
  const payload = JSON.stringify({ title, body });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const expiredEndpoints: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) expiredEndpoints.push(subs[i].endpoint);
    }
  });

  if (expiredEndpoints.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  await supabaseAdmin
    .from("app_settings")
    .update({ last_meal_reminder_sent: today })
    .eq("id", 1);

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
