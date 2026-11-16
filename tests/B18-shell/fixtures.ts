import { buildShellVM } from "@nabd/shell";
import type { ShellActions, ShellInput, ShellVM } from "@nabd/shell";
import { nov } from "../support/domain-factories";

/** Monday morning, mid-plan, waiting for the next nudge, on a platform with glass. */
export function shellInput(overrides: Partial<ShellInput> = {}): ShellInput {
  return {
    now: nov(16, 10, 30),
    screen: "today",
    settings: { theme: "dark", glass: false, opacity: 0.7 },
    glassSupported: true,
    paused: false,
    nudge: { state: "waiting", at: nov(16, 11, 20), idleFrom: nov(16, 10, 45) },
    sets: { setsDone: 3, setsPlanned: 12 },
    notice: null,
    version: "0.1.0",
    ...overrides,
  };
}

export const shellVM = (overrides: Partial<ShellInput> = {}): ShellVM =>
  buildShellVM(shellInput(overrides));

export function shellActions(): ShellActions {
  return {
    navigate: vi.fn(),
    togglePause: vi.fn(),
    setTheme: vi.fn(),
    setGlass: vi.fn(),
    openSettings: vi.fn(),
    dismissNotice: vi.fn(),
  };
}
