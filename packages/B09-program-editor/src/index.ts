// @nabd/program-editor — pure immutable mutations + derived views for the planner.
// Every mutation returns a new Program (input untouched).

import type {
  Program,
  Day,
  ProgramType,
  Schedule,
  RepMode,
  Intensity,
  SetType,
  MuscleKey,
  Exercise,
} from "@nabd/domain";
import { MUSCLE_NAMES, GROUP_PRIMARY_MUSCLE } from "@nabd/domain";

export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** Generate a short unique id (deterministic generator injectable for tests). */
export function newId(seed?: number): string {
  if (seed !== undefined) {
    return "i" + seed.toString(36);
  }
  return "i" + Math.random().toString(36).slice(2, 7);
}

// ----- Deep-clone helper -----
function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

// ----- Day-level -----
export function addDay(_p: Program, _id: string, _weekday: number | null): Program {
  const p = clone(_p);
  p.days.push({
    id: _id,
    name: "New day",
    weekday: _weekday,
    exercises: [],
    slots: [],
  });
  return p;
}

export function removeDay(_p: Program, _dayId: string): Program {
  const p = clone(_p);
  p.days = p.days.filter((d) => d.id !== _dayId);
  return p;
}

export function renameDay(_p: Program, _dayId: string, _name: string): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) day.name = _name;
  return p;
}

export function setWeekday(_p: Program, _dayId: string, _weekday: number): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    day.weekday = day.weekday === _weekday ? null : _weekday;
  }
  return p;
}

// ----- Program-level -----
export function setType(_p: Program, _type: ProgramType, _lookup: ExerciseLookup): Program {
  const p = clone(_p);
  p.type = _type;
  if (_type === "cycled") {
    p.days.forEach((d) => {
      if (!d.slots || d.slots.length === 0) {
        d.slots = deriveSlots(d, _lookup);
      }
    });
  }
  return p;
}

export function setSchedule(_p: Program, _schedule: Schedule): Program {
  const p = clone(_p);
  p.schedule = _schedule;
  return p;
}

export function renameProgram(_p: Program, _name: string): Program {
  const p = clone(_p);
  p.name = _name;
  return p;
}

// ----- Fixed-mode exercises -----
export function addExercise(_p: Program, _dayId: string, _ex: Exercise): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    const timeBased = !!_ex.timeBased;
    const baseSet = timeBased
      ? { type: "working" as SetType, a: 45 }
      : { type: "working" as SetType, a: 8, b: 12 };
    day.exercises.push({
      id: newId(),
      exId: _ex.id,
      repMode: timeBased ? "time" : "range",
      intensity: "none",
      rest: timeBased ? 60 : 120,
      sets: [{ ...baseSet }, { ...baseSet }, { ...baseSet }],
    });
  }
  return p;
}

export function removeExercise(_p: Program, _dayId: string, _exRowId: string): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    day.exercises = day.exercises.filter((e) => e.id !== _exRowId);
  }
  return p;
}

export function toggleSuperset(_p: Program, _dayId: string, _exRowId: string): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId)!;
  const idx = day.exercises.findIndex((e) => e.id === _exRowId);
  if (idx < 0 || idx >= day.exercises.length - 1) return p;
  const curr = day.exercises[idx];
  const next = day.exercises[idx + 1];
  if (curr.supersetId && curr.supersetId === next.supersetId) {
    // unlink
    const sid = curr.supersetId;
    day.exercises.forEach((z) => {
      if (z.supersetId === sid) delete z.supersetId;
    });
  } else {
    // link
    const sid = newId();
    curr.supersetId = sid;
    next.supersetId = sid;
  }
  return p;
}

// ----- Generic prescription editing (ref = an exercise row or a cycled slot) -----
export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}

type Prescription = {
  repMode: RepMode;
  intensity: Intensity;
  rest: number;
  sets: { type: SetType; a: number; b?: number; val?: number }[];
  notes?: string;
};

function findRef(day: Day, ref: EditRef): Prescription | undefined {
  if (ref.kind === "slot") {
    return day.slots.find((s) => s.id === ref.id);
  }
  return day.exercises.find((e) => e.id === ref.id);
}

