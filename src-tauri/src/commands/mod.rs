//! The `#[tauri::command]` surface: thin wrappers the frontend invokes.
//!
//! Commands are deliberately synchronous. Tauri runs those one at a time on
//! the main thread, in the order the frontend sent them; `async` commands run
//! on a thread pool, where two saves of the same singleton fired back to back
//! could land in the wrong order.

use tauri::ipc::Invoke;
use tauri::Runtime;

mod data;
mod native;

pub fn handler<R: Runtime>() -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        data::load_all,
        data::save_singleton,
        data::save_singletons,
        data::append_set,
        data::delete_set,
        data::export_data,
        data::import_data,
        native::platform_capabilities,
        native::notify_nudge,
        native::send_test_notification,
        native::set_glass,
        native::set_autostart,
        native::update_tray,
        native::quit,
    ]
}
