import { defineConfig, devices } from "@playwright/test";

const env = {
  DATABASE_URL: "postgres://localhost/harbourline_e2e",
  LLM_MODE: "e2e", MAIL_PROVIDER: "fake", SCREENING_PROVIDER: "fake",
  STORAGE_DIR: "storage/e2e", APP_URL: "http://localhost:3100", NEXT_DIST_DIR: ".next-e2e",
  AIRWALLEX_CLIENT_ID: "", AIRWALLEX_API_KEY: "", XERO_CLIENT_ID: "", XERO_CLIENT_SECRET: "", XERO_CLIENT_BEARER_TOKEN: "",
};

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npx next dev -p 3100", url: "http://localhost:3100/api/live", reuseExistingServer: false, timeout: 180_000, env },
});
