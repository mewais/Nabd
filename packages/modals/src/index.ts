// @nabd/modals — overlays: the set logger, the nudge toast, the exercise
// library, settings and the full-history chart. Each renders a view-model
// built here and reports through a small actions interface.

export { SessionModal } from "./session/session-modal";
export type { SessionModalProps } from "./session/session-modal";
export { buildSessionVM } from "./session/session-vm";
export type { SessionVM } from "./session/session-vm";
export type { SessionActions } from "./session/session-actions";

export { NotificationToast } from "./toast/toast";
export type { NotificationToastProps } from "./toast/toast";
export { buildToastVM } from "./toast/toast-vm";
export type { ToastVM } from "./toast/toast-vm";
export type { ToastActions } from "./toast/toast-actions";

export { LibraryModal } from "./library/library-modal";
export type { LibraryModalProps } from "./library/library-modal";
export { buildLibraryVM } from "./library/library-vm";
export type { LibraryVM } from "./library/library-vm";
export type { LibraryActions } from "./library/library-actions";

export { SettingsModal } from "./settings/settings-modal";
export type { SettingsModalProps } from "./settings/settings-modal";
export { buildSettingsVM } from "./settings/settings-vm";
export type { SettingsVM } from "./settings/settings-vm";
export type { SettingsActions } from "./settings/settings-actions";

export { ChartModal } from "./chart/chart-modal";
export type { ChartModalProps } from "./chart/chart-modal";
export { buildChartVM } from "./chart/chart-vm";
export type { ChartVM } from "./chart/chart-vm";
export type { ChartActions } from "./chart/chart-actions";
