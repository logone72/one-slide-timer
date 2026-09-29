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

test("PWA 아이콘·앱 식별자·실행 범위가 배포 경로에서 유효하다", async ({
  page,
}) => {
  const basePath = process.env.PAGES_BASE_PATH ?? "/";
  await page.goto(basePath);
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .evaluate((link: HTMLLinkElement) => link.href);
  const response = await page.request.get(manifestUrl);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    id: string;
    scope: string;
    start_url: string;
    icons: Array<{ src: string; sizes: string; purpose: string }>;
  };
  expect(new URL(manifest.scope, manifestUrl).pathname).toBe(basePath);
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe(basePath);
  expect(manifest.id).toBe("/one-slide-timer/");
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  for (const icon of manifest.icons) {
    expect(icon.purpose.split(" ")).toEqual(
      expect.arrayContaining(["any", "maskable"])
    );
  }
  const appleUrl = await page
    .locator('link[rel="apple-touch-icon"]')
    .evaluate((link: HTMLLinkElement) => link.href);
  const icons = [
    ...manifest.icons.map((icon) => ({
      url: new URL(icon.src, manifestUrl).href,
      size: Number(icon.sizes.split("x")[0]),
    })),
    { url: appleUrl, size: 180 },
  ];
  for (const icon of icons) {
    expect(new URL(icon.url).pathname.startsWith(`${basePath}icons/`)).toBe(
      true
    );
    const actual = await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("Missing image inspection context");
      }
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let opaque = true;
      let safe = true;
      let hasArtwork = false;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] !== 255) {
          opaque = false;
        }
        if ((data[index] ?? 255) < 240) {
          hasArtwork = true;
          const pixel = index / 4;
          const x = (pixel % canvas.width) + 0.5 - canvas.width / 2;
          const y = Math.floor(pixel / canvas.width) + 0.5 - canvas.height / 2;
          if (Math.hypot(x, y) > canvas.width * 0.4) {
            safe = false;
          }
        }
      }
      return {
        width: canvas.width,
        height: canvas.height,
        opaque,
        safe,
        hasArtwork,
      };
    }, icon.url);
    expect(actual).toEqual({
      width: icon.size,
      height: icon.size,
      opaque: true,
      safe: true,
      hasArtwork: true,
    });
  }
});
