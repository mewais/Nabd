import { useMemo } from "react";
import type { ReactNode } from "react";
import type { StoreApi } from "zustand";
import type { IpcClient } from "@nabd/ipc-client";
import { AppShell, buildShellVM } from "@nabd/shell";
import type { ShellActions } from "@nabd/shell";
import type { NabdStore } from "@nabd/store";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { version } from "../../../package.json";
import { LibraryContainer } from "./containers/LibraryContainer";
import { PlannerContainer } from "./containers/PlannerContainer";
import { ProgressContainer } from "./containers/ProgressContainer";
import { SessionContainer } from "./containers/SessionContainer";
import { SettingsContainer } from "./containers/SettingsContainer";
import { TodayContainer } from "./containers/TodayContainer";
import { StoreContext, useActions, useNabd } from "./store-context";
import { useAppLoop } from "./use-app-loop";

const SCREENS = {
  today: TodayContainer,
  planner: PlannerContainer,
  progress: ProgressContainer,
};

function Shell({ children }: { children: ReactNode }): JSX.Element {
  const store = useActions();
  const now = useNabd((s) => s.now);
  const screen = useNabd((s) => s.screen);
  const settings = useNabd((s) => s.settings);
  const glassSupported = useNabd((s) => s.capabilities.glass);
  const paused = useNabd((s) => s.paused);
  const nudge = useNabd(selectNudgeStatus);
  const sets = useNabd(selectTodayPlan);
  const notice = useNabd((s) => s.appNotice);

  const vm = useMemo(
    () =>
      buildShellVM({ now, screen, settings, glassSupported, paused, nudge, sets, notice, version }),
    [now, screen, settings, glassSupported, paused, nudge, sets, notice],
  );
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

function CurrentScreen(): JSX.Element {
  const Screen = SCREENS[useNabd((s) => s.screen)];
  return <Screen />;
}

export interface AppProps {
  store: StoreApi<NabdStore>;
  client: IpcClient;
}

function Main({ store, client }: AppProps): JSX.Element {
  useAppLoop(store, client);
  return (
    <Shell>
      <CurrentScreen />
      <SessionContainer />
      <SettingsContainer />
      <LibraryContainer />
    </Shell>
  );
}

export function App({ store, client }: AppProps): JSX.Element {
  return (
    <StoreContext.Provider value={store}>
      <Main store={store} client={client} />
    </StoreContext.Provider>
  );
}
