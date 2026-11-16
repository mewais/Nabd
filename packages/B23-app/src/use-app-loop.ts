import { useEffect } from "react";
import type { StoreApi } from "zustand";
import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "@nabd/store";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { createIdleSource } from "./idle-source";
import { useNabd } from "./store-context";

const TICK_MS = 1000;

/**
 * Everything that runs for the lifetime of the app: boot, the one-second
 * clock, tray menu sync and actions, and the OS notification for a due set.
 */
export function useAppLoop(store: StoreApi<NabdStore>, client: IpcClient): void {
  // Boot, then tick once a second with the latest idle reading.
  useEffect(() => {
    const idle = createIdleSource(client);
    void store.getState().hydrate();
    const timer = window.setInterval(() => {
      void idle.read().then((seconds) => store.getState().tick(seconds));
    }, TICK_MS);
    return () => {
      window.clearInterval(timer);
      idle.dispose();
    };
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

  // A set became due while the user is in another window: tell them there.
  const nudge = useNabd(selectNudgeStatus);
  const dueReason = nudge.state === "due" ? nudge.reason : null;
  useEffect(() => {
    if (dueReason !== null && nextExercise !== null && !document.hasFocus()) {
      void client.notify(dueReason, nextExercise);
    }
  }, [client, dueReason, nextExercise]);
}
