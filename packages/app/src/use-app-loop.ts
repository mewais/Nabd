import { useEffect } from "react";
import type { StoreApi } from "zustand";
import type { IpcClient, TrayAction } from "@nabd/ipc-client";
import { buildToastVM, nudgeNotification } from "@nabd/modals";
import type { NabdStore } from "@nabd/store";
import { selectNudgeStatus, selectPendingNudge, selectTodayPlan } from "@nabd/store";
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
    return startAppClock(client, (idleSeconds, systemIdle) =>
      store.getState().tick(idleSeconds, systemIdle),
    );
  }, [store, client]);
}

/** What each tray menu action asks of the store. */
const TRAY_ACTIONS: Record<TrayAction, (store: NabdStore) => void> = {
  start: (store) => store.openSession(),
  pause: (store) => store.togglePause(),
  // Like Settings → Quit: whatever waits to be saved is saved first.
  quit: (store) => store.quit(),
};

/** Act on the tray menu, and keep it showing what is next. */
function useTray(store: StoreApi<NabdStore>, client: IpcClient): void {
  useEffect(() => {
    const subscription = client.onTrayAction((action) => TRAY_ACTIONS[action](store.getState()));
    return () =>
      bestEffort(
        "stop following the tray",
        subscription.then((stop) => stop()),
      );
  }, [store, client]);

  const plan = useNabd(selectTodayPlan);
  const paused = useNabd((s) => s.dayState.paused);
  const nextExercise = plan.nextItem?.exercise.name ?? null;
  const done = plan.plannedSetsDone;
  const total = plan.setsPlanned;
  useEffect(() => {
    bestEffort("update the tray", client.updateTray({ nextExercise, done, total, paused }));
  }, [client, nextExercise, done, total, paused]);
}

/**
 * A nudge is waiting while the user is somewhere else: tell them there, in the
 * toast's words. The store's pending nudge becomes a new object when it fires
 * and each time it is due a reminder (once per interval), so this notifies
 * exactly then — and never while the window, which shows the toast, has focus.
 */
function useNudgeNotification(store: StoreApi<NabdStore>, client: IpcClient): void {
  const pending = useNabd(selectPendingNudge);
  useEffect(() => {
    if (pending === null || document.hasFocus()) return;
    const state = store.getState();
    const toast = buildToastVM(selectTodayPlan(state).nextItem, selectNudgeStatus(state));
    if (toast === null) return;
    bestEffort("show the nudge notification", client.notifyNudge(nudgeNotification(toast)));
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
