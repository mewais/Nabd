import { useEffect } from "react";
import type { StoreApi } from "zustand";
import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "@nabd/store";
import { selectPendingNudge, selectTodayPlan } from "@nabd/store";
import { startAppClock } from "./app-clock";
import { useNabd } from "./store-context";

/**
 * Everything that runs for the lifetime of the app: boot, the one-second
 * clock, tray menu sync and actions, and the OS notification for a due set.
 */
export function useAppLoop(store: StoreApi<NabdStore>, client: IpcClient): void {
  // Boot, then follow the app clock.
  useEffect(() => {
    void store.getState().hydrate();
    return startAppClock(client, (idleSeconds) => store.getState().tick(idleSeconds));
  }, [store, client]);

  // Tray menu actions.
  useEffect(() => {
    const subscription = client.onTrayAction((action) => {
      if (action === "start") store.getState().openSession();
      else store.getState().togglePause();
    });
    return () => {
      void subscription.then((unsubscribe) => unsubscribe());
    };
  }, [store, client]);

  // Keep the tray menu showing what is next.
  const plan = useNabd(selectTodayPlan);
  const paused = useNabd((s) => s.paused);
  const nextExercise = plan.nextItem?.exercise.name ?? null;
  const done = plan.setsPlanned - plan.setsRemaining;
  const total = plan.setsPlanned;
  useEffect(() => {
    void client.updateTray({ nextExercise, done, total, paused });
  }, [client, nextExercise, done, total, paused]);

  // A nudge fired while the user is somewhere else: tell them there. The
  // store's pending nudge is the one source of truth — it becomes a new object
  // exactly once per nudge, so this runs once per nudge too.
  const pending = useNabd(selectPendingNudge);
  useEffect(() => {
    const exercise = selectTodayPlan(store.getState()).nextItem?.exercise.name;
    if (pending === null || exercise === undefined || document.hasFocus()) return;
    void client.notify(pending.reason, exercise);
  }, [store, client, pending]);
}
