import * as playwright from "@playwright/test";

const { test, expect } = playwright;
const harness = "http://127.0.0.1:4174/tests/fixtures/permissions.html";
type Controls = {
  requested: number;
  checked: number;
  tested: number;
  permission: "prompt" | "granted" | "denied";
  deferCheck: boolean;
  failCheck: boolean;
  resolveCheck: () => void;
  resolveRequest: (permission: "granted" | "denied" | "prompt") => void;
  rejectRequest: () => void;
  resume: () => void;
};
declare global {
  // 선언 병합으로 테스트 페이지의 외부 어댑터만 노출한다.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    notificationTest: Controls;
    notificationRenders: { settings: number; clock: number };
  }
}

test("asks only after confirmation, persists off, and leaves requests alive when settings closes", async ({
  page,
}) => {
  await page.goto(harness);
  const prompt = page.getByRole("dialog", {
    name: "타이머 완료 알림을 받을까요?",
  });
  await expect(prompt).toBeVisible();
  expect(await page.evaluate(() => window.notificationTest.requested)).toBe(0);
  await prompt.getByRole("button", { name: "나중에" }).click();
  await page.evaluate(() => window.notificationTest.resume());
  await expect(prompt).toBeHidden();
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  const on = page.getByRole("switch", { name: "기기 알림", exact: true });
  const off = page.getByRole("switch", { name: "기기 알림", exact: true });
  await expect(
    page.getByRole("button", { name: "테스트 알림 보내기" })
  ).toHaveCount(0);
  await on.click();
  await expect(on).toBeDisabled();
  expect(await page.evaluate(() => window.notificationTest.requested)).toBe(1);
  await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
  await page.evaluate(() => window.notificationTest.resolveRequest("granted"));
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(on).toBeChecked();
  await page.getByRole("button", { name: "테스트 알림 보내기" }).click();
  await expect(page.getByText("테스트 알림을 요청했어요.")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("one-slide-timer:timers"))
  ).toBe("[]");
  await off.uncheck();
  await expect(
    page.getByRole("button", { name: "테스트 알림 보내기" })
  ).toHaveCount(0);
  await page.evaluate(() => window.notificationTest.resume());
  await expect(off).not.toBeChecked();
  await page.reload();
  await expect(prompt).toBeHidden();
});

test("shows denial and errors separately and recovers through the off switch", async ({
  page,
}) => {
  await page.goto(harness);
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.evaluate(() => window.notificationTest.resolveRequest("denied"));
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "기기 알림 권한이 차단되어 있어요" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "알림 설정 보기", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  const settingsButton = page.getByRole("button", {
    name: "설정 열기",
    exact: true,
  });
  await expect(settingsButton).toBeFocused();
  await settingsButton.click();
  await page.evaluate(() => {
    window.notificationTest.failCheck = true;
    window.notificationTest.resume();
  });
  await expect(page.locator("#notification-status")).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "다시 확인", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).toBeEnabled();
  await page.evaluate(() => {
    window.notificationTest.failCheck = false;
    window.notificationTest.permission = "granted";
  });
  await page.getByRole("switch", { name: "기기 알림", exact: true }).click();
  await page.evaluate(() => window.notificationTest.resolveRequest("granted"));
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).toBeChecked();
  expect(await page.evaluate(() => window.notificationTest.requested)).toBe(2);
});

test("defers late startup permission during rail adjustment and restores focus", async ({
  page,
}) => {
  await page.goto(`${harness}?defer`);
  await page.locator(".start-pin").click();
  const adjustment = page.getByRole("dialog", { name: "새 타이머" });
  await expect(adjustment).toBeVisible();
  await page.evaluate(() => window.notificationTest.resolveCheck());
  const prompt = page.getByRole("dialog", {
    name: "타이머 완료 알림을 받을까요?",
  });
  await expect(prompt).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "나중에" }).click();
  await expect(page.locator(".start-pin")).toBeFocused();
});

test("missing browser API exposes unsupported system alerts and accessible independent audio controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "Notification");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "기기 알림", exact: true })
  ).toBeDisabled();
  await expect(page.locator("#notification-status")).toHaveCount(0);
  const sound = page.getByRole("button", { name: "소리 테스트" });
  await expect(sound).toHaveCount(0);
  await page.getByRole("switch", { name: "알림음", exact: true }).click();
  await sound.click();
  await expect(page.getByRole("button", { name: "알림음 켜기" })).toHaveCount(
    0
  );
  const box = await sound.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

for (const outcome of ["error", "prompt"] as const) {
  test(`startup permission ${outcome} offers recovery on the main screen`, async ({
    page,
  }) => {
    await page.goto(harness);
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.evaluate((result) => {
      if (result === "error") {
        window.notificationTest.rejectRequest();
      } else {
        window.notificationTest.resolveRequest("prompt");
      }
    }, outcome);
    await expect(
      page.getByRole("status").filter({ hasText: "기기 알림 권한" })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "알림 설정 보기", exact: true })
      .click();
    await page.getByRole("switch", { name: "기기 알림", exact: true }).click();
    await page.evaluate(() =>
      window.notificationTest.resolveRequest("granted")
    );
    await expect(
      page.getByRole("switch", { name: "기기 알림", exact: true })
    ).toBeChecked();
    await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
    await expect(
      page.getByRole("button", { name: "설정 열기", exact: true })
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "알림 설정 보기" })
    ).toBeHidden();
  });
}