function withRef(
  _p: Program,
  _dayId: string,
  ref: EditRef,
  fn: (c: Prescription) => void,
): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId)!;
  const c = findRef(day, ref);
  if (c) fn(c);
  return p;
}

export function setRepMode(_p: Program, _dayId: string, _ref: EditRef, _m: RepMode): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    c.repMode = _m;
    c.sets.forEach((st) => {
      if (_m === "time") {
        delete st.b;
      } else if (_m === "fixed") {
        delete st.b;
      } else {
        // range
        if (st.b == null) st.b = st.a + 2;
      }
    });
  });
}

export function setIntensity(_p: Program, _dayId: string, _ref: EditRef, _m: Intensity): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    c.intensity = _m;
    c.sets.forEach((st) => {
      if (_m === "none") {
        delete st.val;
      } else if (st.val == null) {
        st.val = _m === "rpe" ? 8 : 70;
      }
    });
  });
}

export function setRest(_p: Program, _dayId: string, _ref: EditRef, _delta: number): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    c.rest = Math.max(0, c.rest + _delta * 15);
  });
}

export function addSet(_p: Program, _dayId: string, _ref: EditRef): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    const last = c.sets[c.sets.length - 1];
    c.sets.push({ ...last, type: "working" });
  });
}

export function addWarmup(_p: Program, _dayId: string, _ref: EditRef): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    if (c.repMode === "time") {
      c.sets.unshift({ type: "warmup", a: 30 });
    } else {
      const firstA = c.sets[0].a;
      c.sets.unshift({ type: "warmup", a: firstA + 2, b: firstA + 4 });
    }
  });
}

export function removeSet(_p: Program, _dayId: string, _ref: EditRef, _i: number): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    if (c.sets.length > 1) {
      c.sets.splice(_i, 1);
    }
  });
}

export function cycleSetType(_p: Program, _dayId: string, _ref: EditRef, _i: number): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    const order: SetType[] = ["working", "warmup", "drop"];
    const cur = c.sets[_i].type;
    c.sets[_i].type = order[(order.indexOf(cur) + 1) % order.length];
  });
}

/** Step `a` or `b` of a set by delta (time mode steps by 5). */
export function stepRep(
  _p: Program,
  _dayId: string,
  _ref: EditRef,
  _i: number,
  _which: "a" | "b",
  _delta: number,
): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    const st = c.sets[_i];
    if (_which === "a") {
      const min = c.repMode === "time" ? 5 : 1;
      st.a = Math.max(min, st.a + (c.repMode === "time" ? _delta * 5 : _delta));
      if (c.repMode === "range" && st.b != null && st.b < st.a) {
        st.b = st.a;
      }
    } else {
      st.b = Math.max(st.a, st.b! + _delta);
    }
  });
}

/** Step intensity value (RPE by 0.5 clamp 5–10; %1RM by 2.5 clamp 40–100). */
export function stepVal(
  _p: Program,
  _dayId: string,
  _ref: EditRef,
  _i: number,
  _delta: number,
): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    const st = c.sets[_i];
    if (c.intensity === "rpe") {
      st.val = Math.max(5, Math.min(10, Math.round((st.val! + _delta * 0.5) * 2) / 2));
    } else {
      st.val = Math.max(40, Math.min(100, st.val! + _delta * 2.5));
    }
  });
}

export function setNotes(_p: Program, _dayId: string, _ref: EditRef, _notes: string): Program {
  return withRef(_p, _dayId, _ref, (c) => {
    c.notes = _notes;
  });
}

// ----- Cycled-mode slots -----
export function addSlot(_p: Program, _dayId: string, _muscle: MuscleKey): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    day.slots.push({
      id: newId(),
      muscle: _muscle,
      pool: [],
      repMode: "range",
      intensity: "none",
      rest: 120,
      sets: [
        { type: "working", a: 8, b: 12 },
        { type: "working", a: 8, b: 12 },
        { type: "working", a: 8, b: 12 },
      ],
    });
  }
  return p;
}

export function removeSlot(_p: Program, _dayId: string, _slotId: string): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    day.slots = day.slots.filter((s) => s.id !== _slotId);
  }
  return p;
}

