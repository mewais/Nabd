import { NudgePolicy } from "@nabd/nudge";
import type { StoreContext } from "./context";
import type { NudgeSlice } from "./slices";

export function nudgeSlice({ get, set, now, save }: StoreContext): NudgeSlice {
  return {
    snooze: () => set({ snoozedUntil: NudgePolicy.snoozeUntil(now()), pendingNudge: null }),

    togglePause: () => {
      const { dayState } = get();
      set({ pendingNudge: null });
      save("dayState", { ...dayState, paused: !dayState.paused });
    },

    toggleSkipToday: () => {
      const { dayState } = get();
      set({ pendingNudge: null });
      save("dayState", {
        ...dayState,
        override: dayState.override === "skipped" ? null : "skipped",
      });
    },

    toggleNudgeToday: () => {
      const { dayState } = get();
      const nudged = dayState.override !== "nudged";
      // Nudging asked for counts from now, as from a launch (see NudgeContext.activeSince).
      set({ pendingNudge: null, ...(nudged && { activeSince: now() }) });
      save("dayState", { ...dayState, override: nudged ? "nudged" : null });
    },
  };
}
