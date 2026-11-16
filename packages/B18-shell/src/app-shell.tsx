import type { ReactNode } from "react";
import { ThemeProvider } from "@nabd/design-system";
import type { ShellActions } from "./actions";
import { AppLayout } from "./app-layout";
import { NoticeBanner } from "./notice-banner";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import type { ShellVM } from "./view-model";

export interface AppShellProps {
  vm: ShellVM;
  actions: ShellActions;
  /** The current screen, and whatever floats over it. */
  children: ReactNode;
}

/** The themed app chrome around the current screen. */
export function AppShell({ vm, actions, children }: AppShellProps): JSX.Element {
  return (
    <ThemeProvider theme={vm.theme} glass={vm.glass} opacity={vm.opacity}>
      <AppLayout
        sidebar={<Sidebar vm={vm.sidebar} onNavigate={actions.navigate} />}
        topBar={<TopBar vm={vm.topBar} actions={actions} />}
        notice={vm.notice && <NoticeBanner notice={vm.notice} onDismiss={actions.dismissNotice} />}
      >
        {children}
      </AppLayout>
    </ThemeProvider>
  );
}
