import { useEffect, useState } from "react";
import type { StoreApi } from "zustand";
import { formatClock } from "@nabd/domain";
import type { IpcClient, PlatformCapabilities } from "@nabd/ipc-client";
import { describeNudge } from "@nabd/nudge";
import { AppLayout, Sidebar, TopBar, formatDate, greeting } from "@nabd/shell";
import type { NabdStore } from "@nabd/store";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
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

/** Until the backend has answered, nothing platform-dependent is offered. */
const UNKNOWN_CAPABILITIES: PlatformCapabilities = { tray: false, glass: false, idle: false };

/** What this machine can do (asked once; it does not change while the app runs). */
function useCapabilities(client: IpcClient): PlatformCapabilities {
  const [capabilities, setCapabilities] = useState(UNKNOWN_CAPABILITIES);
  useEffect(() => {
    let current = true;
    void client.platformCapabilities().then((answer) => {
      if (current) setCapabilities(answer);
    });
    return () => {
      current = false;
    };
  }, [client]);
  return capabilities;
}

function Shell({ store, client }: AppProps): JSX.Element {
  useAppLoop(store, client);
  const capabilities = useCapabilities(client);
  const actions = useActions();
  const screen = useNabd((s) => s.screen);
  const settings = useNabd((s) => s.settings);
  const now = useNabd((s) => s.now);
  const paused = useNabd((s) => s.paused);
  const plan = useNabd(selectTodayPlan);
  const nudge = useNabd(selectNudgeStatus);

  const setsDone = plan.setsPlanned - plan.setsRemaining;
  // A stored "glass on" (say, data imported from another machine) must not
  // leave the panels see-through where the window itself cannot be.
  const glass = settings.glass && capabilities.glass;
  const Screen = SCREENS[screen];

  return (
    <AppLayout
      theme={settings.theme}
      glass={glass}
      opacity={settings.opacity}
      sidebar={
        <Sidebar
          screen={screen}
          onNavigate={actions.setScreen}
          setsDone={setsDone}
          setsTotal={plan.setsPlanned}
          pct={plan.setsPlanned > 0 ? Math.round((setsDone / plan.setsPlanned) * 100) : 0}
        />
      }
      topbar={
        <TopBar
          greeting={greeting(now.getHours())}
          dateStr={formatDate(now)}
          clockStr={formatClock(now)}
          nudgeLine={describeNudge(nudge)}
          due={nudge.state === "due"}
          paused={paused}
          onTogglePause={actions.togglePause}
          theme={settings.theme}
          onTheme={(theme) => actions.updateSettings({ theme })}
          glassAvailable={capabilities.glass}
          glass={glass}
          onToggleGlass={() => actions.updateSettings({ glass: !settings.glass })}
          onOpenSettings={() => actions.setSettingsOpen(true)}
        />
      }
    >
      <Screen />
      <SessionContainer />
      <SettingsContainer />
      <LibraryContainer />
    </AppLayout>
  );
}

export interface AppProps {
  store: StoreApi<NabdStore>;
  client: IpcClient;
}

export function App({ store, client }: AppProps): JSX.Element {
  return (
    <StoreContext.Provider value={store}>
      <Shell store={store} client={client} />
    </StoreContext.Provider>
  );
}
