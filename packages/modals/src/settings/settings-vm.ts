import type { Equipment, Notice, Settings, Theme, WeightUnit } from "@nabd/domain";
import { formatMinuteOfDay, roundTo } from "@nabd/domain";

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
}

export interface SettingsVM {
  workday: StepperRowVM[];
  nudges: StepperRowVM[];
  training: { unit: WeightUnit; increment: StepperRowVM; equipment: Equipment[] };
  /** `glass` and `opacity` are null where they are not offered. */
  appearance: { theme: Theme; glass: ToggleRowVM | null; opacity: StepperRowVM | null };
  startup: ToggleRowVM[];
  /** The outcome of the last import or export. */
  notice: Notice | null;
}

export interface SettingsInput {
  settings: Settings;
  /** What this computer can do: a translucent window, system-wide idle time. */
  capabilities: { glass: boolean; idle: boolean };
  notice: Notice | null;
}

type NumericSetting = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];
type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** The finest step any setting has (0.05, 0.25) needs two decimals. */
const STEP_DECIMALS = 2;

const minutes = (value: number): string => `${value} min`;

const IDLE_HINT = {
  system: "Once the minimum gap has passed, this long without keyboard or mouse nudges early.",
  inApp:
    "System idle detection is unavailable on this desktop, so this counts time without activity inside Nabd instead.",
};

/** Builds rows over one `Settings` value. */
class SettingsRows {
  constructor(private readonly settings: Settings) {}

  stepper(
    key: NumericSetting,
    step: number,
    show: (value: number) => string,
    text: { title: string; hint: string },
  ): StepperRowVM {
    const value = this.settings[key];
    return {
      ...text,
      value: show(value),
      decrease: { [key]: roundTo(value - step, STEP_DECIMALS) },
      increase: { [key]: roundTo(value + step, STEP_DECIMALS) },
    };
  }

  toggle(key: BooleanSetting, text: { title: string; hint: string }): ToggleRowVM {
    return { ...text, on: this.settings[key], flip: { [key]: !this.settings[key] } };
  }
}

export function buildSettingsVM({ settings, capabilities, notice }: SettingsInput): SettingsVM {
  const rows = new SettingsRows(settings);
  const glassOn = capabilities.glass && settings.glass;
  return {
    workday: [
      rows.stepper("workStart", 30, formatMinuteOfDay, {
        title: "Starts",
        hint: "Nabd stays silent before this.",
      }),
      rows.stepper("workEnd", 30, formatMinuteOfDay, { title: "Ends", hint: "…and after this." }),
    ],
    nudges: [
      rows.stepper("interval", 5, minutes, {
        title: "Interval",
        hint: "Nudge this long after your last set, no matter what.",
      }),
      rows.stepper("minGap", 5, minutes, {
        title: "Minimum gap",
        hint: "Never nudge sooner than this after a set.",
      }),
      rows.stepper("idleNudge", 5, (value) => `${value} sec`, {
        title: "Idle moment",
        hint: capabilities.idle ? IDLE_HINT.system : IDLE_HINT.inApp,
      }),
    ],
    training: {
      unit: settings.weightUnit,
      increment: rows.stepper("weightIncrement", 0.25, (v) => `${v} ${settings.weightUnit}`, {
        title: "Weight increment",
        hint: "The smallest jump you can load; suggestions use it.",
      }),
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
      opacity: glassOn
        ? rows.stepper("opacity", 0.05, (value) => `${Math.round(value * 100)}%`, {
            title: "Background opacity",
            hint: "Higher = more solid.",
          })
        : null,
    },
    startup: [
      rows.toggle("openAtStartup", {
        title: "Open at startup",
        hint: "Launch Nabd when you log in.",
      }),
      rows.toggle("minimizedByDefault", {
        title: "Start minimized",
        hint: "Sit quietly in the tray until a set is due.",
      }),
    ],
    notice,
  };
}
