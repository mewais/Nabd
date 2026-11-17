// The pictures the README shows (`pnpm screenshots`, see playwright.config.ts
// beside this file): a Push / Pull / Legs plan two and a half weeks in, on a
// Thursday late in the morning with the day's first sets logged.

import type { Day, DayRecord, ExercisePrescription, LoggedSet, Trigger } from "@nabd/domain";
import { dayRecord, warmup, working } from "../../tests/support/builders";
import { day, loggedSet, plan, planned } from "../support/data";
import { test } from "../support/fixtures";
import type { App } from "../support/app";
import { MONDAY, at, dayAfter } from "../support/time";
import { README_SHOTS, THEMES, settingsOf, shooterInto } from "./shooting";
import type { ThemeName } from "./shooting";

/** Three sets of `lo`–`hi`. */
const three = (lo: number, hi: number) => [working(lo, hi), working(lo, hi), working(lo, hi)];

/** The day's main lift: a warm-up, then three sets at RPE 8 with a long rest. */
const mainLift = (exId: string, lo: number, hi: number): ExercisePrescription =>
  planned(exId, {
    intensity: "rpe",
    rest: 150,
    sets: [warmup(hi + 2), working(lo, hi, 8), working(lo, hi, 8), working(lo, hi, 8)],
  });

const PROGRAM = plan(
  [
    day("Push", [
      mainLift("bench_press__barbell", 8, 10),
      planned("incline_bench_press__dumbbell", { sets: three(10, 12) }),
      planned("fly__dumbbell", { sets: three(12, 15), supersetId: "push" }),
      planned("lateral_raise__dumbbell", { sets: three(15, 20), supersetId: "push" }),
      planned("overhead_triceps_extension__dumbbell", { sets: three(12, 15) }),
    ]),
    day("Pull", [
      planned("pull_up__pullupbar", { sets: three(6, 8), rest: 150 }),
      planned("row__barbell", { sets: three(8, 10) }),
      planned("row__dumbbell", { sets: three(10, 12) }),
      planned("hammer_curl__dumbbell", { sets: three(10, 12), supersetId: "pull" }),
      planned("curl__barbell", { sets: three(10, 12), supersetId: "pull" }),
    ]),
    day("Legs", [
      mainLift("back_squat__barbell", 6, 8),
      planned("romanian_deadlift__barbell", { sets: three(8, 10) }),
      planned("walking_lunge__dumbbell", { sets: three(10, 12) }),
      planned("calf_raise__dumbbell", { sets: three(12, 15), rest: 60 }),
      planned("plank__bodyweight", {
        repMode: "fixed",
        sets: [working(45), working(45), working(45)],
      }),
    ]),
  ],
  { name: "Push / Pull / Legs" },
);

/** Each exercise's working load on its first visit, and what each visit adds (kg; null: body weight). */
const LOAD: Record<string, [start: number | null, perVisit: number]> = {
  bench_press__barbell: [60, 2.5],
  incline_bench_press__dumbbell: [22, 1],
  fly__dumbbell: [12, 0.5],
  lateral_raise__dumbbell: [8, 0.5],
  overhead_triceps_extension__dumbbell: [16, 1],
  pull_up__pullupbar: [null, 0],
  row__barbell: [50, 2.5],
  row__dumbbell: [26, 1],
  hammer_curl__dumbbell: [14, 0.5],
  curl__barbell: [25, 1.25],
  back_squat__barbell: [80, 2.5],
  romanian_deadlift__barbell: [70, 2.5],
  walking_lunge__dumbbell: [16, 1],
  calf_raise__dumbbell: [20, 1],
  plank__bodyweight: [null, 0],
};
const TRIGGERS: Trigger[] = ["timer", "idle", "timer", "idle", "manual"];

/** Today: Thursday, the day after the last day of history. */
const TODAY = dayAfter(MONDAY, 3);
/** Every workday from two Mondays before through yesterday, but the Friday that week (missed). */
const TRAINED = Array.from({ length: 17 }, (_, i) => dayAfter(MONDAY, i - 14)).filter(
  (date, i) => i % 7 < 5 && i !== 4,
);
/** The program day each date was on: the days come round in order. */
const dayOf = (index: number): Day => PROGRAM.days[index % PROGRAM.days.length]!;

