import * as playwright from "@playwright/test";

const { expect, test } = playwright;

type SavedTimer = {
  id: string;
  endAt: number;
  color: string;
  createdAt: number;
};

async function storedTimers(page: playwright.Page): Promise<SavedTimer[]> {
  return page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as SavedTimer[]
  );
}

async function seed(page: playwright.Page, durations: number[]): Promise<void> {
  await page.addInitScript((values) => {
    if (localStorage.getItem("one-slide-timer:timers") !== null) {
      return;
    }
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify(
        values.map((duration, index) => ({
          id: String(index),
          color: `var(--color-timer-${String((index % 3) + 1)})`,
          createdAt: Date.now() - 60_000,
          endAt: Date.now() + duration,
          status: "running",
        }))
      )
    );
  }, durations);
  await page.goto("/");
}

async function drag(
  page: playwright.Page,
  source: { x: number; y: number },
  targetY: number
): Promise<void> {
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x, targetY, { steps: 10 });
  await page.mouse.up();
}

test("creates, edits the same timer, opens actions, and dismisses at zero", async ({
  page,
}) => {
  await page.goto("/");
  const rail = await getBox(page.getByTestId("timer-rail"));
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  const startBox = await getBox(start);
  await drag(
    page,
    { x: startBox.x + startBox.width / 2, y: startBox.y + startBox.height / 2 },
    rail.y + rail.height * 0.6
  );
  const pins = page.getByTestId("timer-pin");
  await expect(pins).toHaveCount(1);
  const original = await firstTimer(page);
  const box = await getBox(pins.first());
  await drag(page, { x: box.x + 60, y: box.y + 25 }, box.y - 75);
  const edited = await firstTimer(page);
  expect(edited.id).toBe(original.id);
  expect(edited.color).toBe(original.color);
  expect(edited.endAt).toBeGreaterThan(original.endAt + 60_000);
  await expect(pins).toHaveCount(1);
  // 계속 이동하는 타이머는 정지 상태를 기다리지 않고 실제 포인터로 누른다.
  await pins.click({ force: true });
  await expect(
    page.getByRole("button", { name: "조기 종료", exact: true })
  ).toBeVisible();
  expect(await storedTimers(page)).toEqual([edited]);
  await page
    .getByRole("button", { name: "타이머 액션 닫기" })
    .click({ force: true });
  const moved = await getBox(pins);
  await drag(
    page,
    { x: moved.x + 60, y: moved.y + 25 },
    rail.y + rail.height + 10
  );
  await expect(pins).toHaveCount(0);
  await expect(start).toBeVisible();
});

test("cancels edits without changing storage and supports keyboard adjustment", async ({
  page,
}) => {
  await seed(page, [900_000]);
  const pin = page.getByTestId("timer-pin");
  const original = await storedTimers(page);
  const box = await getBox(pin);
  await page.mouse.move(box.x + 50, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y - 65, { steps: 5 });
  await expect(page.getByText("놓으면 변경", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await storedTimers(page)).toEqual(original);
  await pin.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(pin).toHaveCount(1);
  const updated = (await storedTimers(page))[0];
  expect(updated?.id).toBe(original[0]?.id);
  expect(updated?.endAt).toBeGreaterThan((original[0]?.endAt ?? 0) + 50_000);
  await pin.click({ force: true });
  await page
    .getByRole("button", { name: "조기 종료", exact: true })
    .click({ force: true });
  await expect(pin).toHaveCount(0);
});

test("full-screen settings preserves deadlines, clamps range, and restores focus", async ({
  page,
}) => {
  await seed(page, [900_000]);
  const original = await storedTimers(page);
  const settingsButton = page.getByRole("button", { name: "설정 열기" });
  await settingsButton.click();
  const settings = page.getByRole("dialog", { name: "설정", exact: true });
  await expect(settings).toBeVisible();
  const minus = page.getByRole("button", { name: "시간 범위 줄이기" });
  const plus = page.getByRole("button", { name: "시간 범위 늘리기" });
  await expect(minus).toBeEnabled();
  for (let index = 1; index < 24; index += 1) {
    await plus.click();
  }
  await expect(plus).toBeDisabled();
  expect(await storedTimers(page)).toEqual(original);
  await page.keyboard.press("Escape");
  await expect(settings).toHaveCount(0);
  await expect(settingsButton).toBeFocused();
  await expect(
    page.getByLabel("시간 눈금 0부터 24시간", { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("시간 눈금 0부터 24시간", { exact: true })
  ).toBeVisible();
  expect(await storedTimers(page)).toEqual(original);
});

test("keeps mobile width on desktop and separates crowded labels", async ({
  page,
}) => {
  await seed(page, [1_800_000, 1_800_000, 1_800_000, 1_790_000, 1_790_000]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 568 });
    const shell = page.locator(".app-shell");
    const box = await getBox(shell);
    expect(box.width).toBe(Math.min(width, 430));
    expect(box.x).toBe((width - Math.min(width, 430)) / 2);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      )
      .toBe(true);
    const cards = await page.getByTestId("timer-pin").all();
    const boxes = (await Promise.all(cards.map((card) => card.boundingBox())))
      .filter((card) => card !== null)
      .sort((a, b) => a.y - b.y);
    const caption = await getBox(page.locator(".start-caption"));
    for (const card of boxes) {
      expect(card.y + card.height).toBeLessThanOrEqual(caption.y);
    }
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index]?.y).toBeGreaterThanOrEqual(
        (boxes[index - 1]?.y ?? 0) + 60
      );
    }
  }
});

test("aggregates completion and requires acknowledgment", async ({ page }) => {
  await seed(page, [-10_000, -20_000]);
  const alert = page.getByRole("dialog", { name: "시간이 되었어요." });
  await expect(alert).toBeVisible();
  await expect(alert.locator("li")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(alert).toBeVisible();
  await page.getByRole("button", { name: "확인했어요" }).click();
  await expect(alert).toHaveCount(0);
  expect(await storedTimers(page)).toEqual([]);
});

async function getBox(locator: playwright.Locator) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error("Element is not visible");
  }
  return box;
}

async function firstTimer(page: playwright.Page): Promise<SavedTimer> {
  const timer = (await storedTimers(page))[0];
  if (timer === undefined) {
    throw new Error("Timer missing");
  }
  return timer;
}
