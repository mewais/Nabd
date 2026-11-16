import { NudgePolicy } from "@nabd/nudge";
import type { NudgeActions } from "./actions";
import type { StoreContext } from "./context";
import { selectPolicyStatus } from "./selectors";

/** Start, keep, renew or withdraw the pending nudge, as the clock and the plan now stand. */
export function watchNudge({ get, set }: Pick<StoreContext, "get" | "set">): void {
  const s = get();
  // An open logger is already the answer; nothing new fires over it.
  if (s.session !== null) return;
  const pendingNudge = new NudgePolicy(s.settings).latch(
    s.pendingNudge,
    selectPolicyStatus(s),
    s.now,
  );
  if (pendingNudge !== s.pendingNudge) set({ pendingNudge });
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
