import type { SetSpec } from "@nabd/domain";
import { overlappingControls } from "../support/pages/controls";
import { EXERCISE, day, plan, planned, slot } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const { bench, squat, curl, hammerCurl } = EXERCISE;

/** The window's own minimum size (src-tauri/src/window.rs). */
const SMALLEST_WINDOW = { width: 980, height: 640 };

/** A warm-up and two working sets of 8–12, each at an intensity, the widest a set row gets. */
const sets = (intensity: number): SetSpec[] => [
  { type: "warmup", amount: 10, upTo: 12, intensity },
  { type: "working", amount: 8, upTo: 12, intensity },
  { type: "working", amount: 8, upTo: 12, intensity },
];

test.use({ viewport: SMALLEST_WINDOW });

test("at the window's smallest size, no control of the day editor covers another", async ({
  app,
}) => {
  const { shell, planner } = app;
  const fixed = plan([
    day("Push", [
      planned(bench.id, { intensity: "pct", sets: sets(72.5) }),
      planned(squat.id, { intensity: "rpe", sets: sets(8.5) }),
    ]),
  ]);
  await app.launch(at("10:00"), { program: fixed });
  await shell.goTo("Plan");
  const editor = planner.screen.getByRole("region", { name: "Day editor" });

  await test.step("a fixed day, with a %1RM and an RPE column", async () => {
    await expect(planner.stepper(bench.name, "Set 1 %1RM")).toContainText("72.5%");
    await expect(planner.stepper(squat.name, "Set 3 RPE")).toContainText("8.5");
    expect(await overlappingControls(editor)).toEqual([]);
  });

  await test.step("a cycled day, with its pools", async () => {
    await planner.option("Plan type", "Cycled").click();
    await planner.cardChoice("Chest", "%1RM").click();
    await expect(planner.stepper("Chest", "Set 1 %1RM")).toBeVisible();
    expect(await overlappingControls(editor)).toEqual([]);
  });
});

test("a cycled plan stored with intensities fits the smallest window too", async ({ app }) => {
  const { shell, planner } = app;
  const cycled = plan(
    [
      {
        ...day("Arms", []),
        slots: [{ ...slot("biceps", [curl.id, hammerCurl.id]), intensity: "rpe", sets: sets(9) }],
      },
    ],
    { type: "cycled" },
  );
  await app.launch(at("10:00"), { program: cycled });
  await shell.goTo("Plan");

  await expect(planner.stepper("Biceps", "Set 2 RPE")).toContainText("9");
  const editor = planner.screen.getByRole("region", { name: "Day editor" });
  expect(await overlappingControls(editor)).toEqual([]);
});
