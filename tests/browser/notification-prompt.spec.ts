import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("startup toggles stay open, dismissal persists, and settings remain available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("one-slide-timer:settings") === null) {
      localStorage.setItem(
        "one-slide-timer:settings",
        JSON.stringify({ audioEnabled: false })
      );
    }
  });
  await page.goto("/");
  const prompt = page.getByRole("dialog", { name: "완료 알림 설정" });
  await expect(prompt).toBeVisible();
  const audio = prompt.getByRole("switch", { name: "알림음", exact: true });
  await expect(audio).not.toBeChecked();
  await audio.check();
  await expect(audio).toBeChecked();
  await expect(prompt).toBeVisible();
  await audio.uncheck();
  await prompt.getByRole("button", { name: "다시 묻지 않기" }).click();
  await expect(prompt).toBeHidden();
  await expect(page.locator(".start-pin")).toBeFocused();
  await page.reload();
  await expect(page.locator(".start-pin")).toBeVisible();
  await expect(prompt).toBeHidden();
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await page.getByRole("switch", { name: "알림음", exact: true }).check();
  await expect(page.getByRole("button", { name: "소리 테스트" })).toBeVisible();
});

test("done closes this session only and audio OFF prompts again next launch", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("one-slide-timer:settings") === null) {
      localStorage.setItem(
        "one-slide-timer:settings",
        JSON.stringify({ audioEnabled: false })
      );
    }
  });
  await page.goto("/");
  const prompt = page.getByRole("dialog", { name: "완료 알림 설정" });
  await expect(prompt).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(prompt).toBeHidden();
  await page.reload();
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "완료", exact: true }).click();
  await expect(prompt).toBeHidden();
});

test("explicit off still prompts after reload and the modal has side margins", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({ notificationPreference: false, audioEnabled: false })
    )
  );
  await page.goto("/");
  const prompt = page.getByRole("dialog", { name: "완료 알림 설정" });
  await expect(prompt).toBeVisible();
  await expect(
    prompt.getByText("타이머가 끝나면 알 수 있도록 알림을 켜 주세요.")
  ).toBeVisible();
  await expect(
    prompt.getByRole("switch", { name: "기기 알림", exact: true })
  ).not.toBeChecked();
  await expect(
    prompt.getByRole("switch", { name: "알림음", exact: true })
  ).not.toBeChecked();
  const modalBox = await prompt.boundingBox();
  const appBox = await page.locator(".app-shell").boundingBox();
  if (modalBox === null || appBox === null) {
    throw new Error("Missing modal or app bounds");
  }
  expect(modalBox.width).toBeLessThan(appBox.width);
  expect(modalBox.x).toBeGreaterThan(appBox.x);
  await prompt.getByRole("button", { name: "완료", exact: true }).click();
  await page.reload();
  await expect(prompt).toBeVisible();
});
