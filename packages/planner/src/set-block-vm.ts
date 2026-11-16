// The set table of one prescription (an exercise row or a cycled slot).

import type { Intensity, Prescription, SetSpec, SetType } from "@nabd/domain";
import { INTENSITY_NAMES, SET_TYPE_NAMES, formatDuration } from "@nabd/domain";
import type { RepStyle } from "@nabd/program-editor";
import { COMMON_WORDS } from "@nabd/design-system";

export interface SetRowVM {
  index: number;
  type: SetType;
  /** Names of the row's controls, by its place in the table: "Set 2 reps", "Remove set 2". */
  labels: { amount: string; upTo: string; intensity: string; remove: string };
  /** "W" / "1".. / "D" */
  badge: string;
  /** "Warm-up — click to change" */
  badgeTitle: string;
  /** Reps, the bottom of a rep range, or seconds: "8" / "45s". */
  amount: string;
  /** The top of a rep range, when reps are a range. */
  upTo: string | null;
  /** "8" (RPE) / "70%" (%1RM); null when load is not prescribed. */
  intensity: string | null;
}

export interface SetBlockVM {
  rows: SetRowVM[];
  /**
   * How reps are written, which the user can choose. Null for a timed
   * prescription: seconds or reps is the exercise's doing, and a duration is
   * written one way.
   */
  repStyle: RepStyle | null;
  intensity: Intensity;
  /** "Reps" / "Time" */
  repHeader: string;
  /** "RPE" / "%1RM"; null when load is not prescribed. */
  intensityHeader: string | null;
  /** "2:30" */
  rest: string;
  notes: string;
}

/** The letter that marks a set that is not a working set; working sets are numbered. */
const SET_TYPE_LETTERS: Record<SetType, string | null> = { warmup: "W", drop: "D", working: null };

function intensityText(set: SetSpec, intensity: Intensity): string | null {
  if (intensity === "none" || set.intensity === undefined) return null;
  return intensity === "pct" ? `${set.intensity}%` : `${set.intensity}`;
}

export function buildSetBlockVM(prescription: Prescription): SetBlockVM {
  const { repMode, intensity, rest, sets, notes } = prescription;
  const intensityHeader = intensity === "none" ? null : INTENSITY_NAMES[intensity];
  let workingCount = 0;
  const rows = sets.map((set, index): SetRowVM => {
    const place = `Set ${index + 1}`;
    return {
      index,
      type: set.type,
      labels: {
        amount: `${place} ${repMode === "time" ? "seconds" : "reps"}`,
        upTo: `${place} top of range`,
        intensity: `${place} ${intensityHeader ?? "load"}`,
        remove: `Remove set ${index + 1}`,
      },
      badge: SET_TYPE_LETTERS[set.type] ?? String(++workingCount),
      badgeTitle: `${SET_TYPE_NAMES[set.type]} — click to change`,
      amount: repMode === "time" ? `${set.amount}s` : `${set.amount}`,
      upTo: repMode === "range" && set.upTo !== undefined ? `${set.upTo}` : null,
      intensity: intensityText(set, intensity),
    };
  });
  return {
    rows,
    repStyle: repMode === "time" ? null : repMode,
    intensity,
    repHeader: repMode === "time" ? "Time" : COMMON_WORDS.reps,
    intensityHeader,
    rest: formatDuration(rest),
    notes: notes ?? "",
  };
}
