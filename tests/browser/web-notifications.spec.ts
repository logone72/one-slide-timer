import { expect, test } from "@playwright/test";

import { installFallbackClock } from "./clock";

test("browser permission request starts only from confirmation", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    let permission = "default";
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return permission;
        },
        requestPermission: () => {
          permission = "granted";
          document.documentElement.dataset.requested = "yes";
          return Promise.resolve(permission);
        },
      },
    });
  });
  await page.goto("/");
  const prompt = page.getByRole("dialog", {
    name: "타이머 완료 알림을 받을까요?",
  });
  await expect(prompt).toBeVisible();
  expect(await page.locator("html").getAttribute("data-requested")).toBeNull();
  await prompt.getByRole("button", { name: "확인", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-requested", "yes");
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "O 사용", exact: true })
  ).toBeChecked();
});

test("real browser worker displays tests and completed timers, then clears acknowledged alerts", async ({
  page,
  browserName,
  context,
}) => {
  test.skip(
    browserName !== "chromium",
    "알림 권한을 제어할 수 있는 Chromium에서 실제 API를 검사한다."
  );
  await context.grantPermissions(["notifications"], {
    origin: "http://127.0.0.1:4173",
  });
  const initial = await installFallbackClock(page);
  await page.addInitScript((now) => {
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([
        {
          id: "web-completion",
          createdAt: now,
          endAt: now + 10000,
          color: "blue",
        },
      ])
    );
  }, initial);
  await page.goto("/");
  expect(await page.evaluate(() => Notification.permission)).toBe("granted");
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "O 사용", exact: true })
  ).toBeChecked();
  await page.getByRole("button", { name: "테스트 알림 보내기" }).click();
  await expect(page.getByText("테스트 알림을 요청했어요.")).toBeVisible();
  const tags = () =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return ((await registration?.getNotifications()) ?? []).map(
        (notification) => notification.tag
      );
    });
  await expect.poll(tags).toContain("one-slide-timer-test");
  expect(await tags()).not.toContain("one-slide-timer-completed");
  await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
  await page.clock.runFor(10000);
  await expect.poll(tags).toContain("one-slide-timer-completed");
  await page.getByRole("button", { name: "확인했어요", exact: true }).click();
  await expect.poll(tags).not.toContain("one-slide-timer-completed");
  expect(await tags()).toContain("one-slide-timer-test");
});
