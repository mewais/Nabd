// @nabd/progression — what to do next for an exercise, and how it has trended.

export { ExerciseHistory, assistedScore, strengthScore } from "./history";
export type { Performance } from "./history";
export { ProgressionAdvisor } from "./advisor";
export type { Advice, AdviceKind, AdviceRequest } from "./advisor";
export { exerciseTrends, trendPoints } from "./trend";
export { formatAmount, formatGain } from "./trend-wording";
export type { ExerciseTrend } from "./trend";
