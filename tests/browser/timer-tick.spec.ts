import * as playwright from "@playwright/test";

const { expect, test } = playwright;

test("new and edited timers decrement at their own second boundaries", async ({
  page,
}) => {
  const initial = new Date("2026-09-17T00:00:00.000Z");
  await page.clock.install({ time: initial });
  await page.clock.pauseAt(initial);
  // 메인 스레드 폴백으로 Worker의 실제 시계와 분리해 경계 시점을 제어한다.
  await page.addInitScript(() => {
    window.Worker = class extends Worker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.terminate();
        throw new Error("Exercise clock-controlled fallback");
      }
    };
  });
  await page.goto("/");
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await page.clock.runFor(100);
  await start.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  const first = page.getByTestId("timer-pin").first();
  await expect(first.locator(".timer-pin__time")).toHaveText("00:10");
  await page.clock.runFor(999);
  await expect(first.locator(".timer-pin__time")).toHaveText("00:10");
  await page.clock.runFor(1);
  await expect(first.locator(".timer-pin__time")).toHaveText("00:09");

  await page.clock.runFor(350);
  await start.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  const second = page.getByTestId("timer-pin").nth(1);
  await page.clock.runFor(650);
  await expect(first.locator(".timer-pin__time")).toHaveText("00:08");
  await expect(second.locator(".timer-pin__time")).toHaveText("00:10");
  await page.clock.runFor(350);
  await expect(second.locator(".timer-pin__time")).toHaveText("00:09");

  await page.clock.runFor(150);
  await first.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(first.locator(".timer-pin__time")).toHaveText("00:20");
  await page.clock.runFor(999);
  await expect(first.locator(".timer-pin__time")).toHaveText("00:20");
  await page.clock.runFor(1);
  await expect(first.locator(".timer-pin__time")).toHaveText("00:19");
  await expect(second.locator(".timer-pin__time")).toHaveText("00:08");
});
