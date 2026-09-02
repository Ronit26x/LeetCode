// Screenshots the review session before and after the flip, in every theme, desktop and phone.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const themes = ["light", "dim", "dark"] as const;
const viewports = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;

await mkdir("screenshots", { recursive: true });
const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(viewports)) {
  const context = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: 2,
    isMobile: vpName === "phone",
    hasTouch: vpName === "phone",
  });
  const login = await context.newPage();
  await login.goto(`${BASE}/login`);
  await login.getByRole("button", { name: /test sign in/i }).click();
  await login.waitForURL(/\/today/);
  await login.close();
  for (const theme of themes) {
    await context.addInitScript((t) => window.localStorage.setItem("recur-theme", t), theme);
    const page = await context.newPage();
    await page.goto(`${BASE}/review`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `screenshots/${theme}-${vpName}-session-front.png`,
      fullPage: true,
    });
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Space");
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `screenshots/${theme}-${vpName}-session-back.png`,
      fullPage: true,
    });
    console.log("wrote", theme, vpName);
    await page.close();
  }
  await context.close();
}
await browser.close();
