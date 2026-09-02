// Lighthouse accessibility audit of the signed-in app. Requires a dev server with AUTH_TEST_LOGIN.
// Usage: BASE_URL=http://localhost:3000 pnpm exec tsx scripts/a11y.mts [pathA,pathB,...]
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const paths = (process.argv[2] ?? "/today,/problems,/backlog,/stats,/settings,/review,/problems/new,/login").split(",");

// Sign in once with Playwright and reuse the session cookie.
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.getByRole("button", { name: /test sign in/i }).click();
await page.waitForURL(/\/today/);
const cookies = await ctx.cookies();
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
const chromePath = chromium.executablePath();
await browser.close();

const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox"] });
const results: { path: string; a11y: number | null; failures: string[] }[] = [];
for (const p of paths) {
  const anonymous = p.startsWith("/login");
  const r = await lighthouse(
    `${BASE}${p}`,
    {
      port: chrome.port,
      onlyCategories: ["accessibility"],
      output: "json",
      extraHeaders: anonymous ? {} : { Cookie: cookieHeader },
      disableStorageReset: true,
    },
  );
  const lhr = r?.lhr;
  const score = lhr?.categories.accessibility.score;
  const failures = Object.values(lhr?.audits ?? {})
    .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "informative")
    .map((a) => `${a.id}: ${a.title}`);
  results.push({ path: p, a11y: score === null || score === undefined ? null : Math.round(score * 100), failures });
  if (process.env.A11Y_DETAILS) {
    for (const a of Object.values(lhr?.audits ?? {})) {
      if (a.score !== null && a.score < 1 && a.details && "items" in a.details) {
        const items = (a.details as { items: { node?: { snippet?: string; selector?: string; explanation?: string } }[] }).items.slice(0, 6);
        for (const it of items) console.log(`  [${p}] ${a.id}: ${it.node?.selector ?? ""} ${(it.node?.snippet ?? "").slice(0, 140)} :: ${(it.node?.explanation ?? "").slice(0, 160)}`);
      }
    }
  }
}
await chrome.kill();
for (const r of results) {
  console.log(`${r.path.padEnd(16)} a11y ${r.a11y ?? "?"}${r.failures.length ? "  FAIL: " + r.failures.join(" | ") : ""}`);
}
const worst = Math.min(...results.map((r) => r.a11y ?? 0));
if (worst < 95) {
  console.error(`Lowest score ${worst} is below 95`);
  process.exit(1);
}
