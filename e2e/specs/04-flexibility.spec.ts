import { EXERCISE, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, curl, pushUp } = EXERCISE;

/** Two exercises of two sets each. */
const program = plan([day("Push", [planned(bench.id), planned(curl.id)])]);

test("a nudge is an invitation: any order, extra sets, extras, skipping and undoing", async ({
  app,
}) => {
  const { shell, today, logger, library } = app;
  await app.launch(at("10:00"), { program });

  await test.step("any exercise can be started out of order", async () => {
    await expect(today.row(bench.name).getByRole("img", { name: "Up next" })).toBeVisible();
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
    // More of this exercise was the user's own choice: the form stays on it.
    await expect(logger.exercise).toHaveText(curl.name);
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

  await test.step('"Something else" that is already in today\'s queue goes to that exercise', async () => {
    await today.logSomethingElse.click();
    await library.add(curl.name);
    await expect(logger.exercise).toHaveText(curl.name);
    await expect(logger.dialog).toContainText("All 2 sets done — extra set");
    await logger.done();
    await expect(today.row(curl.name)).toHaveCount(1);
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

test("a number in the set form can be deleted and typed afresh", async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), { program });
  await today.startSet.click();
  await expect(logger.reps).toHaveValue("8");

  await test.step("reps: one digit deleted, two typed", async () => {
    await logger.reps.press("End");
    await logger.reps.press("Backspace");
    await expect(logger.reps).toHaveValue("");
    await logger.reps.pressSequentially("12");
    await expect(logger.reps).toHaveValue("12");
  });

  await test.step("weight: emptied and retyped, with decimals kept as typed", async () => {
    await logger.weight.fill("100");
    await logger.weight.press("End");
    for (let digit = 0; digit < 3; digit++) await logger.weight.press("Backspace");
    await logger.weight.pressSequentially("21.25");
    await expect(logger.weight).toHaveValue("21.25");
  });

  await test.step("a field left empty goes back to the last number it held", async () => {
    await logger.reps.fill("");
    await logger.weight.click();
    await expect(logger.reps).toHaveValue("12");
  });

  await test.step("a number no set could have is not taken", async () => {
    await logger.weight.fill("99999");
    await logger.reps.click();
    await expect(logger.weight).toHaveValue("21.25");
  });

  await test.step("↑ and ↓ step by the field's own step: the weight increment, one rep", async () => {
    await logger.weight.press("ArrowUp");
    await expect(logger.weight).toHaveValue("23.75");
    await logger.weight.press("ArrowDown");
    await logger.reps.press("ArrowUp");
    await expect(logger.reps).toHaveValue("13");
  });

  await test.step("Enter logs the set as the form shows it", async () => {
    await logger.reps.press("Enter");
    await expect(logger.loggedSets).toHaveText([/13 × 21.25 kg/]);
  });
});
