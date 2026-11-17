// @nabd/nudge — decides, from the wall clock, when the user should be told to
// move, and says where nudging stands.

export { NudgePolicy, SNOOZE_MINUTES } from "./policy";
export type { NudgeContext, NudgeStatus, PendingNudge } from "./policy";
export { describeNudge, summarizeNudge } from "./wording";
export type { NudgeSummary } from "./wording";
