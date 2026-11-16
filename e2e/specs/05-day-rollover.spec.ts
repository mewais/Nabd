import { EXERCISE, day, plan, planned, slot } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { bench, barbellBench, curl, hammerCurl, pushUp } = EXERCISE;

const pushPull = plan([day("Push", [planned(bench.id)]), day("Pull", [planned(curl.id)])]);

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(TUESDAY);

test("an unfinished floating day comes back with only the rest, and finishing it moves the plan on", async ({
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

  await test.step("Tuesday: the unfinished day comes back, owing the one set that is left", async () => {
    await expect(shell.topBar).toContainText("TUESDAY · Nov 17");
    await expect(today.row(bench.name)).toContainText("1/2 sets");
    await expect(today.row(curl.name)).toBeHidden();
    await expect(shell.ring).toHaveAccessibleName("0 of 1 set done today");
    await expect(shell.status).toContainText("Quiet until 09:00");
  });

  await test.step("Monday's set counts in the figures, and today continues Monday's workout", async () => {
    await expect(today.stat("Streak")).toContainText("1");
    await expect(today.stat("This week")).toContainText("1");
    await expect(today.stat("Lifted today")).toContainText("0");
    await expect(today.screen).toContainText("Set 2 of 2");
    // One workout over two days: Monday's set is not "last time", and there was none before it.
    await expect(today.screen).not.toContainText("Last time");
    await today.startSet.click();
    await expect(logger.dialog).toContainText(
      "Continuing Monday's Push — what was done then counts.",
    );
    // The form starts from the workout's own last set.
    await expect(logger.weight).toHaveValue("20");
  });

  await test.step("Tuesday: the rest of Push gets done, and that is the day complete", async () => {
    await logger.log();
    await logger.done();
    await expect(today.screen).toContainText("Day complete");
    await expect(today.row(bench.name)).toContainText("2/2 sets");
  });

  await app.sleepUntil(at("00:01", WEDNESDAY));

  await test.step("Wednesday: the plan has moved on to Pull", async () => {
    await expect(shell.topBar).toContainText("WEDNESDAY · Nov 18");
    await expect(today.row(curl.name)).toContainText("0/2 sets");
    await expect(today.row(bench.name)).toBeHidden();
  });

  await test.step("Progress counts what each day owed: Monday 1 of 2, Tuesday 1 of 1", async () => {
    await shell.goTo("Progress");
    await expect(progress.kpi("Current streak")).toContainText("2");
    await expect(progress.kpi("Sets this week")).toContainText("2");
    await expect(progress.kpi("Active days 30d")).toContainText("2");
    // 2 of the 3 sets owed over the two days, and Wednesday's 2, still to do: Progress
    // counts the day the plan is on as Today does.
    await expect(progress.kpi("Completion this wk")).toContainText("40");
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

test("a cycled plan rotates the pools that were trained once its day is done, and only those", async ({
  app,
}) => {
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

  await test.step("Tuesday: the day is not done, so each pool is still on the exercise it gave", async () => {
    await expect(today.row(bench.name)).toContainText("1/2 sets");
    await expect(today.row(barbellBench.name)).toBeHidden();
    await expect(today.row(curl.name)).toContainText("0/2 sets");
    await expect(today.row(hammerCurl.name)).toBeHidden();
  });

  await test.step("the biceps are skipped and the chest finished: that is the day", async () => {
    await today.rowButton(curl.name, "Skip").click();
    await today.startSet.click();
    await logger.log();
    await logger.done();
  });

  await app.sleepUntil(at("00:01", WEDNESDAY));

  await test.step("Wednesday: the chest moved on, the biceps stayed where they were", async () => {
    await expect(today.row(barbellBench.name)).toContainText("0/2 sets");
    await expect(today.row(bench.name)).toBeHidden();
    await expect(today.row(curl.name)).toContainText("0/2 sets");
    await expect(today.row(hammerCurl.name)).toBeHidden();
  });
});

test("a floating day that sat idle is not a missed day", async ({ app }) => {
  const { shell, today, logger, progress } = app;
  await app.launch(at("16:00"), { program: pushPull });
  await today.startSet.click();
  await logger.log({ reps: 8, weight: 20 });
  await logger.log();
  await logger.done();

  // Tuesday and Wednesday go by with the app open and nothing logged.
  await app.sleepUntil(at("00:01", TUESDAY));
  await app.sleepUntil(at("00:01", WEDNESDAY));

  await expect(today.row(curl.name)).toContainText("0/2 sets");
  await shell.goTo("Progress");
  // Monday's 2 of 2, and today's 0 of 2 as Today shows it; idle Tuesday is not on record.
  await expect(progress.kpi("Completion this wk")).toContainText("50");
  await expect(progress.bars("Completion by day")).toHaveCount(7);
});

test("editing a pool neither skips nor repeats an exercise", async ({ app }) => {
  const { shell, today, logger, planner } = app;
  const program = plan(
    [day("Upper", [], { slots: [slot("chest", [bench.id, barbellBench.id, pushUp.id])] })],
    { type: "cycled" },
  );
  await app.launch(at("16:00"), { program });

  await test.step("Monday: the pool gives its first exercise, which is then taken out of it", async () => {
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.log();
    await logger.done();
    await shell.goTo("Plan");
    await planner
      .card("Chest")
      .getByRole("button", { name: `Remove ${bench.name} from pool` })
      .click();
    await shell.goTo("Today");
    await expect(today.row(bench.name)).toContainText("2/2 sets");
  });

  await app.sleepUntil(at("00:01", TUESDAY));

  await test.step("Tuesday: the pool gives the exercise that came next, not the one after it", async () => {
    await expect(today.row(barbellBench.name)).toContainText("0/2 sets");
    await expect(today.row(pushUp.name)).toBeHidden();
  });
});
