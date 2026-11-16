import { EXERCISE, day, plan, planned, workingSets } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, raise, curl } = EXERCISE;

/** One day of 7 sets: a main lift with a warm-up, then a superset. Default settings: 09:00–18:00, 50 / 15 min, 30 s. */
const program = plan([
  day("Push", [
    planned(bench.id, { sets: [{ type: "warmup", a: 12 }, ...workingSets(2)] }),
    planned(raise.id, { supersetId: "superset", rest: 60 }),
    planned(curl.id, { supersetId: "superset", rest: 60 }),
  ]),
]);

test("a workday: quiet before hours, nudged at the interval, logged from the nudge", async ({
  app,
}) => {
  const { shell, logger } = app;
  await app.launch(at("08:55"), { program });

  await test.step("before work hours there is no nudge", async () => {
    await expect(shell.status).toContainText("Quiet until 09:00");
    await expect(shell.ring).toHaveAccessibleName("0 of 7 sets done today");
    await app.idleFor(4);
    await expect(shell.toast).toBeHidden();
  });

  await test.step("the timer nudges one interval into the workday", async () => {
    await app.busyFor(50);
    await expect(shell.status).toContainText("09:49");
    await expect(shell.status).toContainText("Next nudge at 09:50, sooner if you go idle");
    await expect(shell.toast).toBeHidden();
    await app.busyFor(1);
    await expect(shell.toast).toContainText("Interval's up");
    await expect(shell.toast).toContainText(bench.name);
    await expect(shell.toast).toContainText("Chest · set 1 of 3");
    await expect(shell.status).toContainText("Interval's up");
  });

  await test.step("the nudge stays up while the user moves the mouse", async () => {
    await app.busyFor(1);
    await expect(shell.toast).toBeVisible();
  });

  await test.step('"Let\'s go" opens the logger on the next set, with its target', async () => {
    await shell.letsGo.click();
    await expect(shell.toast).toBeHidden();
    await expect(logger.exercise).toHaveText(bench.name);
    await expect(logger.dialog).toContainText("Set 1 of 3 · Warm-up · 12 reps");
  });

  await test.step("a warm-up comes with no suggestion", async () => {
    await expect(logger.suggestions).toHaveCount(0);
    await logger.log({ reps: 12, weight: 10 });
    await expect(logger.loggedSets).toHaveText([/Set 1.*12 × 10 kg/]);
  });

  await test.step("rest is counted down before the working sets", async () => {
    await expect(logger.rest).toHaveText("Rest 1:30");
    await app.busyFor(0.5);
    await expect(logger.rest).toHaveText("Rest 1:00");
    await expect(logger.dialog).toContainText("Set 2 of 3 · Working set · 8–12 reps");
    await expect(logger.suggestions).toHaveCount(1);
    await logger.log({ reps: 8, weight: 20 });
    await app.busyFor(1.5);
    await expect(logger.rest).toBeHidden();
    await logger.log();
    await expect(logger.listRow(bench.name)).toContainText("3/3");
    await expect(logger.listRow(bench.name).getByRole("img", { name: "complete" })).toBeVisible();
  });

  await test.step("the superset alternates between its two exercises", async () => {
    for (const exercise of [raise, curl, raise, curl]) {
      await expect(logger.exercise).toHaveText(exercise.name);
      await logger.log({ reps: 10, weight: 5 });
    }
    await expect(logger.listRow(raise.name)).toContainText("2/2");
    await expect(logger.listRow(curl.name)).toContainText("2/2");
    await expect(logger.dialog).toContainText("7 sets logged today");
  });
});

test("after a set: the next nudge, an idle moment, Snooze and Pause", async ({ app }) => {
  const { shell, today, logger } = app;
  await app.launch(at("10:00"), { program });
  await today.startSet.click();
  await logger.log({ weight: 10 });
  await logger.done();

  await test.step("the sidebar ring, the queue and the top bar follow the logged set", async () => {
    await expect(shell.ring).toHaveAccessibleName("1 of 7 sets done today");
    await expect(today.row(bench.name)).toContainText("1/3 sets");
    await expect(today.row(raise.name)).toContainText("0/2 sets");
    await expect(today.screen).toContainText("Up next · Set 2 of 3");
    await expect(shell.status).toContainText("Next nudge at 10:50, sooner if you go idle");
  });

  await test.step("an idle moment nudges early, but only once the minimum gap has passed", async () => {
    await app.idleFor(14);
    await expect(shell.status).toContainText("10:14");
    await expect(shell.toast).toBeHidden();
    await app.idleFor(1);
    await expect(shell.toast).toContainText("You've gone quiet");
    await expect(shell.toast).toContainText("Chest · set 2 of 3");
    await expect(today.screen.getByRole("button", { name: "Snooze 5m" })).toBeVisible();
  });

  await test.step("Snooze hides the nudge for five minutes", async () => {
    await shell.snooze.click();
    await expect(shell.toast).toBeHidden();
    await app.idleFor(4);
    await expect(shell.status).toContainText("10:19");
    await expect(shell.toast).toBeHidden();
    await app.idleFor(1);
    await expect(shell.toast).toBeVisible();
  });

  await test.step("a set logged from the nudge restarts the interval", async () => {
    await shell.letsGo.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(shell.status).toContainText("Next nudge at 11:10");
  });

  // The demo backend lives in the page, so a reload starts over: that Pause
  // survives a restart is checked against the real binary (scripts/smoke).
  await test.step("Pause silences nudges until Resume", async () => {
    await shell.button("Pause").click();
    await expect(shell.status).toContainText("Nudges paused");
    await app.idleFor(120);
    await expect(shell.status).toContainText("12:20");
    await expect(shell.toast).toBeHidden();
    await shell.button("Resume").click();
    await app.tick();
    await expect(shell.toast).toContainText("Interval's up");
  });
});

test("an unanswered nudge waits; an unused logger and the end of the workday quieten it", async ({
  app,
}) => {
  const { shell, logger } = app;
  await app.launch(at("17:00"), { program });

  await test.step("an idle nudge stays up when the user comes back to the mouse", async () => {
    await app.idleFor(15);
    await expect(shell.toast).toContainText("You've gone quiet");
    await app.busyFor(2);
    await expect(shell.toast).toContainText("You've gone quiet");
  });

  await test.step("closing the logger without logging keeps it quiet for the length of a snooze", async () => {
    await shell.letsGo.click();
    await logger.done();
    await app.idleFor(4);
    await expect(shell.status).toContainText("17:21");
    await expect(shell.toast).toBeHidden();
    await app.idleFor(1);
    await expect(shell.toast).toBeVisible();
  });

  await test.step("the workday ending withdraws it", async () => {
    await app.sleepUntil(at("18:00"));
    await expect(shell.toast).toBeHidden();
    await expect(shell.status).toContainText("Quiet until 09:00");
  });
});
