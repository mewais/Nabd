import type { PlatformCapabilities, Settings, Theme } from "@nabd/domain";
import { formatClock, glassInEffect, plural } from "@nabd/domain";
import { summarizeNudge } from "@nabd/nudge";
import type { NudgeStatus, NudgeSummary } from "@nabd/nudge";
import type { Notice, Screen } from "@nabd/view";
import { dateLabel, greeting, versionLabel } from "./wording";

export interface ShellInput {
  now: Date;
  screen: Screen;
  settings: Pick<Settings, "theme" | "glass" | "opacity">;
  /** Whether this machine can make the window translucent. */
  capabilities: Pick<PlatformCapabilities, "glass">;
  paused: boolean;
  nudge: NudgeStatus;
  /** Today's prescribed sets: how many are logged, out of how many. */
  sets: { done: number; planned: number };
  notice: Notice | null;
  /** The app's version, e.g. "0.1.0". */
  version: string;
}

/** Today's sets as a ring. */
export interface DayProgressVM {
  done: number;
  /** "of 12 sets". */
  totalLabel: string;
  /** 0–100 ring fill. */
  pct: number;
}

export interface SidebarVM {
  screen: Screen;
  versionLabel: string;
  progress: DayProgressVM;
}

/** Where nudging stands, next to the clock. */
export interface StatusVM extends NudgeSummary {
  clock: string;
}

export interface TopBarVM {
  greeting: string;
  date: string;
  status: StatusVM;
  theme: Theme;
  paused: boolean;
  /** Whether the Glass switch is offered at all. */
  glassAvailable: boolean;
  glass: boolean;
}

export interface ShellVM {
  theme: Theme;
  glass: boolean;
  /** Strength of the glass tint, 0–1. */
  opacity: number;
  sidebar: SidebarVM;
  topBar: TopBarVM;
  /** Something the user must know wherever they are in the app. */
  notice: Notice | null;
}

function buildDayProgressVM({ done, planned }: ShellInput["sets"]): DayProgressVM {
  return {
    done,
    totalLabel: `of ${plural(planned, "set")}`,
    pct: planned > 0 ? Math.round((done / planned) * 100) : 0,
  };
}

export function buildShellVM(input: ShellInput): ShellVM {
  const { now, settings, nudge, capabilities } = input;
  const glass = glassInEffect(settings, capabilities);
  return {
    theme: settings.theme,
    glass,
    opacity: settings.opacity,
    sidebar: {
      screen: input.screen,
      versionLabel: versionLabel(input.version),
      progress: buildDayProgressVM(input.sets),
    },
    topBar: {
      greeting: greeting(now),
      date: dateLabel(now),
      status: { clock: formatClock(now), ...summarizeNudge(nudge) },
      theme: settings.theme,
      paused: input.paused,
      glassAvailable: capabilities.glass,
      glass,
    },
    notice: input.notice,
  };
}
