import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import { EXERCISE, day, loggedSet, plan, planned, slot, workingSets } from "../support/data";
import { test } from "../support/fixtures";
import type { App } from "../support/app";
import { MONDAY, at, dayAfter } from "../support/time";

const OUT = process.env.OUT ?? "/tmp/style-shots/before";
mkdirSync(OUT, { recursive: true });
const { bench, raise, curl, hammerCurl, squat, pullUp, pushUp, plank, barbellBench } = EXERCISE;
const LAST_FRIDAY = dayAfter(MONDAY, -3);

const THEMES = ["dark", "light"] as const;
type ThemeName = (typeof THEMES)[number];

function shooter(page: Page, theme: ThemeName) {
  return async (name: string): Promise<void> => {
    await page.clock.runFor(700);
    await page.screenshot({ path: join(OUT, `${theme}-${name}.png`), animations: "disabled" });
  };
}
const settingsOf = (theme: ThemeName, more: object = {}) => ({ ...DEFAULT_SETTINGS, theme, ...more });

const pushDay = day("Push", [
  planned(bench.id, {
    sets: [{ type: "warmup", amount: 12 }, ...workingSets(2)],
    notes: "Elbows at 45°, pause on the chest",
  }),
  planned(raise.id, { supersetId: "superset", rest: 60 }),
  planned(curl.id, { supersetId: "superset", rest: 60 }),
  planned(plank.id, { repMode: "fixed", sets: [{ type: "working", amount: 45 }] }),
]);
const history = [
  loggedSet(bench.id, { day: LAST_FRIDAY, time: "10:00", reps: 12, kg: 10, type: "warmup" }),
  loggedSet(bench.id, { day: LAST_FRIDAY, time: "10:05", reps: 9, kg: 20 }),
  loggedSet(bench.id, { day: LAST_FRIDAY, time: "11:05", reps: 8, kg: 20 }),
  loggedSet(raise.id, { day: LAST_FRIDAY, time: "12:05", reps: 12, kg: 6 }),
  loggedSet(curl.id, { day: LAST_FRIDAY, time: "13:05", reps: 10, kg: 8, trigger: "idle" }),
];

async function launchDemo(app: App, page: Page, theme: ThemeName): Promise<void> {
  // The sample plan and history: no snapshot handed over.
  const when = at("10:30", dayAfter(MONDAY, 2));
  await page.clock.install({ time: when });
  await page.clock.pauseAt(when);
  await page.goto("/");
  if (theme === "light") await app.shell.button("Light").click();
}

