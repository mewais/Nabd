import { EXERCISE, day, floatingProgram, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, curl, pushUp } = EXERCISE;

/** Two exercises of two sets each. */
const program = floatingProgram([day("Push", [planned(bench.id), planned(curl.id)])]);

test("a nudge is an invitation: any order, extra sets, extras, skipping and undoing", async ({
  app,
}) => {
  const { shell, today, logger, library } = app;
  await app.launch(at("10:00"), { program });

  await test.step("any exercise can be started out of order", async () => {
    await expect(today.row(bench.name)).toHaveAttribute("data-state", "next");
    await today.rowButton(curl.name, "Start").click();
    await expect(logger.exercise).toHaveText(curl.name);
    await logger.log({ reps: 10, weight: 8 });
    await logger.log();
    await expect(logger.listRow(curl.name)).toContainText("2/2");
  });

  await test.step("sets beyond the plan are logged, and do not count as planned work", async () => {
    await logger.listRow(curl.name).click();
    await expect(logger.dialog).toContainText("All 2 sets done — extra set");
    await logger.log();
    await expect(logger.listRow(curl.name)).toContainText("3/2");
    // The form moves on to the exercise that still owes sets.
    await expect(logger.exercise).toHaveText(bench.name);
    await logger.listRow(curl.name).click();
    await expect(logger.loggedSets).toHaveCount(3);
    await expect(shell.ring).toHaveAccessibleName("2 of 4 sets done today");
  });

  await test.step('"Something else" logs an exercise that is not in the plan', async () => {
    await logger.button("+ Something else").click();
    await expect(library.dialog).toHaveAccessibleName("Log Something Else");
    await library.add(pushUp.name);
    await expect(logger.exercise).toHaveText(pushUp.name);
    await expect(logger.dialog).toContainText("Set 1");
    await logger.log({ reps: 15 });
    await logger.done();
    await expect(today.row(pushUp.name)).toContainText("1 set");
    await expect(today.row(curl.name)).toContainText("3/2 sets");
    await expect(today.rowButton(curl.name, "More")).toBeVisible();
  });

  await test.step("an exercise can be skipped for the day, and restored", async () => {
    await today.rowButton(bench.name, "Skip").click();
    await expect(today.row(bench.name)).toContainText("Skipped");
    await expect(today.rowButton(bench.name, "Start")).toBeHidden();
    await expect(shell.ring).toHaveAccessibleName("2 of 2 sets done today");
    await today.rowButton(bench.name, "Restore").click();
    await expect(today.row(bench.name)).toContainText("0/2 sets");
    await expect(shell.ring).toHaveAccessibleName("2 of 4 sets done today");
  });

  await test.step("a logged set can be undone", async () => {
    await today.startSet.click();
    await expect(logger.exercise).toHaveText(bench.name);
    await logger.log({ reps: 8, weight: 20 });
    await expect(logger.loggedSets).toHaveCount(1);
    await logger.button("Delete set 1").click();
    await expect(logger.loggedSets).toHaveCount(0);
    await expect(logger.listRow(bench.name)).toContainText("0/2");
  });

  await test.step("finishing every planned set completes the day, and nudging stops", async () => {
    await logger.log();
    await logger.log();
    await logger.done();
    await expect(today.screen).toContainText("Day complete");
    await expect(today.screen).toContainText("All 6 sets logged across your workday.");
    await expect(today.startSet).toBeHidden();
    await expect(shell.ring).toHaveAccessibleName("4 of 4 sets done today");
    await expect(shell.status).toContainText("Nothing left today");
    await app.idleFor(180);
    await expect(shell.status).toContainText("13:00");
    await expect(shell.toast).toBeHidden();
  });
});

test("an extra added by mistake can be removed until it has a set", async ({ app }) => {
  const { today, logger, library } = app;
  await app.launch(at("10:00"), { program });

  await today.logSomethingElse.click();
  await library.add(pushUp.name);
  await logger.done();
  await expect(today.row(pushUp.name)).toContainText("0 sets");
  await today.rowButton(pushUp.name, "Remove").click();
  await expect(today.row(pushUp.name)).toBeHidden();
});
