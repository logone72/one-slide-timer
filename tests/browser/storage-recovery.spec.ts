import * as playwright from "@playwright/test";
const { expect, test } = playwright;

test("failed reads preserve old data and merge timers created before recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const key = "one-slide-timer:timers";
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          id: "original",
          color: "#0066cc",
          createdAt: Date.now(),
          endAt: Date.now() + 600_000,
          status: "running",
        },
      ])
    );
    const original = localStorage.getItem.bind(localStorage);
    const state = Object.assign(window, {
      readBlocked: true,
      rawTimers: () => original(key),
    });
    Storage.prototype.getItem = function (name) {
      if (name === key && state.readBlocked) {
        throw new Error("read blocked");
      }
      return original(name);
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "타이머 저장 재시도" })
  ).toBeVisible();
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      (window as Window & { rawTimers?: () => string | null }).rawTimers?.()
    )
  ).toContain("original");
  await page.evaluate(() => {
    Reflect.set(window, "readBlocked", false);
  });
  await page.getByRole("button", { name: "타이머 저장 재시도" }).click();
  await expect(page.getByTestId("timer-pin")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "타이머 저장 재시도" })
  ).toHaveCount(0);
  const stored = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{ id: string }>
  );
  expect(stored).toHaveLength(2);
  expect(stored.some((timer) => timer.id === "original")).toBe(true);
});

test("write recovery persists creations, edits, deletions and settings across reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-09-17T00:00:00Z"));
  await page.addInitScript(() => {
    if (localStorage.getItem("one-slide-timer:timers") === null) {
      localStorage.setItem(
        "one-slide-timer:timers",
        JSON.stringify(
          [600_000, 900_000].map((duration, index) => ({
            id: String(index),
            color: "#0066cc",
            createdAt: Date.now(),
            endAt: Date.now() + duration,
          }))
        )
      );
    }
  });
  await page.goto("/");
  const readTimers = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("one-slide-timer:timers") ?? "[]"
        ) as Array<{ id: string; endAt: number }>
    );
  const originalTimers = await readTimers();
  await page.evaluate(() => {
    const original = localStorage.setItem.bind(localStorage);
    Object.assign(window, {
      restoreWrites: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException("storage full", "QuotaExceededError");
    };
  });
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  const pins = page.getByTestId("timer-pin");
  await expect(pins).toHaveCount(3);
  const createdId = await pins.nth(2).getAttribute("data-timer-id");
  await pins.first().focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(pins.first().locator(".timer-pin__time")).toHaveText("11:00");
  await pins.nth(1).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "조기 종료", exact: true }).click();
  await expect(pins).toHaveCount(2);
  await page.getByRole("button", { name: "설정 열기" }).click();
  await page.getByRole("button", { name: "시간 범위 늘리기" }).click();
  await page.getByRole("radio", { name: /오션/ }).check();
  await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
  expect(await readTimers()).toEqual(originalTimers);
  await expect(
    page.getByRole("button", { name: "타이머 저장 재시도" })
  ).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { restoreWrites?: () => void }).restoreWrites?.();
  });
  await page.getByRole("button", { name: "타이머 저장 재시도" }).click();
  await page.getByRole("button", { name: "저장 재시도", exact: true }).click();
  await expect(page.locator(".status-notice")).toHaveCount(0);
  const recovered = await readTimers();
  expect(recovered.map((timer) => timer.id)).toEqual(["0", createdId]);
  expect(recovered[0]).toEqual({
    ...originalTimers[0],
    endAt: (originalTimers[0]?.endAt ?? 0) + 60_000,
  });
  expect(recovered[1]?.endAt).toBe(Date.parse("2026-09-17T00:01:00Z"));
  await page.reload();
  await expect(pins).toHaveCount(2);
  expect(await readTimers()).toEqual(recovered);
  await expect(pins.first().locator(".timer-pin__time")).toHaveText("11:00");
  await page.getByRole("button", { name: "설정 열기" }).click();
  await expect(page.getByRole("status", { name: "현재 시간 범위" })).toHaveText(
    "2시간"
  );
  await expect(page.getByRole("radio", { name: /오션/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test("settings recovery preserves fields untouched while reads were blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const key = "one-slide-timer:settings";
    localStorage.setItem(
      key,
      JSON.stringify({ rangeMinutes: 25, theme: "forest" })
    );
    const original = localStorage.getItem.bind(localStorage);
    const state = Object.assign(window, { settingsBlocked: true });
    Storage.prototype.getItem = (name) => {
      if (name === key && state.settingsBlocked) {
        throw new Error("blocked");
      }
      return original(name);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "설정 열기" }).click();
  const panel = page.getByRole("dialog", { name: "설정", exact: true });
  await panel.getByRole("radio", { name: /오션/ }).check();
  await page.evaluate(() => {
    Reflect.set(window, "settingsBlocked", false);
  });
  await panel.getByRole("button", { name: "저장 재시도", exact: true }).click();
  await expect(
    panel.getByRole("status", { name: "현재 시간 범위" })
  ).toHaveText("25분");
  await expect(panel.getByRole("radio", { name: /오션/ })).toBeChecked();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("one-slide-timer:settings") ?? "null"
        ) as unknown
    )
  ).toEqual({ rangeMinutes: 25, theme: "ocean", notificationPreference: null });
});
