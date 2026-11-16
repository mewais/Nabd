import { APPDATA_VERSION } from "@nabd/domain";
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

  await test.step("pounds: the usual 2.5 kg step becomes the usual 5 lb step", async () => {
    await settings.option("Weight unit", "lb").click();
    await expect(settings.row("Weight increment").getByRole("group")).toHaveText("5 lb");
    await expect(today.screen).toContainText("Try 9 × 44.1 lb or 8 × 49.1 lb");
    await expect(today.screen).toContainText("Last time: 8 × 44.1 lb");
    await expect(today.stat("Lifted today")).toContainText("lb");
  });

  await test.step("back to kilograms, in smaller steps", async () => {
    await settings.option("Weight unit", "kg").click();
    await expect(settings.row("Weight increment").getByRole("group")).toHaveText("2.5 kg");
    await step(settings.row("Weight increment"), "decrease", 2);
    await expect(settings.row("Weight increment").getByRole("group")).toHaveText("2 kg");
    await expect(today.screen).toContainText("Try 9 × 20 kg or 8 × 22 kg");
    await step(settings.row("Weight increment"), "decrease", 8);
    await expect(settings.row("Weight increment").getByRole("group")).toHaveText("0.25 kg");
  });

  await test.step("an increment of the user's own keeps its number across units", async () => {
    await settings.option("Weight unit", "lb").click();
    await expect(settings.row("Weight increment").getByRole("group")).toHaveText("0.25 lb");
  });

  await test.step("the logger steps the load by the increment, in the chosen unit", async () => {
    await settings.close();
    await today.startSet.click();
    await expect(logger.weight).toHaveAccessibleName("Weight (lb)");
    await expect(logger.weight).toHaveValue("44.09");
    await step(logger.weightStepper, "increase");
    await expect(logger.weight).toHaveValue("44.34");
  });
});

test("fine increments are shown exactly, in the form, the advice and the log", async ({ app }) => {
  const { today, logger } = app;
  const settings = { weightIncrement: 1.25 };
  await app.launch(at("10:00"), { program, history, settings });

  await expect(today.screen).toContainText("Try 9 × 20 kg or 8 × 21.25 kg");
  await today.startSet.click();
  await step(logger.weightStepper, "increase");
  await expect(logger.weight).toHaveValue("21.25");
  await step(logger.weightStepper, "increase");
  await expect(logger.weight).toHaveValue("22.5");
  await step(logger.weightStepper, "increase");
  await expect(logger.weight).toHaveValue("23.75");
  await logger.log();
  await expect(logger.loggedSets).toHaveText([/8 × 23.75 kg/]);
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

test("one-sided variants are offered only where one side can do the movement", async ({ app }) => {
  const { today, library } = app;
  await app.launch(at("10:00"), { program });
  await today.logSomethingElse.click();

  await library.search.fill("overhead press");
  await expect(library.row("Barbell Overhead Press")).toBeVisible();
  await expect(library.row("Single-Arm Dumbbell Overhead Press")).toBeVisible();
  // A bar held in both hands, or running on rails, is not pressed with one arm.
  await expect(library.row("Single-Arm Barbell Overhead Press")).toBeHidden();
  await expect(library.row("Single-Arm Smith Machine Overhead Press")).toBeHidden();

  await library.search.fill("single-arm ez-bar");
  await expect(library.dialog).toContainText("No exercises match");
  // One leg under a barbell is another matter.
  await library.search.fill("single-leg barbell");
  await expect(library.row("Single-Leg Barbell Calf Raise")).toBeVisible();
});

test("Start minimized is not offered where there is no tray to start in", async ({ app }) => {
  const { shell, settings } = app;
  // A browser has no tray, like a desktop that shows no tray icons.
  await app.launch(at("10:00"), { program });
  await shell.button("Settings").click();

  const minimized = settings.row("Start minimized");
  await expect(minimized.getByRole("switch")).toBeDisabled();
  await expect(minimized).toContainText("shows no tray icons");
  await expect(settings.row("Open at startup").getByRole("switch")).toBeEnabled();
});

test("stored settings are read field by field, an early build's theme included", async ({
  app,
}) => {
  const { shell, settings } = app;
  // "translucent" was a theme of its own in early builds; 2 minutes is no valid interval.
  const stored = { theme: "translucent", interval: 2, minGap: 10 };
  await app.launch(at("10:00"), { program, settings: stored });

  await test.step("what is valid is kept, what is not falls back to its default, and the app says so", async () => {
    await expect(shell.root).toHaveAttribute("data-theme", "dark");
    await expect(shell.root).toHaveAttribute("data-glass", "on");
    await expect(shell.notice).toHaveText(
      /These settings could not be read and are back at their defaults: interval\./,
    );
    await shell.button("Settings").click();
    await expect(settings.row("Interval")).toContainText("50 min");
    await expect(settings.row("Minimum gap")).toContainText("10 min");
  });

  await test.step("settings go on being changed and applied", async () => {
    await step(settings.row("Interval"), "decrease", 2);
    await expect(settings.row("Interval")).toContainText("40 min");
    await expect(shell.status).toContainText("Next nudge at 10:40");
  });
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

test("export says where the file went; import asks first, then reports what it did", async ({
  app,
}) => {
  const { shell, today, settings, confirm } = app;
  await app.launch(at("10:00"), { program });
  await shell.button("Settings").click();

  await test.step("export", async () => {
    await settings.exportData();
    await expect(settings.notice).toHaveText("Exported to memory (nothing is written)");
  });

  await test.step("a file that is not JSON, or not Nabd's, is refused with nothing to confirm", async () => {
    await settings.importData("not json");
    await expect(settings.notice).toHaveText("Could not import: This file is not valid JSON.");
    await expect(confirm.dialog).toBeHidden();
    await settings.importData("[]");
    await expect(settings.notice).toHaveText("Could not import: This file is not a Nabd export.");
  });

  await test.step("a file from a newer version", async () => {
    await settings.importData(JSON.stringify({ app: "Nabd", version: APPDATA_VERSION + 1 }));
    await expect(settings.notice).toHaveText(
      "Could not import: This file was exported by a newer version of Nabd. Update the app to import it.",
    );
    await expect(today.row(bench.name)).toBeVisible();
  });

  const imported = plan([day("Legs", [planned(squat.id)])]);
  // An export of the previous version: its prescribed sets go by their old field names.
  const file = JSON.stringify({
    app: "Nabd",
    version: 2,
    program: imported,
    settings: { interval: 30 },
  })
    .replaceAll('"amount":', '"a":')
    .replaceAll('"upTo":', '"b":');

  await test.step("a valid file is not applied until the user says so", async () => {
    await settings.importData(file);
    await expect(confirm.dialog).toHaveAccessibleName("Replace your data?");
    await expect(confirm.dialog).toContainText("A backup of what you have now is written");
    await confirm.cancel();
    await expect(today.row(bench.name)).toBeVisible();
    await expect(settings.row("Interval")).toContainText("50 min");
  });

  await test.step("confirmed, it replaces what it contains, after a backup of what was there", async () => {
    await settings.importData(file);
    await confirm.accept("Import");
    await expect(settings.notice).toHaveText(
      "Import complete. What it replaced was first saved to memory (nothing is written)",
    );
    await expect(settings.row("Interval")).toContainText("30 min");
    await expect(settings.row("Minimum gap")).toContainText("15 min");
    await settings.close();
    await expect(today.row(squat.name)).toContainText("0/2 sets");
    await expect(today.row(bench.name)).toBeHidden();
  });
});
