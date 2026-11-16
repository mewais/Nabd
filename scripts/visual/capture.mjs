// Drives the browser demo (no Tauri) through every screen and modal, in the
// dark and the light theme, and saves a screenshot of each for a visual check.
//
//   pnpm build
//   pnpm --filter @nabd/app exec vite preview --port 4399   (leave running; second terminal:)
//   node scripts/visual/capture.mjs                         → scripts/visual/shots/<theme>-*.png
//
// URL and OUT override where the app is and where the screenshots go.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_URL = process.env.URL ?? "http://localhost:4399";
const OUT = process.env.OUT ?? fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const button = (name) => page.getByRole("button", { name, exact: true });
const planType = (name) =>
  page.getByRole("group", { name: "Plan type" }).getByRole("button", { name });
const dialog = (name) => page.getByRole("dialog", { name });
const goTo = (screen) => page.getByRole("navigation").getByRole("button", { name: screen }).click();
const close = (name) => dialog(name).getByRole("button", { name: "Close", exact: true }).click();

async function captureAll(theme) {
  const shot = async (name) => {
    // Let the modal fade and the bar transitions finish.
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `${theme}-${name}.png`) });
  };

  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await button(theme === "light" ? "Light" : "Dark").click();
  await shot("today");

  await button("Start set").click();
  await shot("logger");
  await button("Log this set").click();
  await shot("logger-after-set");
  await button("+ Something else").click();
  await shot("library-extra");
  await close("Log Something Else");
  await button("Done").click();

  await goTo("Plan");
  await shot("plan-fixed");
  await button("+ Add exercise").click();
  await shot("library");
  await button("Create custom exercise").click();
  await shot("library-create");
  await button("Back").click();
  // Picking an exercise closes the library and adds a card to the day.
  const cards = page.getByRole("region");
  const before = await cards.count();
  await dialog("Add Exercise").getByRole("button", { name: /^Add / }).first().click();
  await cards.nth(before).waitFor();
  await shot("plan-exercise-added");
  await planType("Cycled").click();
  await shot("plan-cycled");
  await planType("Fixed").click();
  await button("Weekdays").click();
  await shot("plan-weekdays");
  await button("Floating").click();

  await goTo("Progress");
  await shot("progress");
  await button("Weekly").click();
  await shot("progress-weekly");
  await page
    .getByRole("button", { name: /Bench Press/ })
    .first()
    .click();
  await shot("chart");
  await close(/Bench Press/);

  await button("Settings").click();
  await shot("settings");
  await dialog("Settings").getByRole("button", { name: "Quit Nabd" }).scrollIntoViewIfNeeded();
  await shot("settings-end");
  await close("Settings");

  await button("Glass").click();
  await goTo("Today");
  await shot("today-glass");
  await button("Glass").click();
}

await captureAll("dark");
await captureAll("light");
await browser.close();

if (errors.length > 0) {
  console.error(`Page errors:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`Screenshots written to ${OUT}`);
