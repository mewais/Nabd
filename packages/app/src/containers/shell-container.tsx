import type { ReactNode } from "react";
import { AppShell, buildShellVM } from "@nabd/shell";
import type { ShellActions } from "@nabd/shell";
import type { NabdActions } from "@nabd/store";
import { selectNudgeStatus, selectTodayChoice, selectTodayPlan } from "@nabd/store";
import { useNabd } from "../store-context";
import { APP_VERSION } from "../version";
import { useBoundActions, useViewModel } from "./wiring";

interface ShellContainerProps {
  /** The current screen, and whatever floats over it. */
  children: ReactNode;
}

const bind = (store: NabdActions): ShellActions => ({
  navigate: store.showScreen,
  togglePause: store.togglePause,
  toggleSkipToday: store.toggleSkipToday,
  toggleNudgeToday: store.toggleNudgeToday,
  setTheme: (theme) => store.updateSettings({ theme }),
  setGlass: (glass) => store.updateSettings({ glass }),
  openSettings: store.openSettings,
  dismissNotice: store.dismissNotice,
});

/** The app chrome, around the current screen and whatever floats over it. */
export function ShellContainer({ children }: ShellContainerProps): JSX.Element {
  const now = useNabd((s) => s.now);
  const screen = useNabd((s) => s.screen);
  const settings = useNabd((s) => s.settings);
  const capabilities = useNabd((s) => s.capabilities);
  const paused = useNabd((s) => s.dayState.paused);
  const today = useNabd(selectTodayChoice);
  const nudge = useNabd(selectNudgeStatus);
  const done = useNabd((s) => selectTodayPlan(s).plannedSetsDone);
  const planned = useNabd((s) => selectTodayPlan(s).setsPlanned);
  const notice = useNabd((s) => s.appNotice);
  const vm = useViewModel(
    ({ done, planned, ...input }) =>
      buildShellVM({ ...input, sets: { done, planned }, version: APP_VERSION }),
    { now, screen, settings, capabilities, paused, today, nudge, done, planned, notice },
  );
  const actions = useBoundActions(bind);
  return (
    <AppShell vm={vm} actions={actions}>
      {children}
    </AppShell>
  );
}
