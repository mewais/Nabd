import { step } from "../support/pages/controls";
import { exercise, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const dumbbellBench = exercise("dumbbellBench");
const raise = exercise("raise");
const curl = exercise("curl");
const gobletSquat = exercise("gobletSquat");
const plank = exercise("plank");
const pushUp = exercise("pushUp");

const TUESDAY = dayAfter(MONDAY);
const WEDNESDAY = dayAfter(MONDAY, 2);

test("seconds or reps is the exercise's doing, in a fixed plan and in a cycled pool", async ({
  app,
}) => {
  const { shell, today, planner, library } = app;
  await app.launch(at("10:00"));
  await shell.goTo("Plan");
  await planner.button("Add a day on Monday").click();
  await planner.addExercise.click();
  await library.add(dumbbellBench.name);
  await planner.addExercise.click();
  await library.add(plank.name);

  await test.step("an exercise counted in reps is written as a range or a fixed number, never as time", async () => {
    const repMode = planner.card(dumbbellBench.name).getByRole("radiogroup", { name: "Rep mode" });
    await expect(repMode.getByRole("radio")).toHaveText(["Range", "Fixed"]);
    await repMode.getByRole("radio", { name: "Fixed" }).click();
    await expect(planner.stepper(dumbbellBench.name, "Set 1 top of range")).toBeHidden();
  });

  await test.step("a hold is prescribed in seconds, with nothing to choose", async () => {
    await expect(
      planner.card(plank.name).getByRole("radiogroup", { name: "Rep mode" }),
    ).toBeHidden();
    await expect(planner.stepper(plank.name, "Set 1 seconds")).toContainText("45s");
  });

  await test.step("going cycled keeps the timed and the rep-counted exercises in pools of their own", async () => {
    await planner.option("Plan type", "Cycled").click();
    await expect(planner.card("Chest")).toContainText(dumbbellBench.name);
    await expect(planner.card("Abs")).toContainText(plank.name);
    await expect(planner.stepper("Abs", "Set 1 seconds")).toContainText("45s");
  });

  await test.step("a timed pool is only offered timed exercises", async () => {
    await planner.cardButton("Abs", "+ Add exercise").click();
    await expect(library.dialog).toHaveAccessibleName("Add to Pool — Abs");
    await expect(library.dialog).toContainText("only timed exercises are offered");
    await library.search.fill("push-up");
    await expect(library.row(pushUp.name)).toBeHidden();
    await library.search.fill("plank");
    await expect(library.row("Side Plank")).toBeVisible();
    await library.close();
  });

  await test.step("a pool counted in reps is offered none", async () => {
    await planner.cardButton("Chest", "+ Add exercise").click();
    await expect(library.dialog).toContainText("timed exercises are not offered");
    await library.search.fill("plank");
    await expect(library.row(plank.name)).toBeHidden();
    await library.search.fill("push-up");
    await expect(library.row(pushUp.name)).toBeVisible();
    await library.close();
  });

  await test.step("Today asks for what the logger then counts", async () => {
    await shell.goTo("Today");
    await expect(today.row(plank.name)).toBeVisible();
    await today.rowButton(plank.name, "Start").click();
    await expect(app.logger.dialog).toContainText("Working set · 45 s");
    await expect(app.logger.reps).toHaveAccessibleName("Sec");
  });
});

test("a stored plan that prescribes reps as time, or time as reps, is put right when it is read", async ({
  app,
}) => {
  const { today } = app;
  const stored = plan([
    day("Push", [
      planned(dumbbellBench.id, { repMode: "time", sets: [{ type: "working", amount: 45 }] }),
      planned(plank.id),
    ]),
  ]);
  await app.launch(at("10:00"), { program: stored });

  await expect(today.screen).toContainText("Working set · 8–12 reps");
  await today.rowButton(plank.name, "Start").click();
  await expect(app.logger.dialog).toContainText("Working set · 45 s");
});

test("a superset stays together when exercises are moved, and each superset has its own letter", async ({
  app,
}) => {
  const { shell, planner } = app;
  const program = plan([
    day("Push", [
      planned(dumbbellBench.id),
      planned(raise.id, { supersetId: "first" }),
      planned(curl.id, { supersetId: "first" }),
      planned(gobletSquat.id),
      planned(pushUp.id),
    ]),
  ]);
  await app.launch(at("10:00"), { program });
  await shell.goTo("Plan");
  const order = (names: string[]) =>
    Promise.all(
      names.map((name, position) =>
        expect(planner.cards().nth(position)).toHaveAccessibleName(name),
      ),
    );

  await test.step("an exercise on its own steps over the whole superset", async () => {
    await planner.cardButton(dumbbellBench.name, "Move later").click();
    await order([raise.name, curl.name, dumbbellBench.name, gobletSquat.name, pushUp.name]);
    await expect(planner.card(raise.name)).toContainText("A1");
    await expect(planner.card(curl.name)).toContainText("A2");
  });

  await test.step("a second superset of the day is B", async () => {
    await planner.cardButton(gobletSquat.name, "Superset ↓").click();
    await expect(planner.card(gobletSquat.name)).toContainText("B1");
    await expect(planner.card(pushUp.name)).toContainText("B2");
    await expect(planner.card(raise.name)).toContainText("A1");
  });

  await test.step("a member trades places with its partner", async () => {
    await planner.cardButton(raise.name, "Move later").click();
    await order([curl.name, raise.name, dumbbellBench.name, gobletSquat.name, pushUp.name]);
    await expect(planner.card(curl.name)).toContainText("A1");
    await expect(planner.card(raise.name)).toContainText("A2");
  });

  await test.step("a member moved out past the edge of its superset is unlinked, and no card is lost or doubled", async () => {
    await planner.cardButton(raise.name, "Move later").click();
    await order([curl.name, raise.name, dumbbellBench.name, gobletSquat.name, pushUp.name]);
    await expect(planner.cards()).toHaveCount(5);
    await expect(planner.cardButton(raise.name, "Superset ↓")).toBeVisible();
    await expect(planner.cardButton(curl.name, "Superset ↓")).toBeVisible();
    // The superset that is left is now the day's first.
    await expect(planner.card(gobletSquat.name)).toContainText("A1");
  });
});

test("switching the load mode starts from the new scale, not from the old numbers", async ({
  app,
}) => {
  const { shell, planner } = app;
  await app.launch(at("10:00"), { program: plan([day("Push", [planned(dumbbellBench.id)])]) });
  await shell.goTo("Plan");

  await planner.cardChoice(dumbbellBench.name, "RPE").click();
  await step(planner.stepper(dumbbellBench.name, "Set 1 RPE"), "increase", 4);
  await expect(planner.stepper(dumbbellBench.name, "Set 1 RPE")).toContainText("10");

  await planner.cardChoice(dumbbellBench.name, "%1RM").click();
  await expect(planner.stepper(dumbbellBench.name, "Set 1 %1RM")).toContainText("70%");
  await expect(planner.stepper(dumbbellBench.name, "Set 2 %1RM")).toContainText("70%");
});

test.describe("switching schedule keeps today on its day", () => {
  /** Push on Monday, Legs on Wednesday. */
  const weekdays = plan(
    [
      day("Push", [planned(dumbbellBench.id)], { weekday: 1 }),
      day("Legs", [planned(gobletSquat.id)], { weekday: 3 }),
    ],
    { schedule: "weekday" },
  );

  test("on a training day, with a set already logged", async ({ app }) => {
    const { shell, today, logger, planner } = app;
    await app.launch(at("10:00", WEDNESDAY), { program: weekdays });
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(today.row(gobletSquat.name)).toContainText("1/2 sets");

    await test.step("weekdays → floating: today is still Legs, and its set still counts", async () => {
      await shell.goTo("Plan");
      await planner.option("Schedule", "Floating").click();
      await expect(planner.dayCard("Legs")).toContainText("Day 2");
      await shell.goTo("Today");
      await expect(today.row(gobletSquat.name)).toContainText("1/2 sets");
      await expect(today.row(dumbbellBench.name)).toBeHidden();
      await expect(shell.ring).toHaveAccessibleName("1 of 2 sets done today");
    });

    await test.step("floating → weekdays: the day the plan is on is today's, the next one tomorrow's", async () => {
      await shell.goTo("Plan");
      await planner.option("Schedule", "Weekdays").click();
      await expect(planner.dayCard("Legs")).toContainText("Wed");
      await expect(planner.dayCard("Push")).toContainText("Thu");
      await shell.goTo("Today");
      await expect(today.row(gobletSquat.name)).toContainText("1/2 sets");
      await expect(today.row(dumbbellBench.name)).toBeHidden();
    });
  });

  test("on a rest day, a floating plan starts from the first day of the week", async ({ app }) => {
    const { shell, today, planner } = app;
    await app.launch(at("10:00", TUESDAY), { program: weekdays });
    await expect(today.screen).toContainText("Rest day");

    await shell.goTo("Plan");
    await planner.option("Schedule", "Floating").click();
    await shell.goTo("Today");
    await expect(today.row(dumbbellBench.name)).toContainText("0/2 sets");
    // The plan only just got work: nothing is due for the morning that went before.
    await expect(shell.toast).toBeHidden();
    await expect(shell.status).toContainText("Next nudge at 10:50");
  });
});

test("reordering floating days moves an untouched day's place to the day now there", async ({
  app,
}) => {
  const { shell, today, logger, planner } = app;
  const program = plan([
    day("Push", [planned(dumbbellBench.id)]),
    day("Legs", [planned(gobletSquat.id)]),
  ]);
  await app.launch(at("10:00"), { program });
  await expect(today.row(dumbbellBench.name)).toContainText("0/2 sets");

  await test.step("nothing logged yet: today is the day that is now first", async () => {
    await shell.goTo("Plan");
    await planner.button("Move later").first().click();
    await expect(planner.dayCard("Legs")).toContainText("Day 1");
    await shell.goTo("Today");
    await expect(today.row(gobletSquat.name)).toContainText("0/2 sets");
    await expect(today.row(dumbbellBench.name)).toBeHidden();
  });

  await test.step("once a set is logged, the day stays today wherever it moves", async () => {
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await shell.goTo("Plan");
    await planner.dayCard("Legs").click();
    await planner.button("Move later").first().click();
    await expect(planner.dayCard("Legs")).toContainText("Day 2");
    await shell.goTo("Today");
    await expect(today.row(gobletSquat.name)).toContainText("1/2 sets");
    await expect(today.row(dumbbellBench.name)).toBeHidden();
  });
});
