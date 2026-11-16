import type { SetSpec } from "@nabd/domain";
import { EXERCISE, day, loggedSet, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { dumbbellBench, gobletSquat, curl } = EXERCISE;

/** A working set of 8–12 reps asked at an RPE or a %1RM of `intensity`. */
const asked = (intensity: number): SetSpec => ({
  type: "working",
  amount: 8,
  upTo: 12,
  intensity,
});

/**
 * Bench at 70% of the max, squats at RPE 8, curls at 70% with no history yet.
 * Last Friday dumbbellBench and gobletSquat both went 10 × 60 kg: an estimated max of 80 kg.
 */
const stored = {
  program: plan([
    day("Push", [
      planned(dumbbellBench.id, { intensity: "pct", sets: [asked(70), asked(70)] }),
      planned(gobletSquat.id, { intensity: "rpe", sets: [asked(8), asked(8)] }),
      planned(curl.id, { intensity: "pct", sets: [asked(70), asked(70)] }),
    ]),
  ]),
  history: [
    loggedSet(dumbbellBench.id, { day: dayAfter(MONDAY, -3), reps: 10, kg: 60 }),
    loggedSet(gobletSquat.id, { day: dayAfter(MONDAY, -3), reps: 10, kg: 60 }),
  ],
};

test("a %1RM suggests that share of the estimated max, and keeps double progression on offer", async ({
  app,
}) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), stored);

  await test.step("the day's next set says what it is asked at and why the load is what it is", async () => {
    await expect(today.screen).toContainText("Working set · 8–12 reps · 70% 1RM");
    await expect(today.screen).toContainText("Try 8 × 55 kg or 11 × 60 kg");
    await expect(today.screen).toContainText("70% of your estimated max (80 kg).");
    await expect(today.screen).toContainText("Last time: 10 × 60 kg");
  });

  await test.step("either suggestion fills the form", async () => {
    await today.startSet.click();
    await expect(logger.suggestions).toHaveText(["8 × 55 kg", "11 × 60 kg"]);
    await logger.suggestions.first().click();
    await expect(logger.reps).toHaveValue("8");
    await expect(logger.weight).toHaveValue("55");
    await logger.suggestions.last().click();
    await expect(logger.reps).toHaveValue("11");
    await expect(logger.weight).toHaveValue("60");
  });
});

test("an RPE suggests the load that leaves 10 − RPE reps in reserve", async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), stored);
  await today.startSet.click();
  await logger.listRow(gobletSquat.name).click();

  await expect(logger.exercise).toHaveText(gobletSquat.name);
  await expect(logger.dialog).toContainText("Working set · 8–12 reps · RPE 8");
  // 8 reps with 2 in reserve is 10 reps' worth of an 80 kg max: 80 / (1 + 10/30) = 60 kg.
  await expect(logger.suggestions).toHaveText(["8 × 60 kg", "11 × 60 kg"]);
  await expect(logger.dialog).toContainText("RPE 8 ≈ 2 reps in reserve.");
});

test("with no history yet the intensity waits, and suggestions are plain double progression", async ({
  app,
}) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), stored);
  await today.startSet.click();
  await logger.listRow(curl.name).click();

  await expect(logger.exercise).toHaveText(curl.name);
  await expect(logger.dialog).toContainText("70% 1RM applies once there is history.");
  await expect(logger.dialog).toContainText("pick a starting weight");
  await logger.log({ reps: 8, weight: 12 });

  await test.step("a set logged is history, from the next day on", async () => {
    await expect(logger.loggedSets).toHaveText([/8 × 12 kg/]);
  });
});
