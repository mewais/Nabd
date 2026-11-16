import type { Equipment, Settings, WeightUnit } from "@nabd/domain";
import { editableWeight } from "@nabd/domain";
import { EQUIPMENT_OPTIONS } from "../options";
import type { ChipsRowVM, SettingsRows, StepperRowVM } from "./rows-vm";

/** The user's body weight, typed in the display unit. */
interface BodyWeightVM {
  /** In the display unit; null while not given (the field is empty). */
  value: number | null;
  hint: string;
}

/** How loads are shown and stepped, the user's body weight, and the equipment they own. */
export interface TrainingVM {
  unit: WeightUnit;
  increment: StepperRowVM;
  bodyWeight: BodyWeightVM;
  equipment: ChipsRowVM<Equipment>;
}

export function buildTrainingVM(settings: Settings, rows: SettingsRows): TrainingVM {
  const { weightUnit: unit, bodyWeight } = settings;
  return {
    unit,
    increment: rows.stepper("weightIncrement", (v) => `${v} ${unit}`, {
      title: "Weight increment",
      hint:
        "The smallest jump you can load; suggestions use it. Changing the unit moves the " +
        "usual step along (2.5 kg ↔ 5 lb) and leaves a step of your own as it is.",
    }),
    bodyWeight: {
      value: bodyWeight === null ? null : editableWeight(bodyWeight, unit),
      hint:
        `In ${unit}. With it, a %1RM or an RPE can set the added weight (or ` +
        "assistance) of dips, pull-ups and the like; left empty, those exercises ignore them.",
    },
    equipment: rows.chips(EQUIPMENT_OPTIONS, settings.equipment, (equipment) => ({ equipment }), {
      title: "My equipment",
      hint: "The exercise library only offers what you can do with these.",
    }),
  };
}
