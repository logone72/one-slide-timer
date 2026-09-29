import { expect, test } from "@playwright/test";

test("Pages 하위 경로에서 앱과 홈 화면 시작 URL 및 알림 워커가 동작한다", async ({
  page,
  browserName,
}) => {
  const basePath = process.env.PAGES_BASE_PATH;
  test.skip(
    basePath === undefined || browserName !== "chromium",
    "Pages 빌드의 Chromium 검사에서 실행한다."
  );
  if (basePath === undefined) {
    return;
  }
  const failedResources: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResources.push(response.url());
    }
  });
  await page.goto(basePath);
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);

  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .evaluate((link: HTMLLinkElement) => link.href);
  expect(new URL(manifestUrl).pathname).toBe(`${basePath}manifest.webmanifest`);
  const response = await page.request.get(manifestUrl);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as { start_url: string };
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe(basePath);

  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await page.getByRole("button", { name: "테스트 알림 보내기" }).click();
  await expect(page.getByText("테스트 알림을 요청했어요.")).toBeVisible();
  const worker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      scope: registration?.scope,
      script: registration?.active?.scriptURL,
    };
  });
  expect(worker.scope).toBe(new URL(basePath, page.url()).href);
  expect(worker.script).toBe(
    new URL(`${basePath}notification-sw.js`, page.url()).href
  );
  expect(failedResources).toEqual([]);
});
