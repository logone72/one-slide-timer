import { expect, test } from "@playwright/test";

test("creates a timer from a rail drag on mobile", async ({ page }) => {
  await page.goto("/");

  const rail = page.getByTestId("timer-rail");
  await expect(rail).toBeVisible();

  const box = await rail.boundingBox();
  expect(box).not.toBeNull();

  if (box === null) {
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.55);
  await page.mouse.up();

  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});
