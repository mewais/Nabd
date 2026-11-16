import { NudgePolicy } from "@nabd/nudge";
import type { StoreContext } from "./context";
import { loadNotice, readSnapshot } from "./hydration";
import { applyAutostart, applyGlass } from "./os";
import { beginDay } from "./rollover";
import { selectPlannerDayToOpen, selectPolicyStatus } from "./selectors";
import type { DaySlice } from "./slices";
import { errorText } from "./state";
import type { LoadProblem } from "./state";

/** Start, keep, renew or withdraw the pending nudge, as the clock and the plan now stand. */
function watchNudge({ get, set }: Pick<StoreContext, "get" | "set">): void {
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

/** The app's heartbeat: boot, then one beat a second. */
export function daySlice(ctx: StoreContext): DaySlice {
  const { get, set, client, now, attempt, persist, flushSets } = ctx;

  /** Bring the OS in line with the stored settings, and learn what it can do. */
  function syncDesktop(): void {
    const { settings } = get();
    applyAutostart(ctx, settings.openAtStartup);
    applyGlass(ctx, settings.glass);
    void attempt("ask what this computer supports", async () =>
      set({ capabilities: await client.platformCapabilities() }),
    );
  }

  return {
    hydrate: async () => {
      let snapshot;
      try {
        snapshot = await client.loadAll();
      } catch (e) {
        const problems: LoadProblem[] = [{ source: "everything", detail: errorText(e) }];
        set({ loadProblems: problems, appNotice: loadNotice(problems), booted: true });
        return;
      }
      const loaded = readSnapshot(snapshot, now());
      const { state } = loaded;
      set({
        ...state,
        // What is stored was just read afresh: nothing of it is waiting to be saved.
        unsavedSets: [],
        loadProblems: loaded.problems,
        appNotice: loadNotice(loaded.problems, loaded.resetSettings),
        now: now(),
        booted: true,
      });
      set((s) => ({ plannerDayId: selectPlannerDayToOpen(s) }));
      for (const key of loaded.repaired) persist(key, state[key]);
      // Make sure the day we are on is on record, so the next launch can roll it over.
      if (!beginDay(ctx)) persist("dayState", get().dayState);
      watchNudge(ctx);
      syncDesktop();
    },

    tick: (idleSeconds, systemIdle) => {
      const { capabilities } = get();
      set({
        now: now(),
        idleSeconds,
        capabilities:
          capabilities.idle === systemIdle ? capabilities : { ...capabilities, idle: systemIdle },
      });
      beginDay(ctx);
      watchNudge(ctx);
      if (get().unsavedSets.length > 0) void flushSets();
    },
  };
}
