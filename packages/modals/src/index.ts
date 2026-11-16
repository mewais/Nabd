// @nabd/modals — overlays: the set logger, the nudge toast, the exercise
// library, settings, the full-history chart and the confirmation. Each renders a view-model
// built here and reports through a small actions interface.

export { SessionModal } from "./session/session-modal";
export { buildSessionVM } from "./session/session-vm";
export type { SessionVM } from "./session/session-vm";
export type { SessionActions } from "./session/session-actions";

export { Toast } from "./toast/toast";
export { buildToastVM, nudgeNotification } from "./toast/toast-vm";
export type { ToastVM } from "./toast/toast-vm";
export type { ToastActions } from "./toast/toast-actions";

export { LibraryModal } from "./library/library-modal";
export { buildLibraryVM } from "./library/library-vm";
export type { LibraryVM } from "./library/library-vm";
export type { LibraryActions } from "./library/library-actions";

export { SettingsModal } from "./settings/settings-modal";
export { buildSettingsVM } from "./settings/settings-vm";
export type { SettingsVM } from "./settings/settings-vm";
export type { SettingsActions } from "./settings/settings-actions";

export { ConfirmModal } from "./confirm/confirm-modal";
export { buildConfirmVM } from "./confirm/confirm-vm";
export type { ConfirmSubject } from "./confirm/confirm-vm";
export type { ConfirmActions } from "./confirm/confirm-actions";

export { ChartModal } from "./chart/chart-modal";
export { buildChartVM } from "./chart/chart-vm";
export type { ChartActions } from "./chart/chart-actions";
