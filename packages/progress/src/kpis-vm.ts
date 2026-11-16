import type { TrainingStats } from "@nabd/analytics";
import type { StatFigure } from "@nabd/design-system";

/** The headline figures across the top of the screen. */
export function buildKpisVM(stats: TrainingStats): StatFigure[] {
  return [
    {
      label: "Current streak",
      value: String(stats.streak()),
      unit: "days",
      hint: "Workdays in a row with a set; days off neither add to it nor break it.",
    },
    { label: "Completion this wk", value: String(stats.completionThisWeek()), unit: "%" },
    { label: "Sets this week", value: String(stats.setsThisWeek()), unit: "sets" },
    { label: "Active days 30d", value: String(stats.activeDays()), unit: "days" },
  ];
}
