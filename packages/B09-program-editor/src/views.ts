import type { Day, ProgramType } from "@nabd/domain";

/** "5 exercises · 16 sets" (fixed) / "4 muscles · 12 sets" (cycled). */
export function daySummary(day: Day, type: ProgramType): string {
  const rows = type === "cycled" ? day.slots : day.exercises;
  const sets = rows.reduce((n, row) => n + row.sets.length, 0);
  return `${rows.length} ${type === "cycled" ? "muscles" : "exercises"} · ${sets} sets`;
}
