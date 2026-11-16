// The set table of one prescription (an exercise row or a cycled slot).

import type { Intensity, Prescription, RepMode, SetSpec, SetType } from "@nabd/domain";
import { formatDuration } from "@nabd/session";

export type SetBadgeKind = "warm" | "work" | "drop";

export interface SetRowVM {
  index: number;
  /** Names of the row's controls, by its place in the table: "Set 2 reps", "Remove set 2". */
  labels: { low: string; high: string; intensity: string; remove: string };
  /** "W" / "1".. / "D" */
  badgeLabel: string;
  badgeKind: SetBadgeKind;
  /** "Warm-up — click to change" */
  badgeTitle: string;
  /** Reps, the bottom of a rep range, or seconds: "8" / "45s". */
  low: string;
  /** The top of a rep range, when reps are a range. */
  high: string | null;
  /** "8" (RPE) / "70%" (%1RM); null when load is not prescribed. */
  intensity: string | null;
}

export interface SetBlockVM {
  rows: SetRowVM[];
  repMode: RepMode;
  intensity: Intensity;
  /** "Reps" / "Time" */
  repHeader: string;
  /** "RPE" / "%1RM"; null when load is not prescribed. */
  intensityHeader: string | null;
  /** "2:30" */
  rest: string;
  notes: string;
}

const SET_KINDS: Record<SetType, { kind: SetBadgeKind; name: string; letter: string | null }> = {
  warmup: { kind: "warm", name: "Warm-up", letter: "W" },
  drop: { kind: "drop", name: "Drop set", letter: "D" },
  working: { kind: "work", name: "Working", letter: null },
};

const INTENSITY_HEADERS: Record<Intensity, string | null> = {
  none: null,
  rpe: "RPE",
  pct: "%1RM",
};

function intensityText(set: SetSpec, intensity: Intensity): string | null {
  if (intensity === "none" || set.val === undefined) return null;
  return intensity === "pct" ? `${set.val}%` : `${set.val}`;
}

export function buildSetBlock(prescription: Prescription): SetBlockVM {
  const { repMode, intensity, rest, sets, notes } = prescription;
  let workingCount = 0;
  const rows = sets.map((set, index): SetRowVM => {
    const { kind, name, letter } = SET_KINDS[set.type];
    return {
      index,
      labels: {
        low: `Set ${index + 1} ${repMode === "time" ? "seconds" : "reps"}`,
        high: `Set ${index + 1} top of range`,
        intensity: `Set ${index + 1} ${INTENSITY_HEADERS[intensity] ?? "load"}`,
        remove: `Remove set ${index + 1}`,
      },
      badgeLabel: letter ?? String(++workingCount),
      badgeKind: kind,
      badgeTitle: `${name} — click to change`,
      low: repMode === "time" ? `${set.a}s` : `${set.a}`,
      high: repMode === "range" && set.b !== undefined ? `${set.b}` : null,
      intensity: intensityText(set, intensity),
    };
  });
  return {
    rows,
    repMode,
    intensity,
    repHeader: repMode === "time" ? "Time" : "Reps",
    intensityHeader: INTENSITY_HEADERS[intensity],
    rest: formatDuration(rest),
    notes: notes ?? "",
  };
}
