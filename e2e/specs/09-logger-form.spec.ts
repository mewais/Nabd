import { EXERCISE, day, loggedSet, plan, planned, workingSets } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { bench, pullUp } = EXERCISE;

const LAST_FRIDAY = dayAfter(MONDAY, -3);
const TUESDAY = dayAfter(MONDAY);

test("a warm-up starts from the last warm-up, and the working set after it from the working set", async ({
  app,
}) => {
  const { today, logger } = app;
  const program = plan([
    day("Push", [planned(bench.id, { sets: [{ type: "warmup", amount: 12 }, ...workingSets(2)] })]),
  ]);
  const history = [
    loggedSet(bench.id, { day: LAST_FRIDAY, time: "10:00", reps: 12, kg: 10, type: "warmup" }),
    loggedSet(bench.id, { day: LAST_FRIDAY, time: "10:05", reps: 10, kg: 20 }),
  ];
  await app.launch(at("10:00"), { program, history });
  await today.startSet.click();

  await test.step("the warm-up form holds last time's warm-up, not last time's working set", async () => {
    await expect(logger.dialog).toContainText("Set 1 of 3 · Warm-up · 12 reps");
    await expect(logger.reps).toHaveValue("12");
    await expect(logger.weight).toHaveValue("10");
    await logger.log({ weight: 12.5 });
  });

  await test.step("the working set that follows holds last time's working set", async () => {
    await expect(logger.dialog).toContainText("Set 2 of 3 · Working set · 8–12 reps");
    await expect(logger.dialog).toContainText("Last time: 10 × 20 kg");
    await expect(logger.reps).toHaveValue("10");
    await expect(logger.weight).toHaveValue("20");
  });

  await test.step("a warm-up is not counted as weight lifted", async () => {
    await logger.done();
    await expect(today.stat("Lifted today")).toContainText("0");
    await today.startSet.click();
    await logger.log();
    await logger.done();
    await expect(today.stat("Lifted today")).toContainText("200");
  });

  await test.step("between two working sets the form keeps what was just done", async () => {
    await today.startSet.click();
    await expect(logger.dialog).toContainText("Set 3 of 3 · Working set");
    await expect(logger.reps).toHaveValue("10");
    await expect(logger.weight).toHaveValue("20");
  });
});

test("a bodyweight exercise is worded and advised in reps until weight is added", async ({
  app,
}) => {
  const { shell, today, logger, progress } = app;
  // One day, done whole each time: every day is a session of its own.
  const program = plan([day("Pull", [planned(pullUp.id)])]);
  await app.launch(at("10:00"), { program });

  await test.step("first time: plain reps, with no starting weight to pick", async () => {
    await expect(today.screen).toContainText("Try 8 reps");
    await expect(today.screen).not.toContainText("pick a starting weight");
    await today.startSet.click();
    await expect(logger.weight).toHaveAccessibleName("Added weight (kg)");
    await expect(logger.weight).toHaveValue("0");
  });

  await test.step("a set with nothing added is logged as reps", async () => {
    await logger.log({ reps: 12 });
    await logger.log({ reps: 12 });
    await expect(logger.loggedSets).toHaveText([/12 reps/, /12 reps/]);
    await logger.done();
  });

  await test.step("its progress is measured in reps", async () => {
    await shell.goTo("Progress");
    await expect(progress.progressionRow(pullUp.name)).toContainText("12 reps");
    await shell.goTo("Today");
  });

  await app.sleepUntil(at("10:00", TUESDAY));

  await test.step("at the top of the range: add weight, or else one more rep", async () => {
    await expect(today.screen).toContainText("Try 8 + 2.5 kg or 13 reps");
    await expect(today.screen).toContainText("Last time: 12 reps");
    await today.startSet.click();
    await expect(logger.suggestions).toHaveText(["8 + 2.5 kg", "13 reps"]);
  });

  await test.step("once weight has been added, its whole trend is an estimated 1RM", async () => {
    await logger.log({ reps: 5, weight: 5 });
    await expect(logger.loggedSets).toHaveText([/5 \+ 5 kg/]);
    await logger.done();
    await shell.goTo("Progress");
    await expect(progress.progressionRow(pullUp.name)).toContainText("5.8 kg e1RM");
    await expect(progress.progressionRow(pullUp.name)).not.toContainText("reps");
  });
});

test("an exercise that needs a load asks for one the first time", async ({ app }) => {
  const { today } = app;
  await app.launch(at("10:00"), { program: plan([day("Push", [planned(bench.id)])]) });
  await expect(today.screen).toContainText("8 reps — pick a starting weight");
});
