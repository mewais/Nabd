import { EXERCISE, day, plan, planned, slot } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { bench, barbellBench, curl, hammerCurl } = EXERCISE;

const pushPull = plan([day("Push", [planned(bench.id)]), day("Pull", [planned(curl.id)])]);

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(TUESDAY);

test("a floating plan moves on only after a completed day, and yesterday feeds today", async ({
  app,
}) => {
  const { shell, today, logger, progress } = app;
  await app.launch(at("16:00"), { program: pushPull });

  await test.step("Monday: one of Push's two sets", async () => {
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(today.row(bench.name)).toContainText("1/2 sets");
  });

  await app.sleepUntil(at("00:01", TUESDAY));

  await test.step("Tuesday: the unfinished day comes back, with a clean slate", async () => {
    await expect(shell.topBar).toContainText("TUESDAY · Nov 17");
    await expect(today.row(bench.name)).toContainText("0/2 sets");
    await expect(today.row(curl.name)).toBeHidden();
    await expect(shell.ring).toHaveAccessibleName("0 of 2 sets done today");
    await expect(shell.status).toContainText("Quiet until 09:00");
  });

  await test.step("Monday's set counts in the figures and is what today is compared against", async () => {
    await expect(today.stat("Streak")).toContainText("1");
    await expect(today.stat("This week")).toContainText("1");
    await expect(today.stat("Lifted today")).toContainText("0");
    await expect(today.screen).toContainText("Try 9 × 20 kg or 8 × 22.5 kg");
    await expect(today.screen).toContainText("Last time: 8 × 20 kg");
  });

  await test.step("Tuesday: Push gets finished", async () => {
    await today.startSet.click();
    await logger.log();
    await logger.log();
    await logger.done();
    await expect(today.screen).toContainText("Day complete");
  });

  await app.sleepUntil(at("00:01", WEDNESDAY));

  await test.step("Wednesday: the plan has moved on to Pull", async () => {
    await expect(shell.topBar).toContainText("WEDNESDAY · Nov 18");
    await expect(today.row(curl.name)).toContainText("0/2 sets");
    await expect(today.row(bench.name)).toBeHidden();
  });

  await test.step("Progress counts both days and what was planned on each", async () => {
    await shell.goTo("Progress");
    await expect(progress.kpi("Current streak")).toContainText("2");
    await expect(progress.kpi("Sets this week")).toContainText("3");
    await expect(progress.kpi("Active days 30d")).toContainText("2");
    // Monday 1 of 2, Tuesday 2 of 2, Wednesday 0 of 2 so far.
    await expect(progress.kpi("Completion this wk")).toContainText("50");
  });
});

test("a floating day that was skipped outright is not owed, and Pause ends with the day", async ({
  app,
}) => {
  const { shell, today } = app;
  await app.launch(at("16:00"), { program: pushPull });
  await today.rowButton(bench.name, "Skip").click();
  await expect(today.screen).toContainText("Everything skipped today");
  await shell.button("Pause").click();
  await expect(shell.button("Resume")).toBeVisible();

  await app.sleepUntil(at("00:01", TUESDAY));

  await expect(today.row(curl.name)).toContainText("0/2 sets");
  await expect(shell.button("Pause")).toBeVisible();
});

test("a weekday plan has rest days, on which anything can still be logged", async ({ app }) => {
  const { shell, today } = app;
  const program = plan([day("Push", [planned(bench.id)], { weekday: 1 })], {
    schedule: "weekday",
  });
  await app.launch(at("16:00"), { program });
  await expect(today.row(bench.name)).toContainText("0/2 sets");

  await app.sleepUntil(at("00:01", TUESDAY));

  await expect(today.screen).toContainText("Rest day");
  await expect(today.logSomethingElse).toBeVisible();
  await expect(shell.status).toContainText("Nothing left today");
});

test("a cycled plan rotates the pools that were trained, and only those", async ({ app }) => {
  const { today, logger } = app;
  const program = plan(
    [
      day("Upper", [], {
        slots: [
          slot("chest", [bench.id, barbellBench.id]),
          slot("biceps", [curl.id, hammerCurl.id]),
        ],
      }),
    ],
    { type: "cycled" },
  );
  await app.launch(at("16:00"), { program });

  await expect(today.row(bench.name)).toContainText("Chest");
  await expect(today.row(curl.name)).toContainText("Biceps");
  await today.startSet.click();
  await logger.log({ reps: 8, weight: 20 });
  await logger.done();
  await expect(today.row(bench.name)).toContainText("1/2 sets");

  await app.sleepUntil(at("00:01", TUESDAY));

  await expect(today.row(barbellBench.name)).toContainText("0/2 sets");
  await expect(today.row(bench.name)).toBeHidden();
  await expect(today.row(curl.name)).toContainText("0/2 sets");
  await expect(today.row(hammerCurl.name)).toBeHidden();
});
