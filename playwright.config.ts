import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer:
      process.env.CI === undefined || process.env.CI.length === 0,
  },
  projects: [
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
