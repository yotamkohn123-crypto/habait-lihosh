import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { CalendarEvent } from "@/lib/types";
import { daysUntil, nextOccurrenceDate } from "@/lib/calendar";
import { FIXED_BILLS } from "@/lib/expense-categories";
import { startOfMonthISO } from "@/lib/date";

const BILL_REMINDER_DAY = 25;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const [{ data: events }, { data: subs }] = await Promise.all([
    supabaseAdmin.from("events").select("*"),
    supabaseAdmin.from("push_subscriptions").select("*"),
  ]);

  if (!events || !subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, checked: events?.length ?? 0 });
  }

  let sent = 0;
  const expiredEndpoints = new Set<string>();

  async function broadcast(title: string, body: string) {
    const payload = JSON.stringify({ title, body });
    const results = await Promise.allSettled(
      subs!.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent++;
      } else {
        const statusCode = (r.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) expiredEndpoints.add(subs![i].endpoint);
      }
    });
  }

  const dueEvents = (events as CalendarEvent[])
    .map((event) => ({
      event,
      days: daysUntil(nextOccurrenceDate(event.event_date, event.recurring)),
    }))
    .filter(({ days }) => days === 0 || days === 1);

  for (const { event, days } of dueEvents) {
    const icon = event.category === "יום הולדת" ? "🎂" : "📅";
    const title = days === 0 ? `${icon} היום! ${event.title}` : `${icon} מחר: ${event.title}`;
    await broadcast(title, event.category);
  }

  let unpaidBills: string[] = [];
  if (new Date().getDate() === BILL_REMINDER_DAY) {
    const { data: monthExpenses } = await supabaseAdmin
      .from("expenses")
      .select("title")
      .gte("date", startOfMonthISO());

    const paidTitles = new Set((monthExpenses ?? []).map((e) => e.title));
    unpaidBills = FIXED_BILLS.filter((b) => !paidTitles.has(b.name)).map(
      (b) => `${b.icon} ${b.name}`
    );

    if (unpaidBills.length > 0) {
      await broadcast(
        "📋 תזכורת חודשית לחשבונות",
        `עדיין לא סומנו כשולמו: ${unpaidBills.join(", ")}`
      );
    }
  }

  if (expiredEndpoints.size > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", Array.from(expiredEndpoints));
  }

  return NextResponse.json({
    sent,
    checked: events.length,
    due: dueEvents.length,
    unpaidBills: unpaidBills.length,
  });
}
