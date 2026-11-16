// @nabd/progression — what to do next for an exercise, and how it has trended.

export { ExerciseHistory, assistedScore, strengthScore } from "./history";
export type { Performance } from "./history";
export { ProgressionAdvisor, repGoal } from "./advisor";
export type { Advice, AdviceKind, RepGoal } from "./advisor";
export { exerciseTrends, formatAmount, formatGain, trendPoints } from "./trend";
export type { ExerciseTrend } from "./trend";
