import { EXERCISE, day, plan, loggedSet, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { dumbbellBench, curl } = EXERCISE;

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(TUESDAY);

/** A plan of 4 sets a day; Monday done in full and Tuesday by half, every set logged by hand at 10:00. */
const stored = {
  program: plan([day("Upper", [planned(dumbbellBench.id), planned(curl.id)])]),
  history: [MONDAY, TUESDAY].flatMap((date) =>
    [1, 2, 3].map(() => loggedSet(dumbbellBench.id, { day: date, reps: 8, kg: 20 })),
  ),
  dayLog: [
    { date: MONDAY, planned: 4, done: 4 },
    { date: TUESDAY, planned: 4, done: 2 },
  ],
};

test("Progress reflects the days before and the day just worked", async ({ app }) => {
  const { shell, today, logger, progress } = app;
  await app.launch(at("09:00", WEDNESDAY), stored);

  await test.step("Wednesday: one set from the timer, one from an idle moment, two by hand", async () => {
    await app.busyFor(50);
    await expect(shell.toast).toContainText("Interval's up");
    await shell.letsGo.click();
    await logger.log({ reps: 10, weight: 20 });
    await logger.done();

    await app.idleFor(15);
    await expect(shell.toast).toContainText("You've gone quiet");
    await shell.letsGo.click();
    await logger.log();
    await logger.done();

    await today.startSet.click();
    await logger.log({ reps: 10, weight: 8 });
    await logger.log();
    await logger.done();
    await expect(today.screen).toContainText("Day complete");
  });

  await shell.goTo("Progress");

  await test.step("the headline figures", async () => {
    await expect(progress.kpi("Current streak")).toContainText("3");
    await expect(progress.kpi("Sets this week")).toContainText("10");
    await expect(progress.kpi("Active days 30d")).toContainText("3");
    // 4 of 4, 2 of 4, 4 of 4.
    await expect(progress.kpi("Completion this wk")).toContainText("83");
  });

  await test.step("consistency: this month's calendar, or sets per week", async () => {
    await expect(progress.tab("Calendar")).toBeChecked();
    await expect(progress.screen).toContainText("November 2026");
    await progress.tab("Weekly").click();
    await expect(progress.bars("Sets per week")).toHaveCount(8);
    await expect(progress.bars("Sets per week").last()).toHaveText("10This wk");
    await expect(progress.bars("Sets per week").last()).toHaveAttribute("aria-current", "true");
  });

  await test.step("completion by day and sets by hour", async () => {
    await expect(progress.screen).toContainText("83%this week");
    await expect(progress.bars("Completion by day")).toHaveCount(7);
    await expect(progress.bars("Sets by hour")).toHaveCount(24);
    // Six seeded sets and three of today's fall in the 10 o'clock hour.
    await expect(progress.screen).toContainText("Peak 10a");
    await expect(progress.bars("Sets by hour").nth(10)).toHaveAttribute("aria-current", "true");
  });

  await test.step("what prompted the sets: 1 idle, 1 timer, 8 by hand", async () => {
    await expect(progress.trigger("Idle detected")).toContainText("10%");
    await expect(progress.trigger("Timer")).toContainText("10%");
    await expect(progress.trigger("Manual")).toContainText("80%");
  });

  await test.step("a progression row opens the exercise's full history", async () => {
    await expect(progress.screen.getByRole("meter", { name: "Chest" })).toBeVisible();
    await expect(progress.progressionRow(curl.name)).toBeVisible();
    await progress.progressionRow(dumbbellBench.name).click();
    const history = progress.history(dumbbellBench.name);
    await expect(history).toContainText(`Since ${MONDAY} · 3 sessions`);
    await expect(history).toContainText("Personal best");
    await expect(history.getByRole("img", { name: /^Dumbbell Bench Press, / })).toBeVisible();
    await history.getByRole("button", { name: "Close", exact: true }).click();
    await expect(history).toBeHidden();
  });
});

test("with nothing logged, Progress says what will show up", async ({ app }) => {
  const { shell, progress } = app;
  await app.launch(at("10:00"));
  await shell.goTo("Progress");

  await expect(progress.kpi("Current streak")).toContainText("0");
  await expect(progress.screen).toContainText("Nothing planned yet.");
  await expect(progress.screen).toContainText(
    "No sets logged yet. Your busiest hours show up here.",
  );
  await expect(progress.screen).toContainText("No sets in the last 7 days.");
});
