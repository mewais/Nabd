// An in-memory backend for running the UI in a plain browser (no Tauri): a
// sample Push/Pull/Legs plan with two weeks of history, so every screen has
// something to show. Nothing here ships in the desktop app's data path.

import type { LoggedSet, Program, SetType } from "@nabd/domain";
import { DEFAULT_SETTINGS, addDays, dateKey, isWeighted } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import type { BootSnapshot, IpcClient } from "@nabd/ipc-client";

function sampleProgram(): Program {
  const w = (a: number) => ({ type: "warmup" as SetType, a });
  const r = (a: number, b: number, val?: number) => {
    const o: { type: SetType; a: number; b: number; val?: number } = { type: "working", a, b };
    if (val != null) o.val = val;
    return o;
  };
  return {
    name: "Push / Pull / Legs",
    type: "fixed",
    schedule: "weekday",
    days: [
      {
        id: "push",
        name: "Push",
        weekday: 1,
        slots: [],
        exercises: [
          {
            id: "x1",
            exId: "bench_press__barbell",
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            sets: [w(12), r(8, 10, 8), r(8, 10, 8), r(8, 10, 9)],
          },
          {
            id: "x2",
            exId: "incline_bench_press__dumbbell",
            repMode: "range",
            intensity: "rpe",
            rest: 120,
            sets: [r(10, 12, 8), r(10, 12, 8), r(10, 12, 8)],
          },
          {
            id: "x3",
            exId: "fly__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 75,
            supersetId: "ssA",
            sets: [r(12, 15), r(12, 15), r(12, 15)],
          },
          {
            id: "x4",
            exId: "lateral_raise__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 75,
            supersetId: "ssA",
            sets: [r(15, 20), r(15, 20), r(15, 20)],
          },
          {
            id: "x5",
            exId: "overhead_triceps_extension__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [r(12, 15), r(12, 15), { type: "drop", a: 12, b: 15 }],
          },
        ],
      },
      {
        id: "pull",
        name: "Pull",
        weekday: 3,
        slots: [],
        exercises: [
          {
            id: "y1",
            exId: "pull_up__pullupbar",
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            sets: [w(5), r(6, 8, 8), r(6, 8, 8), r(6, 8, 9)],
          },
          {
            id: "y2",
            exId: "row__barbell",
            repMode: "range",
            intensity: "rpe",
            rest: 120,
            sets: [r(8, 10, 8), r(8, 10, 8), r(8, 10, 8)],
          },
          {
            id: "y3",
            exId: "row__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [r(10, 12), r(10, 12), r(10, 12)],
          },
          {
            id: "y4",
            exId: "hammer_curl__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 75,
            supersetId: "ssB",
            sets: [r(10, 12), r(10, 12), r(10, 12)],
          },
          {
            id: "y5",
            exId: "curl__barbell",
            repMode: "range",
            intensity: "none",
            rest: 75,
            supersetId: "ssB",
            sets: [r(10, 12), r(10, 12), r(10, 12)],
          },
        ],
      },
      {
        id: "legs",
        name: "Legs",
        weekday: 5,
        slots: [],
        exercises: [
          {
            id: "z1",
            exId: "back_squat__barbell",
            repMode: "range",
            intensity: "rpe",
            rest: 180,
            sets: [w(8), r(6, 8, 8), r(6, 8, 8), r(6, 8, 9)],
          },
          {
            id: "z2",
            exId: "romanian_deadlift__barbell",
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            sets: [r(8, 10, 8), r(8, 10, 8), r(8, 10, 8)],
          },
          {
            id: "z3",
            exId: "walking_lunge__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 120,
            sets: [r(10, 12), r(10, 12), r(10, 12)],
          },
          {
            id: "z4",
            exId: "calf_raise__dumbbell",
            repMode: "range",
            intensity: "none",
            rest: 60,
            sets: [r(12, 15), r(12, 15), r(12, 15)],
          },
          {
            id: "z5",
            exId: "plank__bodyweight",
            repMode: "time",
            intensity: "none",
            rest: 60,
            sets: [
              { type: "working", a: 45 },
              { type: "working", a: 45 },
              { type: "working", a: 45 },
            ],
          },
        ],
      },
    ],
  };
}

const HISTORY_DAYS = 14;
const SETS_PER_EXERCISE = 3;

/** Every other day for two weeks: one program day's exercises, slowly progressing. */
function sampleHistory(program: Program, now: Date): LoggedSet[] {
  const history: LoggedSet[] = [];
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 2) {
    const date = addDays(now, -daysAgo);
    const session = (HISTORY_DAYS - daysAgo) / 2;
    const day = program.days[session % program.days.length]!;
    day.exercises.forEach((row, exerciseIndex) => {
      const exercise = ExerciseLibrary.catalog.byId(row.exId);
      if (!exercise) return;
      for (let set = 0; set < SETS_PER_EXERCISE; set++) {
        const at = new Date(date.getTime() + (10 + exerciseIndex) * 3_600_000 + set * 120_000);
        history.push({
          id: `demo-${history.length}`,
          exId: exercise.id,
          exercise: exercise.name,
          group: exercise.group,
          muscles: [...exercise.primary, ...exercise.secondary],
          value: 8 + ((session + set) % 4),
          weight: isWeighted(exercise.tracking) ? 20 + exerciseIndex * 5 + session * 2.5 : null,
          ts: at.toISOString(),
          date: dateKey(at),
          trigger: (["idle", "timer", "manual"] as const)[(session + set) % 3]!,
          planItemId: null,
          setType: "working",
        });
      }
    });
  }
  return history;
}

export function createDemoClient(): IpcClient {
  const now = new Date();
  // Floating, so there is always something planned whatever day the demo runs.
  const program: Program = { ...sampleProgram(), schedule: "floating" };
  const data: BootSnapshot = {
    program,
    settings: DEFAULT_SETTINGS,
    customExercises: null,
    rotationState: null,
    dayState: null,
    dayLog: null,
    history: sampleHistory(program, now),
  };

  return {
    loadAll: async () => structuredClone(data),
    save: async (key, value) => {
      data[key] = value;
    },
    appendSet: async (set) => {
      data.history.push(set);
    },
    deleteSet: async (id) => {
      data.history = data.history.filter((set) => (set as LoggedSet).id !== id);
    },
    exportData: async () => "the demo (nothing is written)",
    importData: async (imported) => {
      Object.assign(data, imported);
    },
    notify: async () => {},
    setVibrancy: async () => {},
    setAutostart: async () => {},
    updateTray: async () => {},
    getIdleSeconds: async () => 0,
    onTrayAction: async () => () => {},
  };
}
