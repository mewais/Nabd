// @nabd/session — logging a set: the draft being entered, the coach behind it,
// and how sets, targets and advice are worded.

export { LogSession } from "./log-session";
export { Coach } from "./coach";
export {
  describeAdvice,
  describeSetPosition,
  formatPerformance,
  formatSetTally,
  formatTarget,
} from "./wording";
export type { AdviceWording } from "./wording";
export { describeNextSet } from "./next-set";
export type { NextSetWording } from "./next-set";
