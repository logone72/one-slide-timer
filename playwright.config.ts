import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  workers:
    process.env.CI === undefined || process.env.CI.length === 0 ? undefined : 2,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4173",
      port: 4173,
      reuseExistingServer:
        process.env.CI === undefined || process.env.CI.length === 0,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4174",
      port: 4174,
      reuseExistingServer:
        process.env.CI === undefined || process.env.CI.length === 0,
    },
  ],
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: "**/rail-touch.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        permissions: ["notifications"],
      },
    },
    {
      name: "mobile-safari",
      testIgnore: "**/rail-touch.spec.ts",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "mobile-chromium-touch",
      testMatch: "**/rail-touch.spec.ts",
      use: { ...devices["Pixel 7"], permissions: ["notifications"] },
    },
  ],
});
