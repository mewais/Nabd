// The rows every settings section is made of: each carries, ready to apply,
// the change each of its controls makes.

import type { Option } from "@nabd/design-system";
import type { NumericSetting, Settings } from "@nabd/domain";
import { SETTING_STEPS, roundTo } from "@nabd/domain";
import { buildChipsVM } from "../chips-vm";
import type { ChipsVM } from "../chips-vm";

/** A change to apply to the settings. */
export type SettingsPatch = Partial<Settings>;

/** What names a row: its title, and a line explaining it. */
interface RowText {
  title: string;
  hint: string;
}

/** A numeric setting stepped with −/+. */
export interface StepperRowVM extends RowText {
  /** The current value with its unit: "50 min". */
  value: string;
  decrease: SettingsPatch;
  increase: SettingsPatch;
}

/** An on/off setting. */
export interface ToggleRowVM extends RowText {
  on: boolean;
  /** The patch that flips it. */
  flip: SettingsPatch;
  /** The setting has no effect on this computer (the hint says why), so it cannot be flipped. */
  disabled: boolean;
}

/** A setting that holds any number of values, each switched on and off with a chip. */
export interface ChipsRowVM<V extends string | number> extends RowText, ChipsVM<V, SettingsPatch> {}

type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** The finest step any setting has (0.05, 0.25) needs two decimals. */
const STEP_DECIMALS = 2;

/** Builds rows over one `Settings` value. */
export class SettingsRows {
  constructor(private readonly settings: Settings) {}

  /** A row that moves `key` by its step ({@link SETTING_STEPS}). */
  stepper(key: NumericSetting, show: (value: number) => string, text: RowText): StepperRowVM {
    const value = this.settings[key];
    const step = SETTING_STEPS[key];
    return {
      ...text,
      value: show(value),
      decrease: { [key]: roundTo(value - step, STEP_DECIMALS) },
      increase: { [key]: roundTo(value + step, STEP_DECIMALS) },
    };
  }

  /** A row that flips `key`; `disabled` where it has no effect on this computer. */
  toggle(key: BooleanSetting, text: RowText & { disabled?: boolean }): ToggleRowVM {
    const on = this.settings[key];
    return { disabled: false, ...text, on, flip: { [key]: !on } };
  }

  /**
   * A row of chips over `options` with the values of `selected` on; `patchOf`
   * makes the patch that leaves a list of values on.
   */
  chips<V extends string | number>(
    options: readonly Option<V>[],
    selected: readonly V[],
    patchOf: (values: V[]) => SettingsPatch,
    text: RowText,
  ): ChipsRowVM<V> {
    return { ...text, ...buildChipsVM(options, selected, patchOf) };
  }
}
