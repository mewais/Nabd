//! The app clock: one `tick` event a second, carrying the idle time.
//!
//! It lives here rather than in the webview because timers in a hidden
//! webview are throttled or suspended — and hidden in the tray is this app's
//! normal state. Sampling on a thread of its own also keeps a slow desktop
//! service from ever blocking the UI thread.

use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

use crate::error::{AppError, AppResult};
use crate::idle::IdleMonitor;

const TICK_EVENT: &str = "tick";
const TICK_EVERY: Duration = Duration::from_secs(1);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Tick {
    /// Seconds since the last system-wide input; null when the OS cannot say.
    idle_seconds: Option<u64>,
}

/// Start ticking for the rest of the process's life.
pub fn spawn<R: Runtime>(app: AppHandle<R>, mut idle: IdleMonitor) -> AppResult<()> {
    thread::Builder::new()
        .name("nabd-clock".into())
        .spawn(move || loop {
            let tick = Tick {
                idle_seconds: idle.idle_seconds(),
            };
            // Emitting only fails while the app is shutting down.
            let _ = app.emit(TICK_EVENT, tick);
            thread::sleep(TICK_EVERY);
        })
        .map_err(AppError::Clock)?;
    Ok(())
}
