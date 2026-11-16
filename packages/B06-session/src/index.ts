// @nabd/session — logging a set: the draft being entered and the coach behind it.

export { LogSession } from "./log-session";
export { Coach } from "./coach";
export { formatPerformance, formatTarget, describeAdvice } from "./wording";
// Lives in @nabd/domain; still offered here for the screens that import it from this package.
export { formatDuration } from "@nabd/domain";
export type { AdviceWording } from "./wording";
export { describeNextSet } from "./next-set";
export type { NextSetWording } from "./next-set";
