import { step } from "../support/pages/controls";
import { EXERCISE } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, raise, curl, pullUp } = EXERCISE;

test("a first run goes from no plan to a queue on Today, built in the planner", async ({ app }) => {
  const { shell, today, planner, library } = app;
  await app.launch(at("10:00"));

  await test.step("with nothing stored, Today says there is no plan", async () => {
    await expect(today.screen).toContainText("No plan yet");
    await expect(today.startSet).toBeHidden();
    await expect(shell.status).toContainText("Nothing left today");
    await expect(shell.ring).toHaveAccessibleName("0 of 0 sets done today");
    // With no plan there is no muscle to push: the coverage list tags none.
    await expect(today.screen.getByText("Push", { exact: true })).toHaveCount(0);
  });

  await shell.goTo("Plan");

  await test.step("add Monday's day and name it", async () => {
    await planner.button("Add a day on Monday").click();
    await planner.dayName.fill("Push");
    await expect(planner.dayCard("Push")).toHaveAttribute("aria-pressed", "true");
  });

  await test.step("add an exercise found with the search box and the group filter", async () => {
    await planner.addExercise.click();
    await expect(library.dialog).toHaveAccessibleName("Add Exercise");
    await library.search.fill("press");
    await expect(library.row(bench.name)).toBeVisible();
    await expect(library.row("Dumbbell Overhead Press")).toBeVisible();
    await library.group("Chest").click();
    await expect(library.row("Dumbbell Overhead Press")).toBeHidden();
    await library.row(bench.name).click();
    await expect(library.dialog).toBeHidden();
    await expect(planner.card(bench.name)).toContainText("DUMBBELLS");
  });

  await test.step("edit its sets, reps and rest, and give it a warm-up", async () => {
    await step(planner.stepper(bench.name, "Set 1 reps"), "decrease", 2);
    await step(planner.stepper(bench.name, "Set 1 top of range"), "decrease", 2);
    await expect(planner.stepper(bench.name, "Set 1 reps")).toContainText("6");
    await expect(planner.stepper(bench.name, "Set 1 top of range")).toContainText("10");
    await step(planner.stepper(bench.name, "Rest"), "increase");
    await expect(planner.stepper(bench.name, "Rest")).toContainText("2:15");
    await planner.card(bench.name).getByRole("button", { name: "+ Add set" }).click();
    await planner.card(bench.name).getByRole("button", { name: "+ Warmup" }).click();
    await expect(planner.card(bench.name).getByTitle("Warm-up — click to change")).toHaveText("W");
    await expect(planner.screen).toContainText("1 exercise · 5 sets");
  });

  await test.step("add two more exercises and link them into a superset", async () => {
    await planner.addExercise.click();
    // The library opens afresh each time: nothing is left of the last search or filter.
    await expect(library.search).toHaveValue("");
    await expect(library.group("All")).toHaveAttribute("aria-pressed", "true");
    await library.add(raise.name);
    await planner.addExercise.click();
    await library.add(curl.name);
    await planner.card(raise.name).getByRole("button", { name: "Superset ↓" }).click();
    await expect(planner.card(raise.name)).toContainText("A1");
    await expect(planner.card(curl.name)).toContainText("A2");
    await expect(planner.screen).toContainText("3 exercises · 11 sets");
  });

  await test.step("add a second day", async () => {
    await planner.button("Add a day on Tuesday").click();
    // The new day is the one the editor now shows.
    await expect(planner.dayCard("New day")).toHaveAttribute("aria-pressed", "true");
    await planner.dayName.fill("Pull");
    await planner.addExercise.click();
    await library.group("Back").click();
    await library.add(pullUp.name, "pull-up");
    await expect(planner.dayCard("Pull")).toContainText(pullUp.name);
    await expect(planner.dayCard("Push")).toContainText(bench.name);
  });

  await shell.goTo("Today");
  await app.tick();

  await test.step("Today shows Monday's queue straight away", async () => {
    await expect(today.screen).toContainText("Up next · Set 1 of 5");
    await expect(today.screen).toContainText("Warm-up · 6–10 reps");
    await expect(today.row(bench.name)).toContainText("0/5 sets");
    await expect(today.row(raise.name)).toContainText("A1");
    await expect(today.row(curl.name)).toContainText("A2");
    await expect(today.row(pullUp.name)).toBeHidden();
    await expect(shell.ring).toHaveAccessibleName("0 of 11 sets done today");
    await expect(shell.status).toContainText("Next nudge at 10:50");
  });
});

test("the plan getting its first work mid-morning does not count as an interval already up", async ({
  app,
}) => {
  const { shell, planner, library } = app;
  await app.launch(at("10:00"));
  await shell.goTo("Plan");
  await planner.button("Add a day on Monday").click();
  await planner.addExercise.click();
  await library.add(bench.name);
  await expect(planner.card(bench.name)).toBeVisible();

  await expect(shell.toast).toBeHidden();
  await expect(shell.status).toContainText("Next nudge at 10:50");
});
