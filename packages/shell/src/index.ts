// @nabd/shell — the app chrome around every screen: sidebar, top bar, notice
// banner and layout. A pure view-model builder + presentational React.

export { AppShell } from "./app-shell";
export type { AppShellProps } from "./app-shell";
export type { ShellActions } from "./actions";
export { buildShellVM } from "./view-model";
export type {
  DayProgressVM,
  ShellInput,
  ShellVM,
  SidebarVM,
  StatusVM,
  TopBarVM,
} from "./view-model";
