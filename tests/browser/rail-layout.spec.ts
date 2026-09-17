import * as playwright from "@playwright/test";
const { expect, test } = playwright;

test("keeps enlarged text inside the mobile screen and allows blank rail scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date());
  await page.addInitScript(() => {
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify(
        Array.from({ length: 4 }, (_, index) => ({
          id: String(index),
          color: "var(--color-timer-1)",
          createdAt: Date.now(),
          endAt: Date.now() + 43_200_000 - index * 1000,
        }))
      )
    );
  });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% }" });
  const pins = page.getByTestId("timer-pin");
  await expect(pins).toHaveCount(4);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rail = document
          .querySelector(".timer-rail")
          ?.getBoundingClientRect();
        const cards = [...document.querySelectorAll(".timer-pin")].map((card) =>
          card.getBoundingClientRect()
        );
        return cards.every(
          (card, i) =>
            card.left >= 0 &&
            card.right <= innerWidth &&
            card.top >= (cards[i - 1]?.bottom ?? rail?.top ?? 0)
        );
      })
    )
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320
  );
  await expect(page.locator(".timer-pin__time").first()).toHaveCSS(
    "font-size",
    "48px"
  );
  const rail = page.getByTestId("timer-rail");
  await expect(rail).toHaveCSS("touch-action", "pan-y pinch-zoom");
  expect(
    await rail.evaluate((element) => {
      const event = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        pointerId: 1,
        isPrimary: true,
        button: 0,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    })
  ).toBe(false);
  await expect(page.locator(".timer-draft")).toHaveCount(0);
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.scrollIntoViewIfNeeded();
  await expect(start).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const captionBottom = await page
    .locator(".start-caption")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  const helpTop = await page
    .locator(".rail-help")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(helpTop).toBeGreaterThan(captionBottom);
  await page.getByRole("button", { name: "설정 열기" }).click();
  const panel = page.getByRole("dialog", { name: "설정", exact: true });
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth
    )
  ).toBe(true);
});
