import * as playwright from "@playwright/test";

const { expect, test } = playwright;

test("interpolates timer transforms between ticks and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({
        hideNotificationPrompt: true,
        rangeMinutes: 5,
        theme: "forest",
      })
    );
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([
        {
          id: "motion",
          color: "var(--color-timer-1)",
          createdAt: Date.now(),
          endAt: Date.now() + 240_000,
          status: "running",
        },
      ])
    );
  });
  await page.goto("/");
  const parts = page.locator(".timer-dot, .timer-label, .timer-connector");
  const animationCount = () =>
    parts.evaluateAll((elements) =>
      elements.reduce((sum, element) => sum + element.getAnimations().length, 0)
    );
  await expect.poll(animationCount).toBe(3);
  const samples = await parts.evaluateAll(
    (elements) =>
      new Promise<Array<Array<{ y: number; top: string }>>>((resolve) => {
        const frames: Array<Array<{ y: number; top: string }>> = [];
        const start = performance.now();
        const sample = (): void => {
          frames.push(
            elements.map((element) => {
              const style = getComputedStyle(element);
              return {
                y: new DOMMatrixReadOnly(style.transform).m42,
                top: style.top,
              };
            })
          );
          if (performance.now() - start < 1_200) {
            requestAnimationFrame(sample);
          } else {
            resolve(frames);
          }
        };
        requestAnimationFrame(sample);
      })
  );
  for (let index = 0; index < 3; index += 1) {
    const values = samples.map((frame) => frame[index]?.y ?? 0);
    expect(new Set(values).size).toBeGreaterThan(10);
    expect(values.at(-1)).toBeGreaterThan(values[0] ?? 0);
    expect(samples.every((frame) => frame[index]?.top === "0px")).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(animationCount).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(animationCount).toBe(3);
});
