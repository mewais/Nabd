//! Commands over the desktop: tray, notifications, window, login entry.

use nabd_native::{nudge_notification, test_notification, Capabilities, NotifReason, TrayState};
use tauri::{AppHandle, Runtime, State};

use crate::error::AppResult;
use crate::{autostart, glass, notifications, tray, window};

#[tauri::command]
pub fn platform_capabilities(capabilities: State<'_, Capabilities>) -> Capabilities {
    *capabilities
}

/// Tell the user a set is due. A desktop notification cannot be clicked
/// through to the app on every platform, so a window hidden in the tray is
/// also put back on screen (unfocused): looking for the app finds the nudge.
#[tauri::command]
pub fn notify<R: Runtime>(
    reason: NotifReason,
    exercise: String,
    app: AppHandle<R>,
) -> AppResult<()> {
    window::reveal_quietly(&app);
    notifications::show(&app, nudge_notification(reason, &exercise))
}

#[tauri::command]
pub fn send_test_notification<R: Runtime>(app: AppHandle<R>) -> AppResult<()> {
    notifications::show(&app, test_notification())
}

#[tauri::command]
pub fn set_glass<R: Runtime>(enabled: bool, app: AppHandle<R>) -> AppResult<()> {
    Ok(glass::set(&app, enabled)?)
}

#[tauri::command]
pub fn set_autostart<R: Runtime>(enabled: bool, app: AppHandle<R>) -> AppResult<()> {
    autostart::set(&app, enabled)
}

#[tauri::command]
pub fn update_tray<R: Runtime>(state: TrayState, app: AppHandle<R>) -> AppResult<()> {
    Ok(tray::update(&app, &state)?)
}

#[tauri::command]
pub fn quit<R: Runtime>(app: AppHandle<R>) {
    app.exit(0);
}
