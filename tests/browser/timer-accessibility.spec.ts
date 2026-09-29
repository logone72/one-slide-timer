import * as playwright from "@playwright/test";
const { expect, test } = playwright;

test("creates and edits a timer with button activation instead of dragging", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date());
  await page.goto("/");
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.focus();
  await page.keyboard.press("Enter");
  const form = page.getByRole("dialog", { name: "새 타이머", exact: true });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "10초 늘리기" }).click();
  await form.getByRole("button", { name: "시작", exact: true }).click();
  const pin = page.getByTestId("timer-pin");
  await expect(pin).toHaveText(/01:10/);
  await expect(start).toBeFocused();
  const before = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{ id: string; endAt: number }>
  );
  await pin.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "시간 조정", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "타이머 시간 조정" });
  await edit.getByRole("button", { name: "10초 늘리기" }).click();
  await edit.getByRole("button", { name: "적용" }).click();
  const after = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("one-slide-timer:timers") ?? "[]"
      ) as Array<{ id: string; endAt: number }>
  );
  await expect(pin).toBeFocused();
  expect(after).toHaveLength(1);
  expect(after[0]?.id).toBe(before[0]?.id);
  expect(after[0]?.endAt).toBe((before[0]?.endAt ?? 0) + 10_000);
});

test("adds completed timers without reopening the dialog or moving focus", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify(
        [-1000, 10_000].map((duration, index) => ({
          id: String(index),
          color: "#0066cc",
          createdAt: Date.now() - 60_000,
          endAt: Date.now() + duration,
        }))
      )
    )
  );
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "시간이 되었어요." });
  await expect(dialog.locator("li")).toHaveCount(1);
  await dialog.getByRole("button", { name: "확인했어요" }).focus();
  await page.evaluate(() => {
    const state = Object.assign(window, { closeCount: 0 });
    document
      .querySelector(".completion-alert")
      ?.addEventListener("close", () => {
        state.closeCount++;
      });
  });
  await page.clock.fastForward(11_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dialog.locator("li")).toHaveCount(2);
  await expect(
    dialog.getByRole("button", { name: "확인했어요" })
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => (window as Window & { closeCount?: number }).closeCount
    )
  ).toBe(0);
  await expect(dialog.getByRole("button", { name: "알림음 켜기" })).toHaveCount(
    0
  );
});

test("switching from keyboard preview to the adjustment dialog cancels the preview", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  await start.focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".timer-draft")).toHaveCount(1);
  await page.keyboard.press("Space");
  const dialog = page.getByRole("dialog", { name: "새 타이머", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "시작", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
  await expect(page.locator(".timer-draft")).toHaveCount(0);
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});

test("audio suspension and closure preserve ON and recover on timer registration", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const state = Object.assign(window, {
      testAudioContext: null as AudioContext | null,
    });
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        state.testAudioContext = this;
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  const activate = page.getByRole("switch", { name: "알림음", exact: true });
  await expect(activate).toBeChecked();
  await page.evaluate(() =>
    (
      window as Window & { testAudioContext?: AudioContext }
    ).testAudioContext?.suspend()
  );
  await expect(activate).toBeChecked();
  await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  const audioState = () =>
    page.evaluate(
      () =>
        (window as Window & { testAudioContext?: AudioContext })
          .testAudioContext?.state
    );
  await expect.poll(audioState).toBe("running");
  await page.evaluate(() =>
    (
      window as Window & { testAudioContext?: AudioContext }
    ).testAudioContext?.close()
  );
  await page.getByRole("button", { name: "설정 열기", exact: true }).click();
  await expect(activate).toBeChecked();
  await page.getByRole("button", { name: "타이머로 돌아가기" }).click();
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect.poll(audioState).toBe("running");
});
