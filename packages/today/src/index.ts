// @nabd/today — the Today screen: what to do next, today's queue, muscle
// coverage and a few stats. Pure view-model builders + presentational React.

export { TodayScreen } from "./today-screen";
export type { TodayScreenProps } from "./today-screen";
export type { TodayActions } from "./actions";
export { buildTodayVM } from "./view-model";
export type { StatTileVM, TodayInput, TodayVM } from "./view-model";
export type { HeroNoticeVM, HeroVM, NextSetVM } from "./hero-vm";
export type { QueueRowVM } from "./queue-vm";
export type { CoverageVM, InsightRowVM, LegendRowVM } from "./coverage-vm";
