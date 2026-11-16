//! OS notifications. Their text is built in `nabd-native`.

use nabd_native::NotifPayload;
use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

use crate::error::AppResult;

pub fn show<R: Runtime>(app: &AppHandle<R>, payload: NotifPayload) -> AppResult<()> {
    app.notification()
        .builder()
        .title(payload.title)
        .body(payload.body)
        .show()?;
    Ok(())
}
