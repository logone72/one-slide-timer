import * as playwright from "@playwright/test";

import { DEFAULT_SETTINGS } from "../../src/domain/timer/timerTypes";

const { expect, test } = playwright;
const SETTINGS_KEY = "one-slide-timer:settings";
const defaults = { ...DEFAULT_SETTINGS, hideNotificationPrompt: true };
const TIMERS_KEY = "one-slide-timer:timers";

test("migrates range without changing deadlines", async ({ page }) => {
  await page.clock.setFixedTime(new Date());
  const endAt = Date.now() + 1_800_000;
  await page.addInitScript((deadline) => {
    if (localStorage.getItem("one-slide-timer:timers") !== null) {
      return;
    }
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({ hideNotificationPrompt: true, rangeHours: 1 })
    );
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([
        {
          id: "legacy",
          color: "#387e70",
          endAt: deadline,
          createdAt: deadline - 3_600_000,
          status: "running",
        },
      ])
    );
  }, endAt);
  await page.goto("/");
  await page.getByRole("button", { name: "설정 열기" }).click();
  const minus = page.getByRole("button", { name: "시간 범위 줄이기" });
  const plus = page.getByRole("button", { name: "시간 범위 늘리기" });
  const output = page.getByLabel("현재 시간 범위");
  await minus.click();
  await expect(output).toHaveText("55분");
  await plus.click();
  await expect(output).toHaveText("1시간");
  await plus.click();
  await expect(output).toHaveText("2시간");
  await minus.click();
  for (let index = 0; index < 11; index += 1) {
    await minus.click();
  }
  await expect(output).toHaveText("5분");
  await expect(minus).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByLabel("시간 눈금 0부터 5분", { exact: true })
  ).toBeVisible();
  await expect(page.locator(".rail-tick--major span")).toHaveText([
    "5분",
    "4분",
    "3분",
    "2분",
    "1분",
    "0",
  ]);
  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}") as unknown,
      SETTINGS_KEY
    )
  ).toEqual({ ...defaults, rangeMinutes: 5 });
  const timers = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
        id: string;
        endAt: number;
      }>,
    TIMERS_KEY
  );
  expect(timers).toEqual([expect.objectContaining({ id: "legacy", endAt })]);
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(2);
  await expect(page.getByTestId("timer-pin").last()).toContainText("01:00");
});

test("persists themes with keyboard selection", async ({ page }) => {
  await page.goto("/");
  const surfaces = new Set<string>();
  for (const [id, name] of [
    ["white", "화이트"],
    ["forest", "포레스트"],
    ["ocean", "오션"],
    ["midnight", "미드나이트"],
  ]) {
    await page.getByRole("button", { name: "설정 열기" }).click();
    await page.getByRole("radio", { name: new RegExp(name ?? "") }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id ?? "");
    const surface = await page
      .locator(".settings-panel")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    surfaces.add(surface);
    await expect(page.locator(".app-shell")).toHaveCSS(
      "background-color",
      surface
    );
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id ?? "");
    await expect(page.locator(".app-shell")).toHaveCSS(
      "background-color",
      surface
    );
  }
  expect(surfaces.size).toBe(4);
  await page.getByRole("button", { name: "설정 열기" }).click();
  await page.getByRole("radio", { name: /미드나이트/ }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: /오션/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /오션/ })).toBeFocused();
});

for (const theme of ["white", "forest", "ocean", "midnight"]) {
  test(`${theme} contrast`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem(
        "one-slide-timer:settings",
        JSON.stringify({
          hideNotificationPrompt: true,
          rangeMinutes: 5,
          theme,
        })
      );
      if (localStorage.getItem("one-slide-timer:timers") !== null) {
        return;
      }
      localStorage.setItem(
        "one-slide-timer:timers",
        JSON.stringify(
          Array.from({ length: 5 }, (_, index) => ({
            id: String(index),
            color: `var(--color-timer-${String(index + 1)})`,
            createdAt: Date.now(),
            endAt: Date.now() + 240_000,
            status: "running",
          }))
        )
      );
    }, theme);
    await page.goto("/");
    const pairs = await page.locator(".timer-pin").evaluateAll((cards) =>
      cards.flatMap((card) =>
        [".timer-pin__time", ".timer-pin__detail"].map((selector) => ({
          foreground: getComputedStyle(card.querySelector(selector) ?? card)
            .color,
          background: getComputedStyle(card).backgroundColor,
        }))
      )
    );
    for (const pair of pairs) {
      expect(contrast(pair.foreground, pair.background)).toBeGreaterThanOrEqual(
        4.5
      );
    }
    await page.evaluate((key) => {
      const timers = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
        endAt: number;
      }>;
      localStorage.setItem(
        key,
        JSON.stringify(
          timers.map((timer) => ({ ...timer, endAt: Date.now() - 1 }))
        )
      );
    }, TIMERS_KEY);
    await page.reload();
    const dialog = page.getByRole("dialog", { name: "시간이 되었어요." });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("li")).toHaveCount(5);
    const surface = await page
      .locator(".app-shell")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect(dialog).toHaveCSS("background-color", surface);
    const text = await dialog.evaluate((el) => getComputedStyle(el).color);
    expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
    await page.getByRole("button", { name: "확인했어요" }).click();
    await expect(dialog).toHaveCount(0);
  });
}

function contrast(foreground: string, background: string): number {
  const values = [foreground, background].map((color) => {
    const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const [r = 0, g = 0, b = 0] = channels.map((channel) => {
      const value = color.startsWith("color(srgb") ? channel : channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  });
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}
