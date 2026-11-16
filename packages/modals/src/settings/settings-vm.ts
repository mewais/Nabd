import type {
  Equipment,
  NumericSetting,
  PlatformCapabilities,
  Settings,
  Theme,
  WeightUnit,
} from "@nabd/domain";
import {
  SETTING_STEPS,
  editableWeight,
  formatMinuteOfDay,
  glassInEffect,
  roundTo,
} from "@nabd/domain";
import type { Notice } from "@nabd/view";

/** A change to apply to the settings. */
export type SettingsPatch = Partial<Settings>;

/** A numeric setting stepped with −/+. */
export interface StepperRowVM {
  title: string;
  hint: string;
  /** The current value with its unit: "50 min". */
  value: string;
  decrease: SettingsPatch;
  increase: SettingsPatch;
}

/** An on/off setting. */
export interface ToggleRowVM {
  title: string;
  hint: string;
  on: boolean;
  /** The patch that flips it. */
  flip: SettingsPatch;
  /** The setting has no effect on this computer (the hint says why), so it cannot be flipped. */
  disabled: boolean;
}

/** The workday: its hours, and the weekdays it is worked on. */
export interface WorkdayVM {
  hours: StepperRowVM[];
  /** The weekdays worked, 0 = Sunday … 6 = Saturday. */
  days: number[];
}

/** The user's body weight, typed in the display unit. */
export interface BodyWeightVM {
  /** In the display unit; null while not given (the field is empty). */
  value: number | null;
  hint: string;
}

export interface SettingsVM {
  workday: WorkdayVM;
  nudges: StepperRowVM[];
  training: {
    unit: WeightUnit;
    increment: StepperRowVM;
    bodyWeight: BodyWeightVM;
    equipment: Equipment[];
  };
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

type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** The finest step any setting has (0.05, 0.25) needs two decimals. */
const STEP_DECIMALS = 2;

const minutes = (value: number): string => `${value} min`;

const STARTUP_HINT = {
  tray: "Launch Nabd when you log in, quietly in the tray.",
  noTray: "Launch Nabd when you log in.",
};

const MINIMIZED_HINT = {
  tray: "Sit quietly in the tray until a set is due.",
  noTray: "This desktop shows no tray icons, so Nabd always opens as a window.",
};

const IDLE_HINT = {
  system: "Once the minimum gap has passed, this long without keyboard or mouse nudges early.",
  inApp:
    "System idle detection is unavailable on this desktop, so this counts time without activity inside Nabd instead.",
};

/** Builds rows over one `Settings` value. */
class SettingsRows {
  constructor(private readonly settings: Settings) {}

  /** A row that moves `key` by its step ({@link SETTING_STEPS}). */
  stepper(
    key: NumericSetting,
    show: (value: number) => string,
    text: { title: string; hint: string },
  ): StepperRowVM {
    const value = this.settings[key];
    const step = SETTING_STEPS[key];
    return {
      ...text,
      value: show(value),
      decrease: { [key]: roundTo(value - step, STEP_DECIMALS) },
      increase: { [key]: roundTo(value + step, STEP_DECIMALS) },
    };
  }

  toggle(
    key: BooleanSetting,
    text: { title: string; hint: string },
    disabled = false,
  ): ToggleRowVM {
    return { ...text, on: this.settings[key], flip: { [key]: !this.settings[key] }, disabled };
  }
}

export function buildSettingsVM({ settings, capabilities, notice }: SettingsInput): SettingsVM {
  const rows = new SettingsRows(settings);
  return {
    workday: {
      hours: [
        rows.stepper("workStart", formatMinuteOfDay, {
          title: "Starts",
          hint: "Nabd stays silent before this.",
        }),
        rows.stepper("workEnd", formatMinuteOfDay, { title: "Ends", hint: "…and after this." }),
      ],
      days: settings.workDays,
    },
    nudges: [
      rows.stepper("interval", minutes, {
        title: "Interval",
        hint: "Nudge this long after your last set, no matter what.",
      }),
      rows.stepper("minGap", minutes, {
        title: "Minimum gap",
        hint: "Never nudge sooner than this after a set.",
      }),
      rows.stepper("idleNudge", (value) => `${value} sec`, {
        title: "Idle moment",
        hint: capabilities.idle ? IDLE_HINT.system : IDLE_HINT.inApp,
      }),
    ],
    training: {
      unit: settings.weightUnit,
      increment: rows.stepper("weightIncrement", (v) => `${v} ${settings.weightUnit}`, {
        title: "Weight increment",
        hint:
          "The smallest jump you can load; suggestions use it. Changing the unit moves the " +
          "usual step along (2.5 kg ↔ 5 lb) and leaves a step of your own as it is.",
      }),
      bodyWeight: {
        value:
          settings.bodyWeight === null
            ? null
            : editableWeight(settings.bodyWeight, settings.weightUnit),
        hint:
          `In ${settings.weightUnit}. With it, a %1RM or an RPE can set the added weight (or ` +
          "assistance) of dips, pull-ups and the like; left empty, those exercises ignore them.",
      },
      equipment: settings.equipment,
    },
    appearance: {
      theme: settings.theme,
      glass: capabilities.glass
        ? rows.toggle("glass", {
            title: "Translucent window",
            hint: "Frost the panels so your desktop shows through.",
          })
        : null,
      opacity: glassInEffect(settings, capabilities)
        ? rows.stepper("opacity", (value) => `${Math.round(value * 100)}%`, {
            title: "Background opacity",
            hint: "Higher = more solid.",
          })
        : null,
    },
    startup: [
      rows.toggle("openAtStartup", {
        title: "Open at startup",
        hint: capabilities.tray ? STARTUP_HINT.tray : STARTUP_HINT.noTray,
      }),
      rows.toggle(
        "minimizedByDefault",
        {
          title: "Start minimized",
          hint: capabilities.tray ? MINIMIZED_HINT.tray : MINIMIZED_HINT.noTray,
        },
        !capabilities.tray,
      ),
    ],
    notice,
  };
}
