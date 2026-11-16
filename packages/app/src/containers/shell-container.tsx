import { useMemo } from "react";
import type { ReactNode } from "react";
import { AppShell, buildShellVM } from "@nabd/shell";
import type { ShellActions } from "@nabd/shell";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { useActions, useNabd } from "../store-context";
import { APP_VERSION } from "../version";

interface ShellContainerProps {
  /** The current screen, and whatever floats over it. */
  children: ReactNode;
}

/** The app chrome, around the current screen and whatever floats over it. */
export function ShellContainer({ children }: ShellContainerProps): JSX.Element {
  const store = useActions();
  const now = useNabd((s) => s.now);
  const screen = useNabd((s) => s.screen);
  const settings = useNabd((s) => s.settings);
  const capabilities = useNabd((s) => s.capabilities);
  const paused = useNabd((s) => s.dayState.paused);
  const nudge = useNabd(selectNudgeStatus);
  const plan = useNabd(selectTodayPlan);
  const notice = useNabd((s) => s.appNotice);

  const vm = useMemo(() => {
    const sets = { done: plan.plannedSetsDone, planned: plan.setsPlanned };
    return buildShellVM({
      now,
      screen,
      settings,
      capabilities,
      paused,
      nudge,
      sets,
      notice,
      version: APP_VERSION,
    });
  }, [now, screen, settings, capabilities, paused, nudge, plan, notice]);
  const actions = useMemo(
    (): ShellActions => ({
      navigate: store.showScreen,
      togglePause: store.togglePause,
      setTheme: (theme) => store.updateSettings({ theme }),
      setGlass: (glass) => store.updateSettings({ glass }),
      openSettings: store.openSettings,
      dismissNotice: store.dismissNotice,
    }),
    [store],
  );

  return (
    <AppShell vm={vm} actions={actions}>
      {children}
    </AppShell>
  );
}
