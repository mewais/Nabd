import { EXERCISE, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, curl, squat } = EXERCISE;

const program = plan([
  day("Push", [planned(bench.id), planned(curl.id)]),
  day("Legs", [planned(squat.id)]),
]);

test.beforeEach(async ({ app }) => {
  const { today, logger } = app;
  await app.launch(at("10:00"), { program });
  await today.startSet.click();
  await logger.log({ reps: 8, weight: 20 });
  await logger.done();
  await expect(today.row(bench.name)).toContainText("1/2 sets");
});

test("switching the plan between fixed and cycled keeps today's sets", async ({ app }) => {
  const { shell, today, planner } = app;

  await shell.goTo("Plan");
  await planner.option("Plan type", "Cycled").click();
  await expect(planner.card("Chest")).toContainText(bench.name);
  await shell.goTo("Today");
  await expect(today.row(bench.name)).toContainText("1/2 sets");
  await expect(today.stat("Lifted today")).toContainText("160");

  await shell.goTo("Plan");
  await planner.option("Plan type", "Fixed").click();
  await expect(planner.card(bench.name)).toBeVisible();
  await shell.goTo("Today");
  await expect(today.row(bench.name)).toContainText("1/2 sets");
  await expect(shell.ring).toHaveAccessibleName("1 of 4 sets done today");
});

test("deleting an exercise that has sets today keeps them listed and counted", async ({ app }) => {
  const { shell, today, planner } = app;

  await shell.goTo("Plan");
  await planner.card(bench.name).getByRole("button", { name: "Remove exercise" }).click();
  await expect(planner.card(bench.name)).toBeHidden();

  await shell.goTo("Today");
  await expect(today.row(bench.name)).toContainText("1 set");
  await expect(today.stat("Lifted today")).toContainText("160");
  await expect(today.stat("This week")).toContainText("1");
  await expect(today.screen).toContainText("Up next · Set 1 of 2");
  await expect(shell.ring).toHaveAccessibleName("0 of 2 sets done today");
});

test("a custom exercise deleted from the library keeps the sets logged of it", async ({ app }) => {
  const { today, logger, library } = app;

  await today.logSomethingElse.click();
  await library.createCustom("Desk Dips", "Triceps");
  await library.add("Desk Dips");
  await logger.log({ reps: 12 });
  await logger.done();
  await expect(today.row("Desk Dips")).toContainText("1 set");

  await today.logSomethingElse.click();
  await library.search.fill("Desk Dips");
  await library.button("Delete custom exercise").click();
  await expect(library.row("Desk Dips")).toBeHidden();
  await library.close();
  await expect(today.row("Desk Dips")).toContainText("1 set");
  await expect(today.stat("This week")).toContainText("2");
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
  await expect(today.row(bench.name)).toContainText("1/2 sets");
  await expect(today.row(squat.name)).toBeHidden();
});

test("moving the day the editor opened on keeps the editor on that day", async ({ app }) => {
  test.fail(
    true,
    "with no day picked on the board the editor shows whichever day is first, so it jumps to the other day",
  );
  const { shell, planner } = app;

  await shell.goTo("Plan");
  await expect(planner.dayName).toHaveValue("Push");
  await planner.button("Move later").first().click();
  await expect(planner.dayCard("Push")).toContainText("Day 2");
  await expect(planner.dayName).toHaveValue("Push");
});
