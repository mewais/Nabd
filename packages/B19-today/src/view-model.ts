// Pure builders: domain objects in, exactly what the Today screen renders out.

import type { MuscleKey, WeightUnit } from "@nabd/domain";
import { MUSCLE_NAMES, displayWeight, plural } from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import type { Coach, AdviceWording } from "@nabd/session";
import { describeAdvice, formatTarget } from "@nabd/session";
import type { NudgeStatus } from "@nabd/nudge";
import { describeNudge } from "@nabd/nudge";
import type { TrainingStats } from "@nabd/analytics";

export type HeroVM =
  | {
      kind: "next";
      itemId: string;
      /** "UP NEXT · SET 2 OF 4" */
      kicker: string;
      exercise: string;
      label: string;
      muscleNames: string[];
      /** What the plan asks for this set; null for an unplanned extra. */
      target: string | null;
      notes: string;
      /** Null for a warm-up, which is not something to progress on. */
      advice: AdviceWording | null;
      /** A nudge is waiting for an answer (so Snooze makes sense). */
      due: boolean;
      nudgeLine: string;
    }
  | { kind: "complete"; setsDone: number }
  /** Nothing is left to do without anything having been done. */
  | {
      kind: "rest";
      hasProgram: boolean;
      /** Today does have a plan, but every exercise in it was skipped. */
      allSkipped: boolean;
    };

export interface QueueRowVM {
  id: string;
  exercise: string;
  /** "<label> · <muscles>" */
  sub: string;
  /** "2/4 sets", "3 sets" for extras, "Skipped". */
  badge: string;
  state: "next" | "pending" | "done" | "skipped";
  /** A1/A2… when the exercise is part of a superset. */
  supersetTag: string | null;
  /** What the secondary action does to this row. */
  skipLabel: "Skip" | "Restore" | "Remove" | null;
}

export interface TodayVM {
  hero: HeroVM;
  dayName: string | null;
  queue: QueueRowVM[];
  /** Cycled muscle targets left out of the queue because their pool is empty; null when none. */
  emptySlotsNote: string | null;
  stats: { streak: number; weekSets: number; volume: number; unit: WeightUnit };
}

const muscleNames = (item: PlanItem): string[] =>
  [...item.exercise.primary, ...item.exercise.secondary].map((m: MuscleKey) => MUSCLE_NAMES[m]);

function buildHero(
  plan: TodayPlan,
  coach: Coach,
  nudge: NudgeStatus,
  unit: WeightUnit,
  hasProgram: boolean,
): HeroVM {
  const item = plan.nextItem;
  if (item === null) {
    return plan.isComplete
      ? { kind: "complete", setsDone: plan.setsDone }
      : { kind: "rest", hasProgram, allSkipped: plan.isAllSkipped };
  }
  const spec = item.nextSet;
  return {
    kind: "next",
    itemId: item.id,
    kicker: `UP NEXT · SET ${item.done + 1} OF ${item.planned}`,
    exercise: item.exercise.name,
    label: item.label,
    muscleNames: muscleNames(item),
    target: spec && item.prescription && formatTarget(spec, item.prescription),
    notes: item.prescription?.notes ?? "",
    advice: describeAdvice(coach.adviceFor(item), item.exercise.tracking, unit),
    due: nudge.state === "due",
    nudgeLine: describeNudge(nudge),
  };
}

function buildQueue(plan: TodayPlan): QueueRowVM[] {
  const nextId = plan.nextItem?.id;
  const supersetCounts = new Map<string, number>();
  return plan.items.map((item) => {
    let supersetTag: string | null = null;
    if (item.supersetId !== undefined) {
      const position = (supersetCounts.get(item.supersetId) ?? 0) + 1;
      supersetCounts.set(item.supersetId, position);
      supersetTag = `A${position}`;
    }
    const state = item.id === nextId ? "next" : item.status;
    const badge = item.skipped
      ? "Skipped"
      : item.isExtra
        ? plural(item.done, "set")
        : `${item.done}/${plural(item.planned, "set")}`;
    const skipLabel = item.skipped
      ? "Restore"
      : item.isExtra
        ? item.done === 0
          ? "Remove"
          : null
        : item.remaining > 0
          ? "Skip"
          : null;
    return {
      id: item.id,
      exercise: item.exercise.name,
      sub: `${item.label} · ${muscleNames(item).join(", ")}`,
      badge,
      state,
      supersetTag,
      skipLabel,
    };
  });
}

/** "2 muscle targets have no exercises yet: Chest, Lats". */
function emptySlotsNote(plan: TodayPlan): string | null {
  const muscles = plan.emptySlots.map((m) => MUSCLE_NAMES[m]);
  if (muscles.length === 0) return null;
  const count = plural(muscles.length, "muscle target");
  return `${count} ${muscles.length === 1 ? "has" : "have"} no exercises yet: ${muscles.join(", ")}`;
}

/** Total load moved today (reps × weight), in the display unit. */
function volumeToday(plan: TodayPlan, unit: WeightUnit): number {
  const kg = plan.items
    .flatMap((item) => item.logged)
    .reduce((sum, set) => sum + set.value * (set.weight ?? 0), 0);
  return Math.round(displayWeight(kg, unit));
}

export function buildTodayVM(input: {
  plan: TodayPlan;
  coach: Coach;
  nudge: NudgeStatus;
  stats: TrainingStats;
  unit: WeightUnit;
  hasProgram: boolean;
}): TodayVM {
  const { plan, coach, nudge, stats, unit, hasProgram } = input;
  return {
    hero: buildHero(plan, coach, nudge, unit, hasProgram),
    dayName: plan.dayName,
    queue: buildQueue(plan),
    emptySlotsNote: emptySlotsNote(plan),
    stats: {
      streak: stats.streak(),
      weekSets: stats.setsThisWeek(),
      volume: volumeToday(plan, unit),
      unit,
    },
  };
}
