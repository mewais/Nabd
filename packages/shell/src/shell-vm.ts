import type {
  GlassBackdrop,
  PlatformCapabilities,
  Settings,
  Theme,
  TodayChoice,
} from "@nabd/domain";
import { formatClock, glassInEffect, percentOf, plural } from "@nabd/domain";
import { TODAY_CHOICE_NAMES, pauseName, summarizeNudge } from "@nabd/nudge";
import type { NudgeStatus, NudgeSummary } from "@nabd/nudge";
import type { Option } from "@nabd/design-system";
import type { Notice, Screen } from "@nabd/view";
import type { ShellActions } from "./shell-actions";
import { WORDS, dateLabel, greeting, versionLabel } from "./wording";

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

/** What a pick in the top bar's nudge menu does: one of the shell's actions. */
type NudgeMenuAction = keyof Pick<
  ShellActions,
  "togglePause" | "toggleSkipToday" | "toggleNudgeToday"
>;

/**
 * The top bar's one nudge control: a menu button that says where nudging
 * stands, and lists the pause and today's choice.
 */
interface NudgeMenuVM {
  /** "Pause"; "Skipped", "Paused" or "Nudging" while today is changed so. */
  label: string;
  /** Today's nudging is changed: skipped, paused or nudged on. */
  changed: boolean;
  /** "Pause nudges" (or "Resume nudges"), then today's choice ("Skip today", "Nudge me today"…). */
  items: Option<NudgeMenuAction>[];
}

export interface TopBarVM {
  greeting: string;
  date: string;
  status: StatusVM;
  theme: Theme;
  nudgeMenu: NudgeMenuVM;
  /** Whether the Glass switch is offered at all. */
  glassAvailable: boolean;
  glass: boolean;
}

export interface ShellVM {
  theme: Theme;
  /** The backdrop of the translucent window; null while it is opaque. */
  glass: GlassBackdrop | null;
  /** The glass tint strength setting, 0.1–1. */
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

/** What choosing each of today's choices does. */
const TODAY_ACTIONS: Record<TodayChoice, NudgeMenuAction> = {
  skip: "toggleSkipToday",
  resume: "toggleSkipToday",
  nudge: "toggleNudgeToday",
  stop: "toggleNudgeToday",
};

/** What the nudge menu's button says: the change in force, as the status line ranks them. */
function nudgeMenuLabel(paused: boolean, today: TodayChoice): string {
  if (today === "resume") return WORDS.nudgeMenu.skipped;
  if (paused) return WORDS.nudgeMenu.paused;
  if (today === "stop") return WORDS.nudgeMenu.nudged;
  return WORDS.nudgeMenu.idle;
}

function nudgeMenuVM(paused: boolean, today: TodayChoice): NudgeMenuVM {
  const label = nudgeMenuLabel(paused, today);
  return {
    label,
    changed: label !== WORDS.nudgeMenu.idle,
    items: [
      { value: "togglePause", label: pauseName(paused) },
      { value: TODAY_ACTIONS[today], label: TODAY_CHOICE_NAMES[today] },
    ],
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
      nudgeMenu: nudgeMenuVM(input.paused, input.today),
      glassAvailable: capabilities.glass !== null,
      glass: glass !== null,
    },
    notice: input.notice,
  };
}
