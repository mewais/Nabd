// In-memory demo client for running the UI in a plain browser (no Tauri).
// Seeds a populated state so every screen renders with real-looking data — used
// for local visual inspection (Playwright) and as a web demo. Not used under Tauri.

import type { IpcClient, BootSnapshot } from "@nabd/ipc-client";
import type { LoggedSet, Program, Settings, MuscleKey } from "@nabd/domain";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import { seedProgram } from "@nabd/program-editor";
import { defaultLibrary } from "@nabd/dataset";

const MUSCLE_BY_EX: Record<string, { name: string; group: string; muscles: MuscleKey[] }> = {};
function exMeta(exId: string) {
  if (!MUSCLE_BY_EX[exId]) {
    const ex = defaultLibrary().byId(exId);
    MUSCLE_BY_EX[exId] = ex
      ? { name: ex.name, group: ex.group, muscles: [...ex.primary, ...ex.secondary] }
      : { name: exId, group: "Chest", muscles: ["chest"] as MuscleKey[] };
  }
  return MUSCLE_BY_EX[exId]!;
}

/** Build ~2 weeks of synthetic history across the seed program's exercises. */
function seedHistory(program: Program, nowMs: number): LoggedSet[] {
  const out: LoggedSet[] = [];
  const day = 86400000;
  const exIds = program.days.flatMap((d) => d.exercises.map((e) => e.exId));
  let n = 0;
  for (let dayBack = 13; dayBack >= 0; dayBack--) {
    if (dayBack % 2 === 1 && dayBack !== 1) continue; // train ~every other day
    const base = nowMs - dayBack * day;
    const dateStr = new Date(base).toISOString().slice(0, 10);
    const picks = exIds.slice((dayBack * 3) % exIds.length, ((dayBack * 3) % exIds.length) + 4);
    picks.forEach((exId, i) => {
      const m = exMeta(exId);
      const weighted = !["pull_up__pullupbar", "plank__bodyweight"].includes(exId);
      for (let s = 0; s < 3; s++) {
        const ts = new Date(base + (9 + i) * 3600000 + s * 120000).toISOString();
        out.push({
          id: "h" + n++,
          exId,
          exercise: m.name,
          group: m.group,
          muscles: m.muscles,
          value: weighted ? 8 + ((n + s) % 4) : 12 + ((n + s) % 6),
          weight: weighted ? 40 + ((n * 2) % 30) : null,
          ts,
          date: dateStr,
          trigger: (["idle", "timer", "manual"] as const)[n % 3]!,
        });
      }
    });
  }
  return out;
}

export function createDemoClient(): IpcClient {
  const now = Date.now();
  const program: Program = { ...seedProgram(), schedule: "floating" };
  const settings: Settings = { ...DEFAULT_SETTINGS, theme: "dark", glass: false };
  const snapshot: BootSnapshot = {
    program,
    settings,
    theme: "dark",
    customExercises: null,
    rotationState: null,
    dayState: null,
    history: seedHistory(program, now),
  };
  return {
    init: async () => {},
    loadAll: async () => snapshot,
    saveSingleton: async () => {},
    appendSet: async (row) => {
      snapshot.history.push(row);
    },
    exportData: async () => JSON.stringify({ app: "Nabd", version: 1 }),
    importData: async () => {},
    notify: async () => {},
    setVibrancy: async () => {},
    getIdleSeconds: async () => 0,
  };
}
