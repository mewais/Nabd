import { useEffect } from "react";
import type { StoreApi } from "zustand";
import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "@nabd/store";
import { selectPendingNudge, selectTodayPlan } from "@nabd/store";
import { startAppClock } from "./app-clock";
import { useNabd } from "./store-context";

/**
 * The tray and the OS notification mirror what the window already shows, so a
 * call that fails costs nothing the user needs: it is logged, never surfaced.
 */
function bestEffort(what: string, call: Promise<unknown>): void {
  call.catch((error: unknown) => console.warn(`Could not ${what}:`, error));
}

/** Boot, then follow the app clock for as long as the app runs. */
function useClock(store: StoreApi<NabdStore>, client: IpcClient): void {
  useEffect(() => {
    void store.getState().hydrate();
    return startAppClock(client, (idleSeconds) => store.getState().tick(idleSeconds));
  }, [store, client]);
}

/** Act on the tray menu, and keep it showing what is next. */
function useTray(store: StoreApi<NabdStore>, client: IpcClient): void {
  useEffect(() => {
    const subscription = client.onTrayAction((action) => {
      if (action === "start") store.getState().openSession();
      else store.getState().togglePause();
    });
    return () =>
      bestEffort(
        "stop following the tray",
        subscription.then((stop) => stop()),
      );
  }, [store, client]);

  const plan = useNabd(selectTodayPlan);
  const paused = useNabd((s) => s.paused);
  const nextExercise = plan.nextItem?.exercise.name ?? null;
  const done = plan.plannedSetsDone;
  const total = plan.setsPlanned;
  useEffect(() => {
    bestEffort("update the tray", client.updateTray({ nextExercise, done, total, paused }));
  }, [client, nextExercise, done, total, paused]);
}

/**
 * A nudge fired while the user is somewhere else: tell them there. The store's
 * pending nudge is the one source of truth — it becomes a new object exactly
 * once per nudge, so this notifies once per nudge too.
 */
function useNudgeNotification(store: StoreApi<NabdStore>, client: IpcClient): void {
  const pending = useNabd(selectPendingNudge);
  useEffect(() => {
    const exercise = selectTodayPlan(store.getState()).nextItem?.exercise.name;
    if (pending === null || exercise === undefined || document.hasFocus()) return;
    bestEffort("show the nudge notification", client.notify(pending.reason, exercise));
  }, [store, client, pending]);
}

/**
 * Everything that runs for the lifetime of the app: boot, the one-second
 * clock, tray menu sync and actions, and the OS notification for a due set.
 */
export function useAppLoop(store: StoreApi<NabdStore>, client: IpcClient): void {
  useClock(store, client);
  useTray(store, client);
  useNudgeNotification(store, client);
}
