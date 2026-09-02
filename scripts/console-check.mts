import { chromium } from "@playwright/test";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const msgs: string[] = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(`[${m.type()}] ${m.text().slice(0, 600)}`); });
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message.slice(0, 600)}`));
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /test sign in/i }).click();
await page.waitForURL(/\/today/);
await page.waitForTimeout(1500);
for (const p of (process.argv[2] ?? "/today,/settings").split(",")) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
}
console.log(msgs.length ? msgs.join("\n---\n") : "no console errors/warnings");
await browser.close();
