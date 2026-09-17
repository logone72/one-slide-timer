import * as playwright from "@playwright/test";

const { expect, test } = playwright;
type Sample = { id: string; seconds: number; at: number; previous: number };

test("real worker messages update staggered countdowns and complete without a focus event", async ({
  page,
}) => {
  const workers: playwright.Worker[] = [];
  page.on("worker", (worker) => workers.push(worker));
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify(
        [4250, 4750].map((duration, index) => ({
          id: String(index),
          createdAt: now,
          endAt: now + duration,
          color: "#0066cc",
        }))
      )
    );
    const probe = Object.assign(window, { countdownSamples: [] as Sample[] });
    const previous = new Map<string, number>();
    new MutationObserver(() => {
      for (const pin of document.querySelectorAll<HTMLElement>(".timer-pin")) {
        const id = pin.dataset.timerId ?? "";
        const clock = pin.querySelector(".timer-pin__time")?.textContent ?? "";
        const seconds = clock
          .split(":")
          .reduce((sum, part) => sum * 60 + Number(part), 0);
        const before = previous.get(id);
        if (before !== undefined && before !== seconds) {
          probe.countdownSamples.push({
            id,
            seconds,
            previous: before,
            at: Date.now(),
          });
        }
        previous.set(id, seconds);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("timer-pin")).toHaveCount(2);
  expect(workers).toHaveLength(1);
  // 실제 Worker가 살아 있는지 확인한다. 실패 후 폴백으로 통과하면 안 된다.
  expect(await workers[0]?.evaluate(() => typeof self.onmessage)).toBe(
    "function"
  );
  const saved = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{ id: string; endAt: number }>
  );
  const dialog = page.getByRole("dialog", { name: "시간이 되었어요." });
  await expect(dialog.locator("li")).toHaveCount(2, { timeout: 6500 });
  const samples = await page.evaluate(
    () =>
      (window as Window & { countdownSamples?: Sample[] }).countdownSamples ??
      []
  );
  for (const timer of saved) {
    const changes = samples.filter((sample) => sample.id === timer.id);
    expect(changes.length).toBeGreaterThanOrEqual(2);
    for (const sample of changes) {
      expect(sample.previous - sample.seconds).toBe(1);
      const delay = sample.at - (timer.endAt - sample.seconds * 1000);
      expect(delay).toBeGreaterThanOrEqual(0);
      // 실제 스케줄러와 렌더링 지연은 허용하되 1초씩 늦는 회귀는 잡는다.
      expect(delay).toBeLessThan(400);
    }
  }
  expect(await workers[0]?.evaluate(() => typeof self.onmessage)).toBe(
    "function"
  );
  await dialog.getByRole("button", { name: "확인했어요" }).click();
  await expect(page.getByTestId("timer-pin")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("one-slide-timer:timers"))
  ).toBe("[]");
});
