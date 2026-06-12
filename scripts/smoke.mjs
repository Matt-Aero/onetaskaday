import { chromium } from "playwright";
import fs from "node:fs/promises";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const email = `smoke-${Date.now()}@example.com`;

await fs.mkdir("artifacts", { recursive: true });

try {
  await page.goto("http://localhost:3000");
  await page.getByRole("heading", { name: "Know what to do next." }).waitFor();
  await page.screenshot({ path: "artifacts/landing.png", fullPage: true });

  await page.getByRole("link", { name: "Choose my next step" }).click();
  await page.getByLabel("First name").fill("Sam");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Create account" }).click();

  await page
    .getByLabel("Picture yourself one year from now. What's different?")
    .fill(
      "I have moved into more meaningful work, feel confident making decisions, and have energy left after work.",
    );
  await page.getByText("Work", { exact: true }).click();
  await page.getByText("Confidence", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("The problem or goal I want to focus on first")
    .fill(
      "Move toward a more creative job without creating unnecessary financial risk.",
    );
  await page
    .getByLabel("Why does this matter now?")
    .fill("I have delayed this change for two years and want real evidence this month.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("What could get in the way?")
    .fill("Long workdays and a tendency to overthink choices.");
  await page.getByRole("button", { name: "Build my plan" }).click();

  await page.getByText("Your next move", { exact: true }).waitFor();
  const initialQueue = await page
    .getByText("Next three tasks", { exact: true })
    .locator("..")
    .locator("div.mt-5 > div")
    .count();
  if (initialQueue !== 3) {
    throw new Error(`Expected three upcoming tasks, found ${initialQueue}.`);
  }
  await page.screenshot({ path: "artifacts/today.png", fullPage: true });

  const firstTask = await page.locator("h2").innerText();
  await page.getByRole("button", { name: "I did it" }).click();
  await page
    .getByPlaceholder(/I contacted five people/)
    .fill("Breaking it into a timer made it easy to begin, and I learned which unknown matters most.");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.getByText("Task 2", { exact: true }).waitFor();
  const secondTask = await page.locator("h2").innerText();
  const rollingQueue = await page
    .getByText("Next three tasks", { exact: true })
    .locator("..")
    .locator("div.mt-5 > div")
    .count();

  if (firstTask === secondTask) {
    throw new Error("The current task did not advance after check-in.");
  }
  if (rollingQueue !== 3) {
    throw new Error(`Expected the queue to refill to three tasks, found ${rollingQueue}.`);
  }

  await page.getByRole("link", { name: "View history" }).click();
  await page.getByText("Task history", { exact: true }).waitFor();
  await page.getByText("Breaking it into a timer made it easy to begin", {
    exact: false,
  }).waitFor();
  await page.getByRole("link", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Mark goal accomplished" }).click();
  await page.getByText("Goal accomplished", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Start over" }).click();
  await page
    .getByRole("heading", { name: "What would a better life feel like?" })
    .waitFor();

  console.log(
    JSON.stringify(
      {
        account: email,
        firstTask,
        secondTask,
        screenshots: ["artifacts/landing.png", "artifacts/today.png"],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
