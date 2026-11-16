# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-plan-edits.spec.ts >> reordering floating days leaves today on the day it is on
- Location: e2e/specs/06-plan-edits.spec.ts:54:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('main')
Expected substring: "Day 2 · floating"
Received string:    "ProgramFixedCycledWeekdaysFloatingDay 1LegsDumbbell Goblet SquatDay 2PushDumbbell Bench PressDumbbell CurlAdd dayDay 1 · floating1 exercise · 2 setsDelete dayDumbbell Goblet SquatQuads, GlutesDUMBBELLSSetReps1−8+–−12+2−8+–−12+RepsRangeFixedTimeLoadNoneRPE%1RMRest−1:30++ Add set+ WarmupSuperset ↓+ Add exerciseWeekly coverageSets per muscle across the planfrontChest · 13%Obliques · 0%Abs · 0%Biceps · 13%Triceps · 6%Neck · 0%Upper Traps, Lower Traps · 0%Front Delts, Side Delts, Rear Delts · 2%Adductors · 0%Quads, Hip Flexors · 6%Tibialis · 0%Calves · 0%Forearms · 0%backNeck · 0%Upper Traps, Lower Traps · 0%Front Delts, Side Delts, Rear Delts · 2%Rhomboids, Lats · 0%Triceps · 6%Lower Back · 0%Forearms · 0%Glutes, Abductors · 3%Adductors · 0%Hamstrings · 0%Calves · 0%Quads2 setsChest2 setsBiceps2 setsGlutes1 setFront Delts1 setTriceps1 set"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('main') with timeout 5000ms
  - waiting for getByRole('main')
    14 × locator resolved to <main>…</main>
       - unexpected value "ProgramFixedCycledWeekdaysFloatingDay 1LegsDumbbell Goblet SquatDay 2PushDumbbell Bench PressDumbbell CurlAdd dayDay 1 · floating1 exercise · 2 setsDelete dayDumbbell Goblet SquatQuads, GlutesDUMBBELLSSetReps1−8+–−12+2−8+–−12+RepsRangeFixedTimeLoadNoneRPE%1RMRest−1:30++ Add set+ WarmupSuperset ↓+ Add exerciseWeekly coverageSets per muscle across the planfrontChest · 13%Obliques · 0%Abs · 0%Biceps · 13%Triceps · 6%Neck · 0%Upper Traps, Lower Traps · 0%Front Delts, Side Delts, Rear Delts · 2%Adductors · 0%Quads, Hip Flexors · 6%Tibialis · 0%Calves · 0%Forearms · 0%backNeck · 0%Upper Traps, Lower Traps · 0%Front Delts, Side Delts, Rear Delts · 2%Rhomboids, Lats · 0%Triceps · 6%Lower Back · 0%Forearms · 0%Glutes, Abductors · 3%Adductors · 0%Hamstrings · 0%Calves · 0%Quads2 setsChest2 setsBiceps2 setsGlutes1 setFront Delts1 setTriceps1 set"

```

```yaml
- main:
  - text: Program
  - textbox "Program name": Desk plan
  - group "Plan type":
    - button "Fixed" [pressed]
    - button "Cycled"
  - group "Schedule":
    - button "Weekdays"
    - button "Floating" [pressed]
  - button "Day 1 Legs Dumbbell Goblet Squat" [pressed]
  - button "Day 2 Push Dumbbell Bench Press Dumbbell Curl"
  - button "Add day"
  - textbox "Day name": Legs
  - text: Day 1 · floating
  - button "Move earlier"
  - button "Move later"
  - text: 1 exercise · 2 sets
  - button "Delete day"
  - region "Dumbbell Goblet Squat":
    - text: Dumbbell Goblet Squat Quads, Glutes DUMBBELLS
    - button "Move earlier"
    - button "Move later"
    - button "Remove exercise"
    - text: Set Reps
    - button "1"
    - group "Set 1 reps":
      - button "decrease": −
      - text: "8"
      - button "increase": +
    - text: –
    - group "Set 1 top of range":
      - button "decrease": −
      - text: "12"
      - button "increase": +
    - button "Remove set 1"
    - button "2"
    - group "Set 2 reps":
      - button "decrease": −
      - text: "8"
      - button "increase": +
    - text: –
    - group "Set 2 top of range":
      - button "decrease": −
      - text: "12"
      - button "increase": +
    - button "Remove set 2"
    - text: Reps
    - group "Rep mode":
      - button "Range" [pressed]
      - button "Fixed"
      - button "Time"
    - text: Load
    - group "Load mode":
      - button "None" [pressed]
      - button "RPE"
      - button "%1RM"
    - text: Rest
    - group "Rest":
      - button "decrease": −
      - text: 1:30
      - button "increase": +
    - button "+ Add set"
    - button "+ Warmup"
    - textbox "Note":
      - /placeholder: Add a note (cues, setup, tempo…)
    - button "Superset ↓"
  - button "+ Add exercise"
  - text: Weekly coverage Sets per muscle across the plan front
  - img "Body, front"
  - text: back
  - img "Body, back"
  - text: Quads
  - meter "Quads"
  - text: 2 sets Chest
  - meter "Chest"
  - text: 2 sets Biceps
  - meter "Biceps"
  - text: 2 sets Glutes
  - meter "Glutes"
  - text: 1 set Front Delts
  - meter "Front Delts"
  - text: 1 set Triceps
  - meter "Triceps"
  - text: 1 set
