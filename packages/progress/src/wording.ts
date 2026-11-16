// How the Progress screen words its cards, hours and the absence of sets.

/** What the Progress screen's components say. */
export const WORDS = {
  completion: "Completion rate",
  completionHint: "Planned sets actually done",
  thisWeek: "this week",
  lastSevenDays: "Last 7 days",
  completionByDay: "Completion by day",
  consistency: "Consistency",
  consistencyView: "Consistency view",
  less: "Less",
  more: "More",
  weekly: "Sets per week · last 8 weeks",
  setsPerWeek: "Sets per week",
  heatmap: "Sets per muscle",
  heatmapHint: "7-day coverage",
  progression: "Progression & records",
  exercise: "Exercise",
  trend: "Trend",
  best: "Best",
  gain: "Gain",
  timeOfDay: "Time of day",
  timeOfDayHint: "When you fit sets into the workday",
  setsByHour: "Sets by hour",
  triggers: "What prompts a set",
  triggersHint: "Idle detection vs timer vs manual",
} as const;

/** The opening of every "nothing yet" note about logged sets. */
export const NOTHING_LOGGED = "No sets logged yet.";

/** "9a", "12p", "6p". */
export function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`;
}
