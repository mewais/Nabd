// @nabd/shell — the app chrome around every screen: sidebar, top bar, notice
// banner and layout. A pure view-model builder + presentational React.

export { AppShell } from "./app-shell";
export type { AppShellProps } from "./app-shell";
export type { ShellActions } from "./actions";
export type { Screen } from "./nav-items";
export { buildShellVM } from "./view-model";
export type {
  DayProgressVM,
  NoticeVM,
  ShellInput,
  ShellVM,
  SidebarVM,
  StatusVM,
  TopBarVM,
} from "./view-model";
