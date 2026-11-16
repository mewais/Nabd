import type { ReactNode } from "react";
import { ThemeProvider } from "@nabd/design-system";
import { AppLayout } from "./app-layout";
import { NoticeBanner } from "./notice-banner";
import type { ShellActions } from "./shell-actions";
import type { ShellVM } from "./shell-vm";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AppShellProps {
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
        sidebar={<Sidebar vm={vm.sidebar} actions={actions} />}
        topBar={<TopBar vm={vm.topBar} actions={actions} />}
        notice={vm.notice && <NoticeBanner vm={vm.notice} actions={actions} />}
      >
        {children}
      </AppLayout>
    </ThemeProvider>
  );
}
