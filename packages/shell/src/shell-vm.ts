import type { PlatformCapabilities, Settings, Theme, TodayChoice } from "@nabd/domain";
import { formatClock, glassInEffect, percentOf, plural } from "@nabd/domain";
import { TODAY_CHOICE_NAMES, pauseName, summarizeNudge } from "@nabd/nudge";
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
  /** What can be changed about today's nudging besides a pause. */
  today: TodayChoice;
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
  /** The whole reading in words: "2 of 12 sets done today". */
  ariaLabel: string;
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

/** The control for today's one choice: skip the day or resume it, nudge it or stop. */
interface TodayVM {
  /** "Skip today", "Resume today", "Nudge me today" or "Stop nudging today". */
  label: string;
  /** The day is skipped or nudged on. */
  on: boolean;
  /** What choosing it toggles: the skip, or the nudging. */
  toggles: "skip" | "nudge";
}

/** The button that pauses nudges, or resumes them. */
interface PauseVM {
  paused: boolean;
  /** "Pause", or "Resume" while paused. */
  label: string;
  /** "Pause nudges", or "Resume nudges" while paused. */
  title: string;
}

export interface TopBarVM {
  greeting: string;
  date: string;
  status: StatusVM;
  theme: Theme;
  pause: PauseVM;
  today: TodayVM;
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
  const totalLabel = `of ${plural(planned, "set")}`;
  return {
    done,
    totalLabel,
    pct: percentOf(done, planned),
    ariaLabel: `${done} ${totalLabel} done today`,
  };
}

function pauseVM(paused: boolean): PauseVM {
  return { paused, label: paused ? "Resume" : "Pause", title: pauseName(paused) };
}

function todayVM(choice: TodayChoice): TodayVM {
  return {
    label: TODAY_CHOICE_NAMES[choice],
    on: choice === "resume" || choice === "stop",
    toggles: choice === "skip" || choice === "resume" ? "skip" : "nudge",
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
      pause: pauseVM(input.paused),
      today: todayVM(input.today),
      glassAvailable: capabilities.glass,
      glass,
    },
    notice: input.notice,
  };
}
