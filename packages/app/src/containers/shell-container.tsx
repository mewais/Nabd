import { useMemo } from "react";
import type { ReactNode } from "react";
import { AppShell, buildShellVM } from "@nabd/shell";
import type { ShellActions } from "@nabd/shell";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { version } from "../../../../package.json";
import { useActions, useNabd } from "../store-context";

/** The app chrome, around the current screen and whatever floats over it. */
export function ShellContainer({ children }: { children: ReactNode }): JSX.Element {
  const store = useActions();
  const now = useNabd((s) => s.now);
  const screen = useNabd((s) => s.screen);
  const settings = useNabd((s) => s.settings);
  const glassSupported = useNabd((s) => s.capabilities.glass);
  const paused = useNabd((s) => s.paused);
  const nudge = useNabd(selectNudgeStatus);
  const plan = useNabd(selectTodayPlan);
  const notice = useNabd((s) => s.appNotice);

  const vm = useMemo(() => {
    const sets = { done: plan.plannedSetsDone, planned: plan.setsPlanned };
    return buildShellVM({
      now,
      screen,
      settings,
      glassSupported,
      paused,
      nudge,
      sets,
      notice,
      version,
    });
  }, [now, screen, settings, glassSupported, paused, nudge, plan, notice]);
  const actions = useMemo(
    (): ShellActions => ({
      navigate: store.setScreen,
      togglePause: store.togglePause,
      setTheme: (theme) => store.updateSettings({ theme }),
      setGlass: (glass) => store.updateSettings({ glass }),
      openSettings: () => store.setSettingsOpen(true),
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
