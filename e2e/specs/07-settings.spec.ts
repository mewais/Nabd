import { step } from "../support/pages/controls";
import { EXERCISE, day, plan, loggedSet, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { bench, barbellBench, squat } = EXERCISE;

const program = plan([day("Push", [planned(bench.id)])]);
/** Last session: 8 × 20 kg, inside the plan's 8–12. */
const history = [loggedSet(bench.id, { day: dayAfter(MONDAY, -3), reps: 8, kg: 20 })];

test("the workday window bounds the nudges, and cannot be turned inside out", async ({ app }) => {
  const { shell, settings } = app;
  await app.launch(at("08:00"), { program });
  await expect(shell.status).toContainText("Quiet until 09:00");
  await shell.button("Settings").click();

  await test.step("an earlier start opens the day; a shorter interval brings the nudge forward", async () => {
    await step(settings.row("Starts"), "decrease", 2);
    await expect(settings.row("Starts")).toContainText("08:00");
    await expect(shell.status).toContainText("Next nudge at 08:50");
    await step(settings.row("Interval"), "decrease", 2);
    await expect(settings.row("Interval")).toContainText("40 min");
    await expect(shell.status).toContainText("Next nudge at 08:40");
  });

  await test.step("the end stops half an hour after the start, and the start cannot pass it", async () => {
    await step(settings.row("Ends"), "decrease", 19);
    await expect(settings.row("Ends")).toContainText("08:30");
    await step(settings.row("Ends"), "decrease");
    await expect(settings.row("Ends")).toContainText("08:30");
    await step(settings.row("Starts"), "increase");
    await expect(settings.row("Starts")).toContainText("08:00");
  });

  await test.step("past the end of the workday the app is quiet until tomorrow's start", async () => {
    await settings.close();
    await app.idleFor(30);
    await expect(shell.status).toContainText("08:30");
    await expect(shell.status).toContainText("Quiet until 08:00");
    await expect(shell.toast).toBeHidden();
  });
});

test("the minimum gap and the idle moment decide when an idle nudge may come", async ({ app }) => {
  const { shell, settings } = app;
  await app.launch(at("10:00"), { program });
  await shell.button("Settings").click();

  await test.step("each setting stops at its lower bound", async () => {
    await step(settings.row("Minimum gap"), "decrease", 3);
    await expect(settings.row("Minimum gap")).toContainText("5 min");
    await step(settings.row("Idle moment"), "decrease", 6);
    await expect(settings.row("Idle moment")).toContainText("5 sec");
    await step(settings.row("Interval"), "decrease", 10);
    await expect(settings.row("Interval")).toContainText("5 min");
  });

  await test.step("5 min gap, 15 s idle: a busy user is left alone, an idle one is nudged", async () => {
    await step(settings.row("Interval"), "increase", 9);
    await step(settings.row("Idle moment"), "increase", 2);
    await expect(settings.row("Idle moment")).toContainText("15 sec");
    await settings.close();
    await app.idleFor(4);
    await expect(shell.toast).toBeHidden();
    await app.busyFor(2);
    await expect(shell.status).toContainText("10:06");
    await expect(shell.toast).toBeHidden();
    await app.idleFor(0.25);
    await expect(shell.toast).toContainText("You've gone quiet");
  });
});

test("the weight unit and increment re-render weights and reshape suggestions", async ({ app }) => {
  const { shell, today, logger, settings } = app;
  await app.launch(at("10:00"), { program, history });
  await expect(today.screen).toContainText("Try 9 × 20 kg or 8 × 22.5 kg");
  await shell.button("Settings").click();

  await test.step("pounds", async () => {
    await settings.option("Weight unit", "lb").click();
    await expect(settings.row("Weight increment")).toContainText("2.5 lb");
    await expect(today.screen).toContainText("Try 9 × 44.1 lb or 8 × 46.6 lb");
    await expect(today.screen).toContainText("Last time: 8 × 44.1 lb");
    await expect(today.stat("Lifted today")).toContainText("lb");
  });

  await test.step("back to kilograms, in smaller steps", async () => {
    await settings.option("Weight unit", "kg").click();
    await step(settings.row("Weight increment"), "decrease", 2);
    await expect(settings.row("Weight increment")).toContainText("2 kg");
    await expect(today.screen).toContainText("Try 9 × 20 kg or 8 × 22 kg");
    await step(settings.row("Weight increment"), "decrease", 8);
    await expect(settings.row("Weight increment")).toContainText("0.25 kg");
  });

  await test.step("the logger steps the load by the increment, in the chosen unit", async () => {
    await settings.option("Weight unit", "lb").click();
    await settings.close();
    await today.startSet.click();
    await expect(logger.weight).toHaveAccessibleName("Weight (lb)");
    await expect(logger.weight).toHaveValue("44.1");
    await step(logger.weightStepper, "increase");
    await expect(logger.weight).toHaveValue("44.3");
  });
});

test("the library only offers exercises for the equipment owned", async ({ app }) => {
  const { shell, today, library, settings } = app;
  await app.launch(at("10:00"), { program });

  await shell.button("Settings").click();
  await settings.option("My equipment", "Dumbbells").click();
  await expect(settings.option("My equipment", "Dumbbells")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await settings.close();

  await today.logSomethingElse.click();
  await library.search.fill("bench press");
  await expect(library.row(barbellBench.name)).toBeVisible();
  await expect(library.row(bench.name)).toBeHidden();
  // An exercise already in the plan stays there.
  await library.close();
  await expect(today.row(bench.name)).toBeVisible();
});

test("the theme can be switched from Settings and from the top bar", async ({ app }) => {
  const { shell, settings } = app;
  await app.launch(at("10:00"));
  await expect(shell.root).toHaveAttribute("data-theme", "dark");

  await shell.button("Settings").click();
  await settings.option("Theme", "Light").click();
  await expect(shell.root).toHaveAttribute("data-theme", "light");
  await settings.close();
  await expect(shell.button("Light")).toHaveAttribute("aria-pressed", "true");

  await shell.button("Dark").click();
  await expect(shell.root).toHaveAttribute("data-theme", "dark");
});

test("export says where the file went; import reports what it did", async ({ app }) => {
  const { shell, today, settings } = app;
  await app.launch(at("10:00"), { program });
  await shell.button("Settings").click();

  await test.step("export", async () => {
    await settings.exportData();
    await expect(settings.notice).toHaveText("Exported to memory (nothing is written)");
  });

  await test.step("a file that is not JSON, or not Nabd's", async () => {
    await settings.importData("not json");
    await expect(settings.notice).toHaveText("Import failed — This file is not valid JSON.");
    await settings.importData("[]");
    await expect(settings.notice).toHaveText("Import failed — This file is not a Nabd export.");
  });

  await test.step("a file from a newer version", async () => {
    await settings.importData(JSON.stringify({ app: "Nabd", version: 3 }));
    await expect(settings.notice).toHaveText(
      "Import failed — This file was exported by a newer version of Nabd. Update the app to import it.",
    );
    await expect(today.row(bench.name)).toBeVisible();
  });

  await test.step("a valid file replaces what it contains", async () => {
    const imported = plan([day("Legs", [planned(squat.id)])]);
    await settings.importData(
      JSON.stringify({ app: "Nabd", version: 2, program: imported, settings: { interval: 30 } }),
    );
    await expect(settings.notice).toHaveText("Import complete.");
    await expect(settings.row("Interval")).toContainText("30 min");
    await expect(settings.row("Minimum gap")).toContainText("15 min");
    await settings.close();
    await expect(today.row(squat.name)).toContainText("0/2 sets");
    await expect(today.row(bench.name)).toBeHidden();
  });
});
