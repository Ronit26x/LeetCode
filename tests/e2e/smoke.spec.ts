import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /test sign in/i }).click();
  await page.waitForURL(/\/today/);
}

test("theme choice survives a reload without a flash", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await page.locator("#main").getByRole("radio", { name: "Dim" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dim");
  await page.reload({ waitUntil: "commit" });
  // The inline script sets the attribute before first paint, so it is present as soon as the document exists.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dim");
  await page.locator("#main").getByRole("radio", { name: "Light" }).click();
});

test("add from a URL, solve, review early, grade, undo, and copy code with tabs", async ({
  page,
  context,
  browserName,
}) => {
  await login(page);

  const slug = `two-sum-${browserName}-${Date.now().toString(36)}`;
  await page.goto("/problems/new");
  await page.getByLabel(/Problem URL/).fill(`https://leetcode.com/problems/${slug}/`);
  await page.getByRole("button", { name: "Prefill" }).click();
  await expect(page.getByLabel("Title")).toHaveValue(/Two Sum/);
  await expect(page.getByLabel("Number")).toHaveValue("1");
  await expect(page.getByText("Arrays & Hashing").first()).toBeVisible();

  await page
    .getByLabel("Prompt summary")
    .fill("Indices of the two numbers that add up to the target.");
  await page
    .getByLabel("Key insight")
    .fill("Look up the complement in a hash map before inserting.");
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.insertText("int f() {\n\treturn 1;\n}");

  await page.getByRole("button", { name: "Solved it today" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await page.waitForURL(/\/problems\/[0-9a-f-]{36}$/);
  const problemUrl = page.url();

  // Scheduled: resolved once, due a few days out, listed in the library with a due date.
  await expect(page.getByText("Resolved").first()).toBeVisible();
  await expect(
    page
      .locator("dt", { hasText: /^Resolved$/ })
      .locator("xpath=following-sibling::dd")
      .first(),
  ).toHaveText("1");
  await page.goto("/problems");
  await expect(
    page
      .getByText(/Two Sum/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(/in \d+d|tomorrow|today/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.goto("/today");
  await expect(
    page.getByText(/1 card due tomorrow|\d+ cards? due tomorrow|Nothing due/).first(),
  ).toBeVisible();

  // Early review through the session: flip with Space, grade Good with the key 3.
  await page.goto(problemUrl);
  await page.getByRole("button", { name: "Review now" }).click();
  await page.waitForURL(/\/review\?problem=/);
  await expect(page.getByText("Look up the complement", { exact: false })).toBeHidden();
  // Space flips once the session has hydrated; fall back to the button if the key landed early.
  await page.waitForLoadState("networkidle");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Space");
  await page
    .getByRole("button", { name: /^Flip/ })
    .click({ timeout: 1500 })
    .catch(() => {});
  await expect(page.getByText("Look up the complement", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Good/ })).toContainText(/\d+(\.\d+)?(d|mo|y)/);
  await page.keyboard.press("3");
  await page.waitForURL(/\/problems\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Revised").first()).toBeVisible();
  const revised = () =>
    page
      .locator("dt", { hasText: /^Revised$/ })
      .locator("xpath=following-sibling::dd")
      .first();
  await expect(revised()).toHaveText("1");

  // Undo from the session restores the counter.
  await page.goto(`/review?problem=${problemUrl.split("/").pop()}`);
  await page.getByRole("button", { name: /undo/i }).click();
  await expect(page.getByText("Undone")).toBeVisible();
  await page.goto(problemUrl);
  await expect(revised()).toHaveText("0");

  // Copy keeps the tab byte for byte.
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy code" }).first().click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toBe("int f() {\n\treturn 1;\n}");
  }

  // Delete leaves nothing behind (card, snippets and logs cascade).
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/problems$/);
  await expect(page.getByText("Deleted")).toBeVisible();
});

test("backlog: the recent-solves filter and the Still remember it path create a card only at the rating", async ({
  page,
}) => {
  test.skip(!!process.env.E2E_DATABASE_URL, "Seeds the GFG list; local PGlite only");
  await login(page);
  await page.goto("/backlog?recent=14");
  // The desktop and phone projects share one database, so count relative to what is shown now.
  const shownText = (await page.getByText(/^\d+ shown$/).textContent()) ?? "0 shown";
  const shown = Number.parseInt(shownText, 10);
  expect(shown).toBeGreaterThanOrEqual(32);
  await expect(page.getByText(/solved on GFG \d+ days ago/).first()).toBeVisible();

  // Any recent problem still waiting: grade recall without re-coding.
  const row = page
    .locator("li", { has: page.getByRole("button", { name: "Still remember it" }) })
    .first();
  const link = row.getByRole("link").first();
  const title = (await link.textContent())?.trim() ?? "";
  const href = await link.getAttribute("href");
  expect(href).toMatch(/\/problems\/[0-9a-f-]{36}$/);
  await row.getByRole("button", { name: "Still remember it" }).click();
  await expect(page.getByRole("button", { name: /^Easy/ })).toBeDisabled();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText(/Scheduled\. Next review in/)).toBeVisible();

  // One fewer in the recent filter; scheduled in the library with the history intact.
  await page.goto("/backlog?recent=14");
  await expect(page.getByText(`${shown - 1} shown`)).toBeVisible();
  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(
    page
      .locator("dt", { hasText: /^Revised$/ })
      .locator("xpath=following-sibling::dd")
      .first(),
  ).toHaveText("1");
  await expect(
    page
      .locator("dt", { hasText: /^Resolved$/ })
      .locator("xpath=following-sibling::dd")
      .first(),
  ).toHaveText("0");
  await expect(
    page.locator("dt", { hasText: /^Due$/ }).locator("xpath=following-sibling::dd").first(),
  ).toContainText(/in \d+d|tomorrow/);
  await expect(page.getByText(/solved on GFG \d+ days ago/)).toBeVisible();
  await expect(page.getByText("GFG", { exact: true }).first()).toBeVisible();
});

test("the palette finds a problem by title and Enter opens it; / opens the palette", async ({
  page,
}) => {
  test.skip(!!process.env.E2E_DATABASE_URL, "Uses the seeded GFG list; local PGlite only");
  await login(page);
  await page.goto("/today");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("/");
  const input = page.getByPlaceholder("Jump to a problem, page, or action");
  await expect(input).toBeVisible();
  await input.fill("rotten oranges");
  const item = page.getByRole("option", { name: /Rotten Oranges/ }).first();
  await expect(item).toBeVisible();
  await item.click();
  await page.waitForURL(/\/problems\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: /Rotten Oranges/ })).toBeVisible();
});
