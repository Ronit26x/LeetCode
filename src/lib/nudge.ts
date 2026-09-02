import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import type { TodayQueue } from "@/lib/queue/build";
import { formatMinutes, formatPercent, MODE_LABEL, pluralize } from "@/lib/format";

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A quiet, plain email: the day's list and a link. Sent only when Resend is configured. */
export function buildNudgeEmail(q: TodayQueue, appUrl: string): { subject: string; html: string; text: string } {
  const tz = q.settings.timezone;
  const date = formatInTimeZone(q.stats.dayStartAt, tz, "EEEE, MMMM d");
  const n = q.stats.due;
  const subject = n === 0 ? "Recur: nothing due today" : `Recur: ${pluralize(n, "card")} today`;
  const lines = q.items.map((p) => {
    const mode = p.suggestion ? MODE_LABEL[p.suggestion.mode] : "Revise";
    const num = p.leetcodeNumber ? `${p.leetcodeNumber}. ` : "";
    const r = p.retrievability !== null ? ` (R ${formatPercent(p.retrievability)})` : "";
    return { text: `${mode.padEnd(7)} ${num}${p.title}${r}`, html: `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px">${mode}</td><td style="padding:4px 0;font-size:14px">${escape(num + p.title)}<span style="color:#9ca3af">${r}</span></td></tr>` };
  });
  const summary = n ? `${pluralize(q.stats.revises, "revise")}, ${pluralize(q.stats.resolves, "resolve")}, about ${formatMinutes(q.stats.estimatedMinutes)}.` : "Nothing is due. Add a problem you solved, or work through the backlog.";
  const text = [`${date}`, summary, "", ...lines.map((l) => l.text), "", `${appUrl}/today`].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fbfaf8;color:#1f2937;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 4px;font-size:13px;color:#6b7280">${escape(date)}</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:500;font-size:22px">${n ? escape(pluralize(n, "card")) + " today" : "Nothing due"}</h1>
<p style="margin:0 0 16px;font-size:14px;color:#4b5563">${escape(summary)}</p>
${lines.length ? `<table style="border-collapse:collapse">${lines.map((l) => l.html).join("")}</table>` : ""}
<p style="margin:20px 0 0"><a href="${appUrl}/today" style="display:inline-block;padding:8px 14px;background:#3d5dc4;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">Open Today</a></p>
</div></body></html>`;
  return { subject, html, text };
}
