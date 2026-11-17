import type { GlassBackdrop, PlatformCapabilities, Settings, Theme } from "@nabd/domain";
import { APP_NAME, glassInEffect } from "@nabd/domain";
import type { Notice } from "@nabd/view";
import { SettingsRows } from "./rows-vm";
import type { StepperRowVM, ToggleRowVM } from "./rows-vm";
import { buildTrainingVM } from "./training-vm";
import type { TrainingVM } from "./training-vm";
import { buildWorkdayVM } from "./workday-vm";
import type { WorkdayVM } from "./workday-vm";
import { COMMON_WORDS } from "@nabd/design-system";

export interface SettingsVM {
  workday: WorkdayVM;
  nudges: StepperRowVM[];
  training: TrainingVM;
  /** `glass` and `opacity` are null where they are not offered. */
  appearance: { theme: Theme; glass: ToggleRowVM | null; opacity: StepperRowVM | null };
  startup: ToggleRowVM[];
  /** The outcome of the last import or export. */
  notice: Notice | null;
}

interface SettingsInput {
  settings: Settings;
  /** What this computer can do: a tray icon, a translucent window, system-wide idle time. */
  capabilities: PlatformCapabilities;
  notice: Notice | null;
}

const minutes = (value: number): string => `${value} min`;

const STARTUP_HINT = {
  tray: `Launch ${APP_NAME} when you log in, quietly in the tray.`,
  noTray: `Launch ${APP_NAME} when you log in.`,
};

const MINIMIZED_HINT = {
  tray: "Sit quietly in the tray until a set is due.",
  noTray: `This desktop shows no tray icons, so ${APP_NAME} always opens as a window.`,
};

/** What Glass does to the window, by how the desktop looks through it. */
const GLASS_HINT: Record<GlassBackdrop, string> = {
  blurred: "Frost the panels so your desktop shows through.",
  seeThrough:
    "Let your desktop show through the panels. This desktop does not blur it, so the tint stays strong enough to read over.",
};

const IDLE_HINT = {
  system: "Once the minimum gap has passed, this long without keyboard or mouse nudges early.",
  inApp: `System idle detection is unavailable on this desktop, so this counts time without activity inside ${APP_NAME} instead.`,
};

export function buildSettingsVM({ settings, capabilities, notice }: SettingsInput): SettingsVM {
  const rows = new SettingsRows(settings);
  return {
    workday: buildWorkdayVM(settings, rows),
    nudges: [
      rows.stepper("interval", minutes, {
        title: "Interval",
        hint: "Nudge this long after your last set, no matter what.",
      }),
      rows.stepper("minGap", minutes, {
        title: "Minimum gap",
        hint: "An idle moment never nudges sooner than this after your last set, or the start of the day.",
      }),
      rows.stepper("idleNudge", (value) => `${value} sec`, {
        title: "Idle moment",
        hint: capabilities.idle ? IDLE_HINT.system : IDLE_HINT.inApp,
      }),
    ],
    training: buildTrainingVM(settings, rows),
    appearance: {
      theme: settings.theme,
      glass:
        capabilities.glass === null
          ? null
          : rows.toggle("glass", {
              title: COMMON_WORDS.translucentWindow,
              hint: GLASS_HINT[capabilities.glass],
            }),
      opacity:
        glassInEffect(settings, capabilities) === null
          ? null
          : rows.stepper("opacity", (value) => `${Math.round(value * 100)}%`, {
              title: "Background opacity",
              hint: "Higher = more solid.",
            }),
    },
    startup: [
      rows.toggle("openAtStartup", {
        title: "Open at startup",
        hint: capabilities.tray ? STARTUP_HINT.tray : STARTUP_HINT.noTray,
      }),
      rows.toggle("minimizedByDefault", {
        title: "Start minimized",
        hint: capabilities.tray ? MINIMIZED_HINT.tray : MINIMIZED_HINT.noTray,
        disabled: !capabilities.tray,
      }),
    ],
    notice,
  };
}