for (const theme of THEMES) {
  test.describe(theme, () => {
    test("today and logger", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const { shell, today, logger, library } = app;
      await app.launch(at("09:10"), { program: plan([pushDay]), history, settings: settingsOf(theme) });
      await shot("today-not-due");
      await app.idleFor(51);
      await shot("today-due-toast");
      await shell.letsGo.click();
      await shot("logger-warmup");
      await logger.log({ reps: 12, weight: 10 });
      await shot("logger-rest-working-advice");
      await logger.log();
      await logger.log();
      await shot("logger-mid-superset");
      await logger.listRow(bench.name).click();
      await shot("logger-complete-exercise-logged-sets");
      await logger.button("+ Something else").click();
      await shot("library-extra");
      await library.add(pushUp.name);
      await shot("logger-extra");
      await logger.log({ reps: 15 });
      await logger.done();
      await today.rowButton(raise.name, "Skip").click();
      await shot("today-mixed-rows");
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await shot("today-paused");
    });

    test("today complete, skipped, rest, empty", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const { today, logger, shell } = app;
      const one = plan([day("Quick", [planned(curl.id, { sets: workingSets(1) })])]);
      await app.launch(at("10:00"), { program: one, settings: settingsOf(theme) });
      await today.rowButton(curl.name, "Skip").click();
      await shot("today-skipped");
      await today.rowButton(curl.name, "Restore").click();
      await today.startSet.click();
      await shot("logger-first-set-no-history");
      await logger.log({ reps: 10, weight: 8 });
      await logger.done();
      await shot("today-complete");
      await shell.goTo("Progress");
      await shot("progress-sparse");
    });

    test("rest day and weekday plan", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const program = plan(
        [
          day("Pull", [planned(pullUp.id), planned(curl.id)], { weekday: 2 }),
          day("Legs", [planned(squat.id)], { weekday: 4 }),
        ],
        { schedule: "weekday" },
      );
      await app.launch(at("10:00"), { program, settings: settingsOf(theme) });
      await shot("today-rest");
      await app.shell.goTo("Plan");
      await shot("plan-weekday");
    });

    test("first run: empty everywhere", async ({ app, page }) => {
      const shot = shooter(page, theme);
      await app.launch(at("10:00"), { settings: settingsOf(theme) });
      await shot("today-empty");
      await app.shell.goTo("Plan");
      await shot("plan-empty");
      await app.shell.goTo("Progress");
      await shot("progress-empty");
    });

    test("planner fixed", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const { planner, library } = app;
      const program = plan([
        pushDay,
        day("Pull", [
          planned(pullUp.id, { intensity: "rpe", sets: [{ type: "working", amount: 6, upTo: 8, intensity: 8 }, { type: "drop", amount: 10, upTo: 12, intensity: 7 }] }),
          planned(barbellBench.id, { intensity: "pct", repMode: "fixed", sets: [{ type: "warmup", amount: 5, intensity: 50 }, { type: "working", amount: 5, intensity: 80 }] }),
        ]),
        day("Empty", []),
      ]);
      await app.launch(at("10:00"), { program, settings: settingsOf(theme) });
      await app.shell.goTo("Plan");
      await shot("plan-fixed-floating");
      await planner.card(plank.name).scrollIntoViewIfNeeded();
      await shot("plan-fixed-superset-scrolled");
      await planner.dayCard("Pull").click();
      await shot("plan-set-table-modes");
      await planner.dayCard("Empty").click();
      await shot("plan-empty-day");
      await planner.button("Delete day").click();
      await shot("confirm");
      await app.confirm.cancel();
      await planner.addExercise.click();
      await shot("library-browse");
      await library.search.fill("curl");
      await shot("library-search");
      await library.search.fill("zzzz");
      await shot("library-empty");
      await library.search.fill("");
      await library.createCustom("Band Pull-Apart", "Rear Delts");
      await library.search.fill("band pull");
      await shot("library-custom-row");
      await library.button("Create custom exercise").click();
      await shot("library-create");
      await library.button("How to track it").click();
      await shot("library-create-dropdown");
    });

    test("planner cycled", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const program = plan(
        [
          day("Upper", [], { slots: [slot("chest", [bench.id, pushUp.id]), slot("biceps", [curl.id, hammerCurl.id]), slot("side_delts", [])] }),
          day("Lower", [], { slots: [slot("quads", [squat.id])] }),
        ],
        { type: "cycled" },
      );
      await app.launch(at("10:00"), { program, settings: settingsOf(theme) });
      await shot("today-cycled");
      await app.shell.goTo("Plan");
      await shot("plan-cycled");
      await page.getByRole("region", { name: "Side Delts", exact: true }).scrollIntoViewIfNeeded();
      await shot("plan-cycled-scrolled");
    });

    test("settings and notice", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const { shell, settings } = app;
      await app.launch(at("10:00"), { program: plan([pushDay]), settings: { theme, interval: 2 } });
      await shot("notice-banner");
      await shell.button("Settings").click();
      await shot("settings-top");
      await settings.row("My equipment").scrollIntoViewIfNeeded();
      await shot("settings-mid");
      await settings.exportData();
      await settings.dialog.getByRole("button", { name: "Quit Nabd" }).scrollIntoViewIfNeeded();
      await shot("settings-end-export-notice");
      await settings.importData("not json");
      await shot("settings-import-error");
      await settings.close();
      await shell.button("Glass").click();
      await shot("today-glass");
      await shell.button("Settings").click();
      await shot("settings-glass");
      await settings.close();
      await shell.goTo("Plan");
      await shot("plan-glass");
    });

    test("progress (sample data)", async ({ app, page }) => {
      const shot = shooter(page, theme);
      const { shell, progress } = app;
      await launchDemo(app, page, theme);
      await shot("demo-today");
      await shell.goTo("Plan");
      await shot("demo-plan");
      await shell.goTo("Progress");
      await shot("progress");
      await progress.tab("Weekly").click();
      await shot("progress-weekly");
      await page.getByRole("heading", { name: "Sets per muscle" }).or(page.getByText("Sets per muscle")).first().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 2000);
      await shot("progress-end");
      await page.getByRole("button", { name: /Bench Press/ }).first().click();
      await shot("chart");
    });

    test("focus ring", async ({ app, page }) => {
      const shot = shooter(page, theme);
      await app.launch(at("09:10"), { program: plan([pushDay]), history, settings: settingsOf(theme) });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await shot("focus-topbar");
      await app.today.startSet.focus();
      await page.keyboard.press("Tab");
      await shot("focus-today");
    });
  });
}

for (const theme of THEMES) {
  test(`${theme} error notice`, async ({ app, page }) => {
    const program = plan([day("Upper", [], { slots: [slot("shoulders" as never, [])] })], { type: "cycled" });
    await app.launch(at("10:00"), { program, settings: settingsOf(theme) });
    await shooter(page, theme)("notice-error");
  });
}
