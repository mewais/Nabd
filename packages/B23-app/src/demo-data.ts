// What the browser demo starts with: a small Push / Pull / Legs plan and two
// weeks of made-up history, so every screen has something to show.

import type { Day, ExercisePrescription, LoggedSet, Program, SetSpec } from "@nabd/domain";
import { addDays, isWeighted, loggedSet } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";

const working = (lo: number, hi: number): SetSpec => ({ type: "working", a: lo, b: hi });

/** A plan row of three working sets of `lo`–`hi`, unless `more` says otherwise. */
function planned(
  exId: string,
  lo: number,
  hi: number,
  more: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  const sets = [working(lo, hi), working(lo, hi), working(lo, hi)];
  return { id: exId, exId, repMode: "range", intensity: "none", rest: 90, sets, ...more };
}

/** The day's main lift: a warm-up, then three sets at RPE 8 with a long rest. */
function mainLift(exId: string, lo: number, hi: number): ExercisePrescription {
  const hard = (): SetSpec => ({ ...working(lo, hi), val: 8 });
  const sets: SetSpec[] = [{ type: "warmup", a: hi + 2 }, hard(), hard(), hard()];
  return planned(exId, lo, hi, { intensity: "rpe", rest: 150, sets });
}

/** Three timed holds of `seconds`. */
function hold(exId: string, seconds: number): ExercisePrescription {
  const sets: SetSpec[] = [1, 2, 3].map(() => ({ type: "working", a: seconds }));
  return { id: exId, exId, repMode: "time", intensity: "none", rest: 60, sets };
}

const day = (id: string, name: string, exercises: ExercisePrescription[]): Day => ({
  id,
  name,
  weekday: null,
  exercises,
  slots: [],
});

/** Floating, so there is something planned whatever day the demo is opened. */
export const DEMO_PROGRAM: Program = {
  name: "Push / Pull / Legs",
  type: "fixed",
  schedule: "floating",
  days: [
    day("push", "Push", [
      mainLift("bench_press__barbell", 8, 10),
      planned("incline_bench_press__dumbbell", 10, 12),
      planned("fly__dumbbell", 12, 15, { supersetId: "push-superset" }),
      planned("lateral_raise__dumbbell", 15, 20, { supersetId: "push-superset" }),
      planned("overhead_triceps_extension__dumbbell", 12, 15),
    ]),
    day("pull", "Pull", [
      mainLift("pull_up__pullupbar", 6, 8),
      planned("row__barbell", 8, 10),
      planned("row__dumbbell", 10, 12),
      planned("hammer_curl__dumbbell", 10, 12, { supersetId: "pull-superset" }),
      planned("curl__barbell", 10, 12, { supersetId: "pull-superset" }),
    ]),
    day("legs", "Legs", [
      mainLift("back_squat__barbell", 6, 8),
      planned("romanian_deadlift__barbell", 8, 10),
      planned("walking_lunge__dumbbell", 10, 12),
      planned("calf_raise__dumbbell", 12, 15, { rest: 60 }),
      hold("plank__bodyweight", 45),
    ]),
  ],
};

const HISTORY_DAYS = 14;
const SETS_PER_EXERCISE = 3;
const HOUR_MS = 3_600_000;
const TRIGGERS = ["idle", "timer", "manual"] as const;

/** Every other day for two weeks: one program day's exercises, slowly progressing. */
export function demoHistory(now: Date): LoggedSet[] {
  const history: LoggedSet[] = [];
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 2) {
    const session = (HISTORY_DAYS - daysAgo) / 2;
    const { exercises } = DEMO_PROGRAM.days[session % DEMO_PROGRAM.days.length]!;
    exercises.forEach((row, position) => {
      const exercise = ExerciseLibrary.catalog.byId(row.exId);
      if (!exercise) return;
      // The day's first exercise at 10:00, the next at 11:00…, two minutes between sets.
      const start = addDays(now, -daysAgo).getTime() + (10 + position) * HOUR_MS;
      for (let set = 0; set < SETS_PER_EXERCISE; set++) {
        history.push(
          loggedSet(exercise, new Date(start + set * 120_000), {
            id: `demo-${history.length}`,
            value: 8 + ((session + set) % 4),
            weight: isWeighted(exercise.tracking) ? 20 + position * 5 + session * 2.5 : null,
            trigger: TRIGGERS[(session + set) % TRIGGERS.length]!,
            planItemId: null,
            setType: "working",
          }),
        );
      }
    });
  }
  return history;
}
