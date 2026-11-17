import { exercise, day, loggedSet, plan, planned, workingSets } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const dumbbellBench = exercise("dumbbellBench");
const curl = exercise("curl");

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(TUESDAY);

/** One floating day: dumbbellBench with a warm-up and three working sets, then two sets of curls. */
const program = plan([
  day("Push", [
    planned(dumbbellBench.id, { sets: [{ type: "warmup", amount: 12 }, ...workingSets(3)] }),
    planned(curl.id),
  ]),
]);

/** Push a week ago: the warm-up, then 10, 9 and 8 × 22.5 kg. */
const LAST_MONDAY = dayAfter(MONDAY, -7);
const lastWeek = [
  loggedSet(dumbbellBench.id, {
    day: LAST_MONDAY,
    time: "10:00",
    reps: 12,
    kg: 10,
    type: "warmup",
  }),
  ...[10, 9, 8].map((reps, set) =>
    loggedSet(dumbbellBench.id, { day: LAST_MONDAY, time: `10:0${set + 1}`, reps, kg: 22.5 }),
  ),
];

test("an unfinished day comes back with only what is still owed, from the right set on", async ({
  app,
}) => {
  const { shell, today, logger, progress } = app;
  await app.launch(at("16:00"), { program, history: lastWeek });

  await test.step("Monday: the warm-up and the first working set", async () => {
    await today.startSet.click();
    await logger.log({ reps: 12, weight: 10 });
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(today.row(dumbbellBench.name)).toContainText("2/4 sets");
  });

  await app.sleepUntil(at("00:01", TUESDAY));

  await test.step("Tuesday: the bench press shows what Monday did, and the day owes the other 4 of its 6 sets", async () => {
    await expect(today.row(dumbbellBench.name)).toContainText("2/4 sets");
    await expect(today.row(curl.name)).toContainText("0/2 sets");
    await expect(shell.ring).toHaveAccessibleName("0 of 4 sets done today");
    // The warm-up is behind it: the next set is the second working set, not the warm-up.
    await expect(today.screen).toContainText("Up next · Set 3 of 4");
    await expect(today.screen).toContainText("Working set · 8–12 reps");
    // One workout over two days: set 2 is compared with last week's set 2, not with Monday's set 1.
    await expect(today.screen).toContainText("Last time: 9 × 22.5 kg");
  });

  await test.step("the nudge is for the set that is owed", async () => {
    await app.sleepUntil(at("09:50", TUESDAY));
    await expect(shell.toast).toContainText(dumbbellBench.name);
    await expect(shell.toast).toContainText("Chest · Set 3 of 4");
    await shell.letsGo.click();
    await expect(logger.dialog).toContainText(
      "Continuing Monday's Push — what was done then counts.",
    );
    await expect(logger.dialog).toContainText("Set 3 of 4 · Working set · 8–12 reps");
    await expect(logger.loggedSets).toHaveCount(0);
  });

  await test.step("an exercise whose sets are all done is done, and is left alone", async () => {
    await logger.log({ reps: 8, weight: 20 });
    await logger.log({ reps: 8, weight: 20 });
    await expect(logger.listRow(dumbbellBench.name)).toContainText("4/4");
    await expect(logger.exercise).toHaveText(curl.name);
    await logger.done();
    await expect(today.row(dumbbellBench.name)).toContainText("4/4 sets");
    await expect(today.rowButton(dumbbellBench.name, "Skip")).toBeHidden();
    await expect(today.screen).toContainText("Up next · Set 1 of 2");
  });

  await test.step("the curls finish the day, and the day was whole", async () => {
    await today.startSet.click();
    await logger.log({ reps: 10, weight: 8 });
    await logger.log();
    await logger.done();
    await expect(today.screen).toContainText("Day complete");
    await shell.goTo("Progress");
    // Monday: 2 of 6 owed. Tuesday: 4 of 4 owed.
    await expect(progress.kpi("Completion this wk")).toContainText("60");
  });

  await app.sleepUntil(at("00:01", WEDNESDAY));

  await test.step("Wednesday: the plan has moved on, to a day that starts from nothing", async () => {
    await shell.goTo("Today");
    await expect(today.row(dumbbellBench.name)).toContainText("0/4 sets");
    await expect(today.row(curl.name)).toContainText("0/2 sets");
  });
});

test("a set skipped on the first day is owed again on the next", async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("16:00"), { program });
  await today.rowButton(curl.name, "Skip").click();
  await today.startSet.click();
  await logger.log({ reps: 12, weight: 10 });
  await logger.done();

  await app.sleepUntil(at("00:01", TUESDAY));

  await expect(today.row(dumbbellBench.name)).toContainText("1/4 sets");
  await expect(today.row(curl.name)).toContainText("0/2 sets");
  await expect(today.rowButton(curl.name, "Restore")).toBeHidden();
  await expect(today.rowButton(curl.name, "Skip")).toBeVisible();
});
