import * as playwright from "@playwright/test";

import { installFallbackClock } from "./clock";

const { expect, test } = playwright;

test("completion repeats audio without restarting for added timers and acknowledgment stops it", async ({
  page,
}) => {
  const initial = await installFallbackClock(page);
  await page.addInitScript(() => {
    const probe = Object.assign(window, { beepTimes: [] as number[] });
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when = 0) => {
          probe.beepTimes.push(Date.now());
          start(when);
        };
        return oscillator;
      }
    };
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify(
        [10_000, 10_750].map((duration, index) => ({
          id: String(index),
          createdAt: Date.now(),
          endAt: Date.now() + duration,
          color: "#0066cc",
        }))
      )
    );
  });
  await page.goto("/");
  // 등록 조작이 오디오를 준비한다. 기존 두 타이머와 새 1분 타이머를 함께 유지한다.
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(3);
  const beeps = () =>
    page.evaluate(
      () => (window as Window & { beepTimes?: number[] }).beepTimes ?? []
    );
  const dialog = page.getByRole("dialog", { name: "시간이 되었어요." });
  await page.clock.runFor(9999);
  expect(await beeps()).toEqual([]);
  await page.clock.runFor(1);
  await expect(dialog.locator("li")).toHaveCount(1);
  expect(await beeps()).toEqual([initial + 10_000]);
  await page.clock.runFor(750);
  await expect(dialog.locator("li")).toHaveCount(2);
  expect(await beeps()).toEqual([initial + 10_000]);
  await page.clock.runFor(750);
  expect(await beeps()).toEqual([initial + 10_000, initial + 11_500]);
  await page.clock.runFor(1500);
  const played = await beeps();
  expect(played).toEqual([
    initial + 10_000,
    initial + 11_500,
    initial + 13_000,
  ]);
  await dialog.getByRole("button", { name: "확인했어요" }).click();
  await expect(dialog).toHaveCount(0);
  await page.clock.runFor(4500);
  expect(await beeps()).toEqual(played);
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
  const stored = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{ id: string }>
  );
  expect(stored).toHaveLength(1);
  expect(["0", "1"]).not.toContain(stored[0]?.id);
});
