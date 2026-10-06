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

export async function POST(req: NextRequest) {
  const { author, title, body } = await req.json();
  if (!author || !title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .neq("identity", author);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

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
      if (statusCode === 410 || statusCode === 404) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    }
  });

  if (expiredEndpoints.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
