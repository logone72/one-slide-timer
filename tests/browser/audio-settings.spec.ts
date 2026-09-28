import { expect, test } from "@playwright/test";

test("audio toggle persists separately from device permission and supports keyboard selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  const on = page.getByRole("switch", { name: "알림음", exact: true });
  const off = on;
  const testSound = page.getByRole("button", { name: "소리 테스트" });
  await expect(on).not.toBeChecked();
  await expect(testSound).toHaveCount(0);
  await on.click();
  await expect(on).toBeChecked();
  await expect(testSound).toBeVisible();
  await off.uncheck();
  await expect(testSound).toHaveCount(0);
  await expect(off).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(off).not.toBeChecked();
  await expect(testSound).toHaveCount(0);
  await expect(off).not.toBeChecked();
  await off.focus();
  await page.keyboard.press("Space");
  await expect(on).toBeChecked();
  await expect(on).toBeFocused();
  await testSound.click();
  await expect(on).toBeChecked();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("one-slide-timer:settings") ?? "{}"
        ) as unknown
    )
  ).toMatchObject({ audioEnabled: true, notificationPreference: null });
});