export function addToPool(_p: Program, _dayId: string, _slotId: string, _exId: string): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    const slot = day.slots.find((s) => s.id === _slotId);
    if (slot && !slot.pool.includes(_exId)) {
      slot.pool.push(_exId);
    }
  }
  return p;
}

export function removeFromPool(
  _p: Program,
  _dayId: string,
  _slotId: string,
  _exId: string,
): Program {
  const p = clone(_p);
  const day = p.days.find((d) => d.id === _dayId);
  if (day) {
    const slot = day.slots.find((s) => s.id === _slotId);
    if (slot) {
      slot.pool = slot.pool.filter((e) => e !== _exId);
    }
  }
  return p;
}

/** Derive cycled slots from a fixed day's exercises (group + pooled exIds). */
export function deriveSlots(_day: Day, _lookup: ExerciseLookup): Day["slots"] {
  const seen: Record<string, Day["slots"][number]> = {};
  const order: Day["slots"] = [];
  _day.exercises.forEach((e) => {
    const x = _lookup(e.exId);
    if (!x) return;
    if (!seen[x.group]) {
      seen[x.group] = {
        id: newId(),
        muscle: GROUP_PRIMARY_MUSCLE[x.group],
        pool: [],
        repMode: e.repMode,
        intensity: e.intensity,
        rest: e.rest,
        sets: JSON.parse(JSON.stringify(e.sets)),
      };
      order.push(seen[x.group]);
    }
    if (!seen[x.group].pool.includes(e.exId)) {
      seen[x.group].pool.push(e.exId);
    }
  });
  return order;
}

// ----- Derived views -----
export type SetTypeOrder = SetType;

export interface BoardCard {
  dayId: string;
  label: string;
  name: string;
  chips: { name: string; superset: boolean }[];
  more: number;
}
export interface BoardColumn {
  kind: "day" | "rest" | "add";
  weekday?: number;
  label: string;
  card?: BoardCard;
}

/** Week-board layout for weekday or floating schedule. */
export function boardLayout(_p: Program): BoardColumn[] {
  const cardChips = (d: Day): { chips: { name: string; superset: boolean }[]; more: number } => {
    let items: { name: string; superset: boolean }[];
    let n: number;
    if (_p.type === "cycled") {
      const sl = d.slots;
      n = sl.length;
      items = sl.slice(0, 4).map((s) => ({ name: MUSCLE_NAMES[s.muscle], superset: false }));
    } else {
      const ex = d.exercises;
      n = ex.length;
      items = ex.slice(0, 4).map((e) => ({ name: e.exId, superset: !!e.supersetId }));
    }
    return { chips: items, more: n - items.length };
  };

  if (_p.schedule === "weekday") {
    const labels: [string, number][] = [
      ["MON", 1],
      ["TUE", 2],
      ["WED", 3],
      ["THU", 4],
      ["FRI", 5],
      ["SAT", 6],
      ["SUN", 0],
    ];
    return labels.map(([label, wd]) => {
      const d = _p.days.find((x) => x.weekday === wd);
      if (d) {
        const { chips, more } = cardChips(d);
        return {
          kind: "day",
          weekday: wd,
          label,
          card: { dayId: d.id, label, name: d.name, chips, more },
        };
      }
      return { kind: "rest", weekday: wd, label };
    });
  }

  // floating
  const cols: BoardColumn[] = _p.days.map((d, i) => {
    const colLabel = `DAY ${i + 1}`;
    const { chips, more } = cardChips(d);
    return {
      kind: "day",
      label: colLabel,
      card: { dayId: d.id, label: colLabel, name: d.name, chips, more },
    };
  });
  cols.push({ kind: "add", label: "ADD" });
  return cols;
}

/** Human summary: "5 exercises · 16 sets · ~54 min" (fixed) / "N muscle groups". */
export function daySummary(_day: Day, _type: ProgramType): string {
  if (_type === "cycled") {
    return `${_day.slots.length} muscle groups`;
  }
  const ex = _day.exercises;
  const totalSets = ex.reduce((a, e) => a + e.sets.length, 0);
  const min = Math.max(8, Math.round(totalSets * 3.4));
  return `${ex.length} exercises · ${totalSets} sets · ~${min} min`;
}

/** A seed Push/Pull/Legs program (used as the initial program). */
export function seedProgram(): Program {
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
