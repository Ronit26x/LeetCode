/**
 * Screenshots every main screen in Light, Dim and Dark at desktop and phone widths.
 * Usage: BASE_URL=http://localhost:3000 pnpm screenshots [pathA,pathB,...]
 * Paths that start with /login are captured signed out; everything else signs in first
 * through the test provider (AUTH_TEST_LOGIN must be set on the server).
 * Writes to ./screenshots/<theme>-<viewport>-<slug>.png
 */
import { chromium, type Browser } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DEFAULT_PATHS = [
  "/today",
  "/backlog",
  "/problems",
  "/problems/new",
  "/stats",
  "/settings",
  "/login",
  "/login?error=AccessDenied",
];
const paths = process.argv[2] ? process.argv[2].split(",") : DEFAULT_PATHS;
const themes = ["light", "dim", "dark"] as const;
const viewports = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;

function slugOf(p: string) {
  return p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "") || "root";
}

async function capture(browser: Browser, authed: boolean, list: string[]) {
  for (const [vpName, vp] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
      isMobile: vpName === "phone",
      hasTouch: vpName === "phone",
    });
    if (authed) {
      const page = await context.newPage();
      await page.goto(`${BASE}/login`);
      const btn = page.getByRole("button", { name: /test sign in/i });
      if ((await btn.count()) === 0) throw new Error("Test sign-in button not found. Set AUTH_TEST_LOGIN.");
      await btn.click();
      await page.waitForURL(/\/today/);
      await page.close();
    }
    for (const theme of themes) {
      await context.addInitScript((t) => window.localStorage.setItem("recur-theme", t), theme);
      const page = await context.newPage();
      for (const p of list) {
        await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const file = `screenshots/${theme}-${vpName}-${slugOf(p)}.png`;
        await page.screenshot({ path: file, fullPage: true });
        console.log("wrote", file);
      }
      await page.close();
    }
    await context.close();
  }
}

async function main() {
  await mkdir("screenshots", { recursive: true });
  const browser = await chromium.launch();
  const anon = paths.filter((p) => p.startsWith("/login"));
  const authed = paths.filter((p) => !p.startsWith("/login"));
  if (anon.length) await capture(browser, false, anon);
  if (authed.length) await capture(browser, true, authed);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
