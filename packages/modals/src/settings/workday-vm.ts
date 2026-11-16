import type { Settings, Weekday } from "@nabd/domain";
import { APP_NAME, formatMinuteOfDay } from "@nabd/domain";
import { WORKDAY_OPTIONS } from "../options";
import type { ChipsRowVM, SettingsRows, StepperRowVM } from "./rows-vm";

/** The workday: its hours, and the weekdays it is worked on. */
export interface WorkdayVM {
  hours: StepperRowVM[];
  days: ChipsRowVM<Weekday>;
}

export function buildWorkdayVM(settings: Settings, rows: SettingsRows): WorkdayVM {
  return {
    hours: [
      rows.stepper("workStart", formatMinuteOfDay, {
        title: "Starts",
        hint: `${APP_NAME} stays silent before this.`,
      }),
      rows.stepper("workEnd", formatMinuteOfDay, { title: "Ends", hint: "…and after this." }),
    ],
    days: rows.chips(WORKDAY_OPTIONS, settings.workDays, (workDays) => ({ workDays }), {
      title: "Working days",
      hint: `${APP_NAME} stays quiet on the others, though you can still log. At least one stays on.`,
    }),
  };
}
