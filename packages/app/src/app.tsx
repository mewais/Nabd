import type { StoreApi } from "zustand";
import type { Screen } from "@nabd/domain";
import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "@nabd/store";
import { ChartContainer } from "./containers/chart-container";
import { LibraryContainer } from "./containers/library-container";
import { PlannerContainer } from "./containers/planner-container";
import { ProgressContainer } from "./containers/progress-container";
import { SessionContainer } from "./containers/session-container";
import { SettingsContainer } from "./containers/settings-container";
import { ShellContainer } from "./containers/shell-container";
import { ToastContainer } from "./containers/toast-container";
import { TodayContainer } from "./containers/today-container";
import { StoreProvider, useNabd } from "./store-context";
import { useAppLoop } from "./use-app-loop";

const SCREENS: Record<Screen, () => JSX.Element> = {
  today: TodayContainer,
  planner: PlannerContainer,
  progress: ProgressContainer,
};

function CurrentScreen(): JSX.Element {
  const Screen = SCREENS[useNabd((s) => s.screen)];
  return <Screen />;
}

interface AppProps {
  store: StoreApi<NabdStore>;
  client: IpcClient;
}

/** The shell around the current screen, with whatever floats over it. */
function Main({ store, client }: AppProps): JSX.Element {
  useAppLoop(store, client);
  return (
    <ShellContainer>
      <CurrentScreen />
      <ToastContainer />
      <SessionContainer />
      <ChartContainer />
      <SettingsContainer />
      <LibraryContainer />
    </ShellContainer>
  );
}

export function App({ store, client }: AppProps): JSX.Element {
  return (
    <StoreProvider value={store}>
      <Main store={store} client={client} />
    </StoreProvider>
  );
}
