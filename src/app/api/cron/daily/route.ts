import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getTodayQueue } from "@/lib/queue/build";
import { buildNudgeEmail } from "@/lib/nudge";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron, once a day around 9 AM Pacific (16:00 UTC; an hour earlier on the clock after DST
 * ends). Doubles as a keep-alive so the free Supabase project never pauses. Builds the list for
 * the review day that contains now + 2 hours, which is right on both sides of the DST change.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  await db.execute(sql`select 1`);

  const at = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const q = await getTodayQueue(at);
  let emailed = false;
  let emailError: string | null = null;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NUDGE_EMAIL_TO;
  if (apiKey && to) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const appUrl = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
      const mail = buildNudgeEmail(q, appUrl);
      const res = await resend.emails.send({
        from: process.env.NUDGE_EMAIL_FROM ?? "Recur <onboarding@resend.dev>",
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (res.error) throw new Error(res.error.message);
      emailed = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error("[cron] nudge email failed", e);
    }
  }
  return NextResponse.json({
    ok: true,
    reviewDay: q.stats.reviewDay,
    due: q.stats.due,
    revises: q.stats.revises,
    resolves: q.stats.resolves,
    emailed,
    emailError,
  });
}
