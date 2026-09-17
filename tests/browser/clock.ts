import type { Page } from "@playwright/test";

export async function installFallbackClock(page: Page): Promise<number> {
  const initial = new Date("2026-09-17T00:00:00.000Z");
  await page.clock.install({ time: initial });
  await page.clock.pauseAt(initial);
  // Worker의 별도 시계 대신 실제 메인 스레드 폴백의 시계를 제어한다.
  await page.addInitScript(() => {
    window.Worker = class extends Worker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.terminate();
        throw new Error("Exercise clock-controlled fallback");
      }
    };
  });
  return initial.getTime();
}
