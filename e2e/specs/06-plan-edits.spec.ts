import { exercise, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const dumbbellBench = exercise("dumbbellBench");
const curl = exercise("curl");
const gobletSquat = exercise("gobletSquat");

const program = plan([
  day("Push", [planned(dumbbellBench.id), planned(curl.id)]),
  day("Legs", [planned(gobletSquat.id)]),
]);

test.beforeEach(async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), { program });
  await today.startSet.click();
  await logger.log({ reps: 8, weight: 20 });
  await logger.done();
  await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
});

test("switching the plan between fixed and cycled keeps today's sets", async ({ app }) => {
  const { shell, today, planner } = app;

  await shell.goTo("Plan");
  await planner.option("Plan type", "Cycled").click();
  await expect(planner.card("Chest")).toContainText(dumbbellBench.name);
  await shell.goTo("Today");
  await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
  await expect(today.stat("Lifted today")).toContainText("160");

  await shell.goTo("Plan");
  await planner.option("Plan type", "Fixed").click();
  await expect(planner.card(dumbbellBench.name)).toBeVisible();
  await shell.goTo("Today");
  await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
  await expect(shell.ring).toHaveAccessibleName("1 of 4 sets done today");
});

test("deleting an exercise that has sets today keeps them listed and counted", async ({ app }) => {
  const { shell, today, planner } = app;

  await shell.goTo("Plan");
  await planner.card(dumbbellBench.name).getByRole("button", { name: "Remove exercise" }).click();
  await expect(planner.card(dumbbellBench.name)).toBeHidden();

  await shell.goTo("Today");
  await expect(today.row(dumbbellBench.name)).toContainText("1 set");
  await expect(today.stat("Lifted today")).toContainText("160");
  await expect(today.stat("This week")).toContainText("1");
  await expect(today.screen).toContainText("Up next · Set 1 of 2");
  await expect(shell.ring).toHaveAccessibleName("0 of 2 sets done today");
});

test("a custom exercise deleted from the library keeps the sets logged of it", async ({ app }) => {
  const { today, logger, library, confirm } = app;

  await today.logSomethingElse.click();
  await library.createCustom("Desk Dips", "Triceps");
  await library.add("Desk Dips");
  await logger.log({ reps: 12 });
  await logger.done();
  await expect(today.row("Desk Dips")).toContainText("1 set");

  await today.logSomethingElse.click();
  await library.search.fill("Desk Dips");
  await library.button("Delete custom exercise").click();

  await test.step("deleting asks first, and Cancel deletes nothing", async () => {
    await expect(confirm.dialog).toHaveAccessibleName("Delete Desk Dips?");
    await confirm.cancel();
    await expect(library.row("Desk Dips")).toBeVisible();
  });

  await library.button("Delete custom exercise").click();
  await confirm.accept("Delete exercise");
  await expect(library.row("Desk Dips")).toBeHidden();
  await library.close();
  await expect(today.row("Desk Dips")).toContainText("1 set");
  await expect(today.stat("This week")).toContainText("2");
});

test("a custom exercise needs a name and a primary muscle before it can be created", async ({
  app,
}) => {
  const { today, library } = app;
  await today.logSomethingElse.click();
  await library.button("Create custom exercise").click();
  const muscles = library.dialog.getByRole("region", { name: "Primary muscles" });

  await expect(library.button("Create")).toBeDisabled();
  await muscles.getByRole("button", { name: "Triceps" }).click();
  await expect(library.button("Create")).toBeDisabled();
  await library.dialog.getByRole("textbox", { name: "Exercise name" }).fill("Desk Dips");
  await expect(library.button("Create")).toBeEnabled();
  await muscles.getByRole("button", { name: "Triceps" }).click();
  await expect(library.button("Create")).toBeDisabled();
});

test("the logger never outlives its exercise: deleted under it, it moves on", async ({ app }) => {
  const { shell, today, logger, library, confirm } = app;

  await today.logSomethingElse.click();
  await library.createCustom("Desk Dips", "Triceps");
  await library.add("Desk Dips");
  await expect(logger.exercise).toHaveText("Desk Dips");

  await logger.button("+ Something else").click();
  await library.search.fill("Desk Dips");
  await library.button("Delete custom exercise").click();
  await confirm.accept("Delete exercise");
  await library.close();

  // The logger is still there, on the exercise that owes the next set.
  await expect(logger.exercise).toHaveText(dumbbellBench.name);
  await expect(logger.listRow("Desk Dips")).toBeHidden();
  await logger.done();
  // With the logger closed, nudging goes on as before.
  await app.busyFor(50);
  await expect(shell.toast).toContainText("Interval's up");
});

test("reordering floating days leaves today on the day it is on", async ({ app }) => {
  const { shell, today, planner } = app;

  await shell.goTo("Plan");
  await planner.dayCard("Push").click();
  await expect(planner.screen).toContainText("Day 1 · floating");
  await planner.button("Move later").first().click();
  await expect(planner.screen).toContainText("Day 2 · floating");
  await expect(planner.dayCard("Legs")).toContainText("Day 1");

  await shell.goTo("Today");
  await expect(today.row(dumbbellBench.name)).toContainText("1/2 sets");
  await expect(today.row(gobletSquat.name)).toBeHidden();
});

test("moving the day the editor opened on keeps the editor on that day", async ({ app }) => {
  const { shell, planner } = app;

  await shell.goTo("Plan");
  await expect(planner.dayName).toHaveValue("Push");
  await planner.button("Move later").first().click();
  await expect(planner.dayCard("Push")).toContainText("Day 2");
  await expect(planner.dayName).toHaveValue("Push");
});

test("the planner opens on today's day; a new day is opened, a deleted one gives way to its neighbour", async ({
  app,
}) => {
  const { shell, planner, confirm } = app;

  await shell.goTo("Plan");
  await planner.dayCard("Legs").click();
  await expect(planner.dayName).toHaveValue("Legs");

  await test.step("coming back to the planner, it is on today's day again", async () => {
    await shell.goTo("Today");
    await shell.goTo("Plan");
    await expect(planner.dayName).toHaveValue("Push");
  });

  await test.step("a day that is added is the day being edited", async () => {
    await planner.button("Add day").click();
    await expect(planner.dayName).toHaveValue("New day");
    await expect(planner.screen).toContainText("Day 3 · floating");
  });

  await test.step("deleting a day asks first; Cancel keeps it", async () => {
    await planner.button("Delete day").click();
    await expect(confirm.dialog).toHaveAccessibleName("Delete New day?");
    await confirm.cancel();
    await expect(planner.dayCard("New day")).toBeVisible();
  });

  await test.step("once deleted, the editor is on the day beside it", async () => {
    await planner.button("Delete day").click();
    await confirm.accept("Delete day");
    await expect(planner.dayCard("New day")).toBeHidden();
    await expect(planner.dayName).toHaveValue("Legs");
  });
});
