/**
 * Screenshots every main screen in Light, Dim and Dark at desktop and phone widths.
 * Usage: BASE_URL=http://localhost:3000 pnpm screenshots [pathA,pathB,...]
 * Writes to ./screenshots/<theme>-<viewport>-<slug>.png
 */
import { chromium, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DEFAULT_PATHS = ["/today", "/backlog", "/problems", "/problems/new", "/stats", "/settings", "/login"];
const paths = process.argv[2] ? process.argv[2].split(",") : DEFAULT_PATHS;
const themes = ["light", "dim", "dark"] as const;
const viewports = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;

async function login(context: BrowserContext) {
  const user = process.env.AUTH_TEST_LOGIN;
  if (!user) return;
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  const btn = page.getByRole("button", { name: /test sign in/i });
  if (await btn.count()) {
    await btn.click();
    await page.waitForURL(/\/today/);
  }
  await page.close();
}

async function main() {
  await mkdir("screenshots", { recursive: true });
  const browser = await chromium.launch();
  for (const [vpName, vp] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
      isMobile: vpName === "phone",
      hasTouch: vpName === "phone",
    });
    await login(context);
    for (const theme of themes) {
      await context.addInitScript((t) => {
        window.localStorage.setItem("recur-theme", t);
      }, theme);
      const page = await context.newPage();
      for (const p of paths) {
        await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const slug = p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "root";
        const file = `screenshots/${theme}-${vpName}-${slug}.png`;
        await page.screenshot({ path: file, fullPage: true });
        console.log("wrote", file);
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