```

# Test source

```ts
  1  | import { EXERCISE, day, floatingProgram, planned } from "../support/data";
  2  | import { expect, test } from "../support/fixtures";
  3  | import { at } from "../support/time";
  4  | 
  5  | const { bench, curl, squat } = EXERCISE;
  6  | 
  7  | const program = floatingProgram([
  8  |   day("Push", [planned(bench.id), planned(curl.id)]),
  9  |   day("Legs", [planned(squat.id)]),
  10 | ]);
  11 | 
  12 | test.beforeEach(async ({ app }) => {
  13 |   const { today, logger } = app;
  14 |   await app.launch(at("10:00"), { program });
  15 |   await today.startSet.click();
  16 |   await logger.log({ reps: 8, weight: 20 });
  17 |   await logger.done();
  18 |   await expect(today.row(bench.name)).toContainText("1/2 sets");
  19 | });
  20 | 
  21 | test("switching the plan between fixed and cycled keeps today's sets", async ({ app }) => {
  22 |   const { shell, today, planner } = app;
  23 | 
  24 |   await shell.goTo("Plan");
  25 |   await planner.option("Plan type", "Cycled").click();
  26 |   await expect(planner.card("Chest")).toContainText(bench.name);
  27 |   await shell.goTo("Today");
  28 |   await expect(today.row(bench.name)).toContainText("1/2 sets");
  29 |   await expect(today.stat("Lifted today")).toContainText("160");
  30 | 
  31 |   await shell.goTo("Plan");
  32 |   await planner.option("Plan type", "Fixed").click();
  33 |   await expect(planner.card(bench.name)).toBeVisible();
  34 |   await shell.goTo("Today");
  35 |   await expect(today.row(bench.name)).toContainText("1/2 sets");
  36 |   await expect(shell.ring).toHaveAccessibleName("1 of 4 sets done today");
  37 | });
  38 | 
  39 | test("deleting an exercise that has sets today keeps them listed and counted", async ({ app }) => {
  40 |   const { shell, today, planner } = app;
  41 | 
  42 |   await shell.goTo("Plan");
  43 |   await planner.card(bench.name).getByRole("button", { name: "Remove exercise" }).click();
  44 |   await expect(planner.card(bench.name)).toBeHidden();
  45 | 
  46 |   await shell.goTo("Today");
  47 |   await expect(today.row(bench.name)).toContainText("1 set");
  48 |   await expect(today.stat("Lifted today")).toContainText("160");
  49 |   await expect(today.stat("This week")).toContainText("1");
  50 |   await expect(today.screen).toContainText("Up next · Set 1 of 2");
  51 |   await expect(shell.ring).toHaveAccessibleName("0 of 2 sets done today");
  52 | });
  53 | 
  54 | test("reordering floating days leaves today on the day it is on", async ({ app }) => {
  55 |   const { shell, today, planner } = app;
  56 | 
  57 |   await shell.goTo("Plan");
  58 |   await expect(planner.screen).toContainText("Day 1 · floating");
  59 |   await planner.button("Move later").first().click();
> 60 |   await expect(planner.screen).toContainText("Day 2 · floating");
     |                                ^ Error: expect(locator).toContainText(expected) failed
  61 |   await expect(planner.dayCard("Legs")).toContainText("Day 1");
  62 | 
  63 |   await shell.goTo("Today");
  64 |   await expect(today.row(bench.name)).toContainText("1/2 sets");
  65 |   await expect(today.row(squat.name)).toBeHidden();
  66 | });
  67 | 
```