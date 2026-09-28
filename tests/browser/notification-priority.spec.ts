import * as playwright from "@playwright/test";

import { installFallbackClock } from "./clock";

const { test, expect } = playwright;
const harness = "http://127.0.0.1:4174/tests/fixtures/permissions.html";

test("keeps permission guidance out of a pointer drag until release", async ({
  page,
}) => {
  await page.goto(`${harness}?defer`);
  const pin = await page.locator(".start-pin").boundingBox();
  if (pin === null) {
    throw new Error("Missing start pin");
  }
  await page.mouse.move(pin.x + pin.width / 2, pin.y + pin.height / 2);
  await page.mouse.down();
  await page.mouse.move(pin.x + pin.width / 2, pin.y - 120, { steps: 4 });
  await page.evaluate(() => window.notificationTest.resolveCheck());
  const prompt = page.getByRole("dialog", {
    name: "타이머 완료 알림을 받을까요?",
  });
  await expect(prompt).toBeHidden();
  await page.mouse.up();
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "나중에" }).click();
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});

test("completion preempts guidance and returns to an unhandled prompt after acknowledgment", async ({
  page,
}) => {
  await installFallbackClock(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([
        {
          id: "ending",
          createdAt: Date.now(),
          endAt: Date.now() + 10000,
          color: "var(--color-timer-1)",
        },
      ])
    )
  );
  await page.goto(harness);
  const prompt = page.getByRole("dialog", {
    name: "타이머 완료 알림을 받을까요?",
  });
  await expect(prompt).toBeVisible();
  await page.clock.runFor(10000);
  const completion = page.getByRole("dialog", { name: "시간이 되었어요." });
  await expect(completion).toBeVisible();
  await expect(prompt).toBeHidden();
  expect(
    await completion.evaluate((dialog) =>
      dialog.contains(document.activeElement)
    )
  ).toBe(true);
  await completion.getByRole("button", { name: "확인했어요" }).click();
  await expect(prompt).toBeVisible();
  expect(await page.evaluate(() => window.notificationTest.requested)).toBe(0);
});

test("settings retain their selected fields on clock ticks without a subscription render", async ({
  page,
}) => {
  await page.goto(`${harness}?defer`);
  const before = await page.evaluate(() => ({ ...window.notificationRenders }));
  await expect
    .poll(() => page.evaluate(() => window.notificationRenders.clock))
    .toBeGreaterThan(before.clock);
  expect(await page.evaluate(() => window.notificationRenders.settings)).toBe(
    before.settings
  );
});