/** "HH:MM" of the `n`th set of a day: one about every half hour from ten past nine, give or take. */
function timeOf(n: number, date: string): string {
  const minutes = 9 * 60 + 10 + n * 31 + ((n * 7 + Number(date.slice(-2))) % 9);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** The sets of a day's `visit`th visit, in order, cut short after `limit`. */
function setsOf(programDay: Day, visit: number, date: string, limit: number): LoggedSet[] {
  const sets: LoggedSet[] = [];
  for (const row of programDay.exercises) {
    const [start, perVisit] = LOAD[row.exId]!;
    const load = start === null ? null : start + perVisit * visit;
    row.sets.forEach((spec, position) => {
      if (sets.length >= limit) return;
      const n = sets.length;
      const top = spec.upTo ?? spec.amount;
      // Reps creep up the range from visit to visit, and tire a little within the visit.
      const reps =
        spec.type === "warmup"
          ? spec.amount
          : Math.max(spec.amount, Math.min(top, spec.amount + visit - (position > 1 ? 1 : 0)));
      const kg = load === null ? null : spec.type === "warmup" ? load / 2 : load;
      const trigger = TRIGGERS[n % TRIGGERS.length]!;
      const time = timeOf(n, date);
      sets.push(loggedSet(row.exId, { day: date, time, reps, kg, trigger, type: spec.type }));
    });
  }
  return sets;
}

const plannedSets = (programDay: Day): number =>
  programDay.exercises.reduce((sum, row) => sum + row.sets.length, 0);

const history: LoggedSet[] = [];
const dayLog: DayRecord[] = [];
TRAINED.forEach((date, i) => {
  const programDay = dayOf(i);
  // Now and then a busy day: the last few sets did not happen.
  const limit = i % 5 === 3 ? plannedSets(programDay) - 4 : Infinity;
  const sets = setsOf(programDay, Math.floor(i / PROGRAM.days.length), date, limit);
  history.push(...sets);
  dayLog.push(dayRecord(at("12:00", date), plannedSets(programDay), sets.length));
});
const todayDay = dayOf(TRAINED.length);
/** This morning: the main lift done, and the first set of the next exercise. */
history.push(...setsOf(todayDay, Math.floor(TRAINED.length / PROGRAM.days.length), TODAY, 5));

/** The app on the plan above, today at 11:52, in `theme`. */
async function launch(app: App, theme: ThemeName): Promise<void> {
  await app.launch(at("11:52", TODAY), {
    program: PROGRAM,
    history,
    dayLog,
    dayState: {
      date: TODAY,
      dayId: todayDay.id,
      carried: null,
      skipped: [],
      extras: [],
      paused: false,
    },
    settings: { ...settingsOf(theme), bodyWeight: 78 },
  });
}

for (const theme of THEMES) {
  test(`today ${theme}`, async ({ app, page }) => {
    await launch(app, theme);
    await shooterInto(page, README_SHOTS)(`today-${theme}`);
  });
}

test("nudge and session", async ({ app, page }) => {
  const shot = shooterInto(page, README_SHOTS);
  await launch(app, "dark");
  await app.idleFor(35);
  await shot("nudge");
  await app.shell.letsGo.click();
  await shot("session");
});

test("planner and progress", async ({ app, page }) => {
  const shot = shooterInto(page, README_SHOTS);
  await launch(app, "light");
  await app.shell.goTo("Plan");
  await shot("planner");
  await app.shell.goTo("Progress");
  // Down to the charts and the body map, past the figures at the top: the screen scrolled
  // until the "Time of day" card, with its padding, is at the top.
  await page.getByText("Time of day", { exact: true }).evaluate((title) => {
    title.scrollIntoView({ block: "start" });
    let scroller = title.parentElement;
    while (scroller && scroller.scrollTop === 0) scroller = scroller.parentElement;
    scroller?.scrollBy(0, -40);
  });
  await shot("progress");
});
