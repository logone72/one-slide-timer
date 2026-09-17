import * as playwright from "@playwright/test";

const { expect, test } = playwright;

test("range slider shares stepper values and persists whole-minute rail labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "설정 열기" }).click();
  const slider = page.getByRole("slider", { name: "시간 범위 슬라이더" });
  await expect(slider).toHaveValue("11");
  await slider.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuetext", "55분");
  await page.getByRole("button", { name: "시간 범위 늘리기" }).click();
  await expect(slider).toHaveValue("11");
  await slider.press("ArrowRight");
  await expect(page.getByLabel("현재 시간 범위")).toHaveText("2시간");
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "12시간");
  await expect(
    page.getByRole("button", { name: "시간 범위 늘리기" })
  ).toBeDisabled();
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "5분");
  await expect(
    page.getByRole("button", { name: "시간 범위 줄이기" })
  ).toBeDisabled();
  await slider.fill("10");
  await page.keyboard.press("Escape");
  await expect(page.locator(".rail-tick--major span")).toHaveText([
    "55분",
    "44분",
    "33분",
    "22분",
    "11분",
    "0",
  ]);
  await page.reload();
  await page.getByRole("button", { name: "설정 열기" }).click();
  await expect(slider).toHaveValue("10");
  await slider.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.locator(".rail-tick--major span")).toHaveText([
    "1시간",
    "50분",
    "40분",
    "30분",
    "20분",
    "10분",
    "0",
  ]);
});
