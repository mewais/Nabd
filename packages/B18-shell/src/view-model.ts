import type { Settings, Theme } from "@nabd/domain";
import { formatClock, plural } from "@nabd/domain";
import { describeNudge } from "@nabd/nudge";
import type { NudgeStatus } from "@nabd/nudge";
import { dateLabel, greeting, versionLabel } from "./format";
import type { Screen } from "./nav-items";

export interface ShellInput {
  now: Date;
  screen: Screen;
  settings: Pick<Settings, "theme" | "glass" | "opacity">;
  /** Whether this platform can make the window translucent. */
  glassSupported: boolean;
  paused: boolean;
  nudge: NudgeStatus;
  /** Today's sets. */
  sets: { setsDone: number; setsPlanned: number };
  notice: NoticeVM | null;
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
export interface StatusVM {
  clock: string;
  line: string;
  /** A set is due right now. */
  due: boolean;
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

/** Something the user must know wherever they are in the app. */
export interface NoticeVM {
  kind: "info" | "error";
  text: string;
}

export interface ShellVM {
  theme: Theme;
  glass: boolean;
  /** Strength of the glass tint, 0–1. */
  opacity: number;
  sidebar: SidebarVM;
  topBar: TopBarVM;
  notice: NoticeVM | null;
}

function dayProgress({ setsDone, setsPlanned }: ShellInput["sets"]): DayProgressVM {
  return {
    done: setsDone,
    totalLabel: `of ${plural(setsPlanned, "set")}`,
    pct: setsPlanned > 0 ? Math.round((setsDone / setsPlanned) * 100) : 0,
  };
}

export function buildShellVM(input: ShellInput): ShellVM {
  const { now, settings, nudge } = input;
  // A stored "glass on" (say, data imported from another machine) must not
  // leave the panels see-through where the window itself cannot be.
  const glass = settings.glass && input.glassSupported;
  return {
    theme: settings.theme,
    glass,
    opacity: settings.opacity,
    sidebar: {
      screen: input.screen,
      versionLabel: versionLabel(input.version),
      progress: dayProgress(input.sets),
    },
    topBar: {
      greeting: greeting(now),
      date: dateLabel(now),
      status: { clock: formatClock(now), line: describeNudge(nudge), due: nudge.state === "due" },
      theme: settings.theme,
      paused: input.paused,
      glassAvailable: input.glassSupported,
      glass,
    },
    notice: input.notice,
  };
}
