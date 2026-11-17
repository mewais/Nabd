import { exercise, day, loggedSet, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const dumbbellBench = exercise("dumbbellBench");
const curl = exercise("curl");

const pushPull = plan([day("Push", [planned(dumbbellBench.id)]), day("Pull", [planned(curl.id)])]);

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(MONDAY, 2);
const SATURDAY = dayAfter(MONDAY, 5);
const SUNDAY = dayAfter(MONDAY, 6);

test("Skip today: a day without the workout is quiet, still takes a set, and its day comes back tomorrow", async ({
  app,
}) => {
  const { shell, today, logger } = app;
  await app.launch(at("10:00"), { program: pushPull });

  await test.step("the nudge toast offers to skip the day, and that silences it until tomorrow", async () => {
    await app.idleFor(50);
    await expect(shell.toast).toContainText("Interval's up");
    await shell.skipFromToast.click();
    await expect(shell.toast).toBeHidden();
    await expect(shell.status).toContainText("Skipped today");
    await expect(today.screen).toContainText("Skipped today");
    await app.idleFor(120);
    await expect(shell.toast).toBeHidden();
  });

  await test.step("Resume today takes the skip back, and the top bar can skip again", async () => {
    await shell.button("Resume today").click();
    await app.tick();
    await expect(shell.toast).toContainText("Interval's up");
    await shell.snooze.click();
    await shell.button("Skip today").click();
    await expect(shell.status).toContainText("Skipped today");
  });

  await test.step("a set logged by hand counts, and the day stays quiet", async () => {
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
    await expect(shell.status).toContainText("Skipped today");
  });

  await app.sleepUntil(at("00:01", TUESDAY));

  await test.step("Tuesday: the skip has ended, and Push comes back owing the set that is left", async () => {
    await expect(shell.status).toContainText("Quiet until 09:00");
    await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
    await expect(today.row(curl.name)).toBeHidden();
    await app.sleepUntil(at("09:50", TUESDAY));
    await expect(shell.toast).toContainText("Interval's up");
  });
});

test("a skipped workday on a weekday plan neither ends the streak nor counts against completion", async ({
  app,
}) => {
  const { shell, today, logger, progress } = app;
  const program = plan(
    [
      day("Push", [planned(dumbbellBench.id)], { weekday: 2 }),
      day("Pull", [planned(curl.id)], { weekday: 3 }),
    ],
    { schedule: "weekday" },
  );
  const monday = loggedSet(curl.id, { day: MONDAY, reps: 10, kg: 8 });
  await app.launch(at("09:30", TUESDAY), { program, history: [monday] });
  await shell.button("Skip today").click();

  await app.sleepUntil(at("10:00", WEDNESDAY));
  await today.startSet.click();
  await logger.log({ reps: 10, weight: 8 });
  await logger.log();
  await logger.done();

  await expect(today.stat("Streak")).toContainText("2");
  await shell.goTo("Progress");
  // Wednesday's 2 of 2; the skipped Tuesday owed nothing.
  await expect(progress.kpi("Completion this wk")).toContainText("100");
});

test("Nudge me today: a day off is nudged from the moment it is asked, until stopped or the day ends", async ({
  app,
}) => {
  const { shell, today, logger } = app;
  await app.launch(at("11:00", SATURDAY), { program: pushPull });
  await expect(shell.status).toContainText("Quiet until Mon 09:00");

  await test.step("switched on at 11:00, the interval counts from then", async () => {
    await shell.button("Nudge me today").click();
    await expect(shell.status).toContainText("Next nudge at 11:50");
    await app.idleFor(50);
    await expect(shell.toast).toContainText("Interval's up");
  });

  await test.step("Stop nudging today quietens the day again", async () => {
    await shell.button("Stop nudging today").click();
    await expect(shell.toast).toBeHidden();
    await expect(shell.status).toContainText("Quiet until Mon 09:00");
  });

  await test.step("on again, it counts afresh, and ends once the day owes nothing", async () => {
    await app.idleFor(10);
    await shell.button("Nudge me today").click();
    await expect(shell.status).toContainText("Next nudge at 12:50");
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.log();
    await logger.done();
    await expect(shell.status).toContainText("Nothing left today");
    await expect(today.stat("Streak")).toContainText("1");
  });

  await app.sleepUntil(at("11:00", SUNDAY));

  await test.step("Sunday: it did not carry over", async () => {
    await expect(shell.status).toContainText("Quiet until 09:00");
    await expect(shell.button("Nudge me today")).toBeVisible();
  });
});
