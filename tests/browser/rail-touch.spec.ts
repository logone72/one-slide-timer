import * as playwright from "@playwright/test";

const { expect, test } = playwright;

test("touch dragging creates, cancels, edits the same timer and dismisses at zero", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const client = await page.context().newCDPSession(page);
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.scrollIntoViewIfNeeded();
  const rail = await box(page.getByTestId("timer-rail"));
  const initialScroll = await page.evaluate(() => scrollY);
  await swipe(client, await center(start), rail.y + rail.height * 0.6);
  const pin = page.getByTestId("timer-pin");
  await expect(pin).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(initialScroll);
  const original = await storedTimers(page);
  const point = await center(pin);
  await swipe(client, point, point.y - 70, "touchCancel");
  await expect(page.locator(".timer-draft")).toHaveCount(0);
  expect(await storedTimers(page)).toEqual(original);
  await swipe(client, await center(pin), point.y - 70);
  const edited = await storedTimers(page);
  expect(edited).toHaveLength(1);
  expect(edited[0]).toMatchObject({
    id: original[0]?.id,
    color: original[0]?.color,
    createdAt: original[0]?.createdAt,
  });
  expect(edited[0]?.endAt).toBeGreaterThan((original[0]?.endAt ?? 0) + 60_000);
  await pin.tap();
  await expect(
    page.getByRole("button", { name: "시간 조정", exact: true })
  ).toBeVisible();
  expect(await storedTimers(page)).toEqual(edited);
  await page.getByRole("button", { name: "타이머 액션 닫기" }).tap();
  await swipe(client, await center(pin), rail.y + rail.height + 10);
  await expect(pin).toHaveCount(0);
  expect(await storedTimers(page)).toEqual([]);
  await client.detach();
});

test("a real touch swipe scrolls the blank rail without starting a timer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% }" });
  const client = await page.context().newCDPSession(page);
  const rail = await box(page.getByTestId("timer-rail"));
  const scrollBefore = await page.evaluate(() => scrollY);
  await swipe(client, { x: rail.x + rail.width - 8, y: 450 }, 200);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(scrollBefore + 40);
  await expect(page.locator(".timer-draft")).toHaveCount(0);
  await expect(page.getByTestId("timer-pin")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await client.detach();
});

async function swipe(
  client: playwright.CDPSession,
  from: { x: number; y: number },
  toY: number,
  end: "touchEnd" | "touchCancel" = "touchEnd"
): Promise<void> {
  // DOM dispatchEvent가 아닌 브라우저 입력 경로로 포인터 캡처와 스크롤을 검증한다.
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...from, id: 1 }],
  });
  for (let step = 1; step <= 12; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: from.x, y: from.y + ((toY - from.y) * step) / 12, id: 1 },
      ],
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: end, touchPoints: [] });
}

async function box(locator: playwright.Locator) {
  const value = await locator.boundingBox();
  if (value === null) {
    throw new Error("Touch target is not visible");
  }
  return value;
}

async function center(locator: playwright.Locator) {
  const rect = await box(locator);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function storedTimers(page: playwright.Page) {
  return page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{
        id: string;
        color: string;
        createdAt: number;
        endAt: number;
      }>
  );
}
