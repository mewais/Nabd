import { exercise, day, plan, loggedSet, planned, workingSets } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const curl = exercise("curl");
const gobletSquat = exercise("gobletSquat");

const LB_PER_KG = 2.2046226218;
const lb = (pounds: number): number => pounds / LB_PER_KG;

const LAST_FRIDAY = dayAfter(MONDAY, -3);
const LAST_WEDNESDAY = dayAfter(MONDAY, -5);

/**
 * Pounds, in 2.5 lb steps, and a plan of 8–12 reps. Last session's curls were
 * inside the range, at its top and below it; squats fell short twice running.
 */
const stored = {
  settings: { weightUnit: "lb", weightIncrement: 2.5 },
  program: plan([
    day("Pull", [planned(curl.id, { sets: workingSets(3) }), planned(gobletSquat.id)]),
  ]),
  history: [
    loggedSet(gobletSquat.id, { day: LAST_WEDNESDAY, reps: 6, kg: lb(40) }),
    loggedSet(curl.id, { day: LAST_FRIDAY, time: "10:00", reps: 8, kg: lb(25) }),
    loggedSet(curl.id, { day: LAST_FRIDAY, time: "11:00", reps: 12, kg: lb(25) }),
    loggedSet(curl.id, { day: LAST_FRIDAY, time: "12:00", reps: 6, kg: lb(25) }),
    loggedSet(gobletSquat.id, { day: LAST_FRIDAY, time: "13:00", reps: 6, kg: lb(40) }),
  ],
};

test("double progression against the same set of the previous session", async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), stored);

  await test.step("inside the range: one more rep, or the same reps with more load", async () => {
    await expect(today.screen).toContainText("Try 9 × 25 lb or 8 × 27.5 lb");
    await expect(today.screen).toContainText("Last time: 8 × 25 lb");
    await today.startSet.click();
    await expect(logger.suggestions).toHaveText(["9 × 25 lb", "8 × 27.5 lb"]);
  });

  await test.step("the form starts on the reference set, not on the suggestion", async () => {
    await expect(logger.reps).toHaveValue("8");
    await expect(logger.weight).toHaveValue("25");
  });

  await test.step("clicking a suggestion fills the form", async () => {
    await logger.suggestions.first().click();
    await expect(logger.reps).toHaveValue("9");
    await expect(logger.weight).toHaveValue("25");
    await logger.suggestions.last().click();
    await expect(logger.reps).toHaveValue("8");
    await expect(logger.weight).toHaveValue("27.5");
    await logger.log();
    await expect(logger.loggedSets).toHaveText([/8 × 27.5 lb/]);
  });

  await test.step("at the top of the range: more load, back at the bottom of the range", async () => {
    await expect(logger.dialog).toContainText("Set 2 of 3");
    await expect(logger.suggestions).toHaveText(["8 × 27.5 lb", "13 × 25 lb"]);
    await expect(logger.dialog).toContainText("Last time: 12 × 25 lb");
    await logger.log();
  });

  await test.step("below the range: hold the load and reach the range", async () => {
    await expect(logger.dialog).toContainText("Set 3 of 3");
    await expect(logger.suggestions).toHaveText(["8 × 25 lb"]);
    await expect(logger.dialog).toContainText("Last time: 6 × 25 lb");
  });

  await test.step("below the range twice running: back off one step", async () => {
    await logger.listRow(gobletSquat.name).click();
    await expect(logger.exercise).toHaveText(gobletSquat.name);
    await expect(logger.suggestions).toHaveText(["8 × 37.5 lb"]);
    await expect(logger.dialog).toContainText("Last time: 6 × 40 lb");
    await expect(logger.weight).toHaveValue("40");
  });
});
