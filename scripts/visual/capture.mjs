// Drives the browser demo (no Tauri) through the main flows and saves a
// screenshot of each screen, for a quick visual check.
//
//   pnpm build
//   pnpm --filter @nabd/app preview --port 4399     (leave running; second terminal:)
//   node scripts/visual/capture.mjs                 → scripts/visual/shots/*.png

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APP_URL = process.env.URL ?? "http://localhost:4399";
const OUT = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (error) => console.error("PAGE ERROR:", error.message));

const settle = () => page.waitForTimeout(500);
const shot = async (name) => {
  await settle();
  await page.screenshot({ path: `${OUT}${name}.png` });
};
const goTo = (screen) => page.getByRole("button", { name: screen, exact: true }).click();

await page.goto(APP_URL, { waitUntil: "networkidle" });
await shot("today");

await page.getByRole("button", { name: "Start set" }).click();
await shot("logger");
await page.getByRole("button", { name: "Log this set" }).click();
await shot("logger-after-set");
await page.getByRole("button", { name: "Done" }).click();

await goTo("Plan");
await shot("plan");
await page
  .getByRole("button", { name: /add exercise/i })
  .first()
  .click();
await shot("library");
await page.getByRole("button", { name: "Close" }).click();

await goTo("Progress");
await shot("progress");

await page.locator("header button").last().click();
await shot("settings");
await page.getByRole("button", { name: "Close" }).click();

await page.getByRole("button", { name: "Light", exact: true }).click();
await goTo("Today");
await shot("today-light");

await browser.close();
