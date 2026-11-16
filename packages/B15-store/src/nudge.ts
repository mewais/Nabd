import { NudgePolicy } from "@nabd/nudge";
import type { NudgeActions } from "./actions";
import type { StoreContext } from "./context";
import { selectPolicyStatus, selectTodayPlan } from "./selectors";

/** Keep the nudge bookkeeping in step with the clock and the plan. */
export function watchNudge({ get, set }: Pick<StoreContext, "get" | "set">): void {
  const s = get();
  const hasWork = selectTodayPlan(s).setsRemaining > 0;
  const activeSince = hasWork ? (s.activeSince ?? s.now) : null;
  const status = selectPolicyStatus({ ...s, activeSince });
  // An open logger is already the answer; nothing new fires over it.
  const pendingNudge =
    s.session === null ? NudgePolicy.latch(s.pendingNudge, status, s.now) : s.pendingNudge;
  if (activeSince !== s.activeSince || pendingNudge !== s.pendingNudge) {
    set({ activeSince, pendingNudge });
  }
}

export function nudgeActions({ get, set, now, save }: StoreContext): NudgeActions {
  return {
    snooze: () => set({ snoozedUntil: NudgePolicy.snoozeUntil(now()), pendingNudge: null }),

    togglePause: () => {
      const paused = !get().paused;
      set({ paused, pendingNudge: null });
      save("dayState", { ...get().dayState, paused });
    },
  };
}
