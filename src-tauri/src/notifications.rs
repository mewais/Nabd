//! Raising OS notifications.

use nabd_native::DesktopNotification;
use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

use crate::error::AppResult;

pub fn show<R: Runtime>(app: &AppHandle<R>, notification: DesktopNotification) -> AppResult<()> {
    app.notification()
        .builder()
        .title(notification.title)
        .body(notification.body)
        .show()?;
    Ok(())
}
