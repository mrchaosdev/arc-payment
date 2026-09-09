import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // The longest test drives six page loads through the dev server; 45s left it
  // finishing at 43-53s depending on how warm Turbopack was, so it failed on
  // budget while every assertion in it passed.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A placeholder key so the assistant renders and its route gets past the
  // "not configured" guard. No test sends a valid body, and the widget tests
  // intercept /api/chat, so nothing here ever reaches the Gemini API.
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { GEMINI_API_KEY: "placeholder-never-called" },
  },
});
