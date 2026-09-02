import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const STUB_PORT = 4321;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: [
    {
      command: `node tests/e2e/leetcode-stub.mjs`,
      port: STUB_PORT,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(STUB_PORT) },
    },
    {
      command: `rm -rf .pglite-e2e && pnpm exec next dev -p ${PORT}`,
      port: PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: "pglite://.pglite-e2e",
        DIRECT_URL: "pglite://.pglite-e2e",
        AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
        AUTH_TRUST_HOST: "true",
        ALLOWED_GITHUB_LOGIN: "Ronit26x",
        AUTH_TEST_LOGIN: "Ronit26x",
        CRON_SECRET: "e2e-cron",
        LEETCODE_GRAPHQL_URL: `http://localhost:${STUB_PORT}/graphql`,
      },
    },
  ],
});
