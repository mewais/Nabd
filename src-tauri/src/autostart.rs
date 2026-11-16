//! The login entry ("Open at startup"), through the autostart plugin.

use nabd_native::{AutostartChange, AUTOSTART_ARG};
use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Runtime};
use tauri_plugin_autostart::ManagerExt;

use crate::error::AppResult;
#[cfg(target_os = "linux")]
use crate::error::AppError;

/// The plugin, set up so a login launch can be told from a manual one.
pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_autostart::Builder::new()
        .arg(AUTOSTART_ARG)
        .build()
}

/// Bring the login entry in line with the setting. Safe to call at every
/// boot: see [`AutostartChange::decide`] for why a wanted entry is always rewritten.
pub fn set<R: Runtime>(app: &AppHandle<R>, wanted: bool) -> AppResult<()> {
    let entry = app.autolaunch();
    // An unreadable entry counts as absent: there is then nothing to remove.
    let registered = entry.is_enabled().unwrap_or(false);
    match AutostartChange::decide(wanted, registered, cfg!(debug_assertions)) {
        AutostartChange::Register => {
            #[cfg(target_os = "linux")]
            create_config_dir(app)?;
            entry.enable()?
        }
        AutostartChange::Unregister => entry.disable()?,
        AutostartChange::Leave => {}
    }
    Ok(())
}

/// The entry goes in `~/.config/autostart/`, but the plugin creates only that
/// last folder: on an account that has no `~/.config` yet (a fresh one, or a
/// minimal desktop that never wrote a setting) the entry could not be written.
#[cfg(target_os = "linux")]
fn create_config_dir<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
    use tauri::Manager;

    let path = app.path().home_dir()?.join(".config");
    std::fs::create_dir_all(&path).map_err(|source| AppError::AutostartDir { path, source })
}
