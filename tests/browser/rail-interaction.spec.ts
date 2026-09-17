import * as playwright from "@playwright/test";

const { expect, test } = playwright;

test("pointer interruption clears the draft without creating a timer", async ({
  page,
}) => {
  await page.goto("/");
  const rail = page.getByTestId("timer-rail");
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  for (const event of [
    "pointercancel",
    "lostpointercapture",
    "blur",
    "visibilitychange",
  ]) {
    await test.step(event, async () => {
      const box = await start.boundingBox();
      if (box === null) {
        throw new Error("Start pin missing");
      }
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y - 90, { steps: 3 });
      await expect(page.locator(".timer-draft")).toHaveCount(1);
      if (event === "blur" || event === "visibilitychange") {
        await page.evaluate((type) => {
          const target = type === "blur" ? window : document;
          target.dispatchEvent(new Event(type));
        }, event);
      } else {
        await rail.dispatchEvent(event);
      }
      await expect(page.locator(".timer-draft")).toHaveCount(0);
      await page.mouse.up();
      await expect(page.getByTestId("timer-pin")).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }
  await start.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});

test("adjustment survives focus changes and Escape cancels without saving", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "새 타이머 시작" });
  if (testInfo.project.name === "mobile-safari") {
    await start.tap();
  } else {
    await start.click();
  }
  const dialog = page.getByRole("dialog", { name: "새 타이머", exact: true });
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await dialog.getByRole("button", { name: "10초 늘리기" }).click();
  await expect(dialog.locator("output")).toHaveText("1분 10초");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(start).toBeFocused();
  await expect(page.getByTestId("timer-pin")).toHaveCount(0);
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});

test("completion during adjustment releases the interaction for the next timer", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([
        {
          id: "soon",
          createdAt: Date.now(),
          endAt: Date.now() + 10_000,
          color: "#0066cc",
        },
      ])
    )
  );
  await page.goto("/");
  await page.getByTestId("timer-pin").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "시간 조정", exact: true }).click();
  const adjustment = page.getByRole("dialog", { name: "타이머 시간 조정" });
  await expect(adjustment).toBeVisible();
  await page.clock.fastForward(11_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const completion = page.getByRole("dialog", { name: "시간이 되었어요." });
  await expect(completion).toBeVisible();
  await expect(adjustment).toHaveCount(0);
  await completion.getByRole("button", { name: "확인했어요" }).click();
  await page.getByRole("button", { name: "새 타이머 시작" }).focus();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timer-pin")).toHaveCount(1);
});
