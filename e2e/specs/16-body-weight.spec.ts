import type { SetSpec } from "@nabd/domain";
import { EXERCISE, day, loggedSet, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { pullUp } = EXERCISE;

/** A working set of 8–12 reps at RPE 8. */
const atRpe8: SetSpec = { type: "working", amount: 8, upTo: 12, intensity: 8 };

/** Weighted pull-ups at RPE 8; last Friday they went 10 reps with 10 kg added. */
const stored = {
  program: plan([day("Pull", [planned(pullUp.id, { intensity: "rpe", sets: [atRpe8, atRpe8] })])]),
  history: [loggedSet(pullUp.id, { day: dayAfter(MONDAY, -3), reps: 10, kg: 10 })],
};

test("a bodyweight exercise follows an RPE once the body weight is known", async ({ app }) => {
  const { shell, today, settings } = app;
  await app.launch(at("10:00"), stored);

  await test.step("without the body weight, the added load means nothing to an RPE", async () => {
    await expect(today.screen).toContainText("Try 11 + 10 kg");
    await expect(today.screen).toContainText(
      "Inside your range — beat last time. Set your body weight in Settings to use RPE here.",
    );
  });

  await test.step("the body weight is a setting, empty until given, in the user's unit", async () => {
    await shell.button("Settings").click();
    const field = settings.row("Body weight").getByRole("textbox", { name: "Body weight" });
    await expect(field).toHaveValue("");
    await expect(settings.row("Body weight")).toContainText("In kg.");
    await field.fill("80");
    await settings.close();
  });

  await test.step("body and load together are what the RPE works from", async () => {
    // 80 + 10 kg for 10 reps is a max of 120 kg; RPE 8 for 8 reps is 90 kg in all: 10 kg added.
    await expect(today.screen).toContainText("Try 8 + 10 kg or 11 + 10 kg");
    await expect(today.screen).toContainText("RPE 8 ≈ 2 reps in reserve.");
  });

  await test.step("emptied again, it is forgotten", async () => {
    await shell.button("Settings").click();
    await settings.row("Body weight").getByRole("textbox", { name: "Body weight" }).fill("");
    await settings.close();
    await expect(today.screen).toContainText("Set your body weight in Settings to use RPE here.");
  });
});
