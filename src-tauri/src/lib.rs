//! The Tauri binary: wires the SQLite command core, the tray, the clock,
//! notifications, autostart and window behaviour together.
//!
//! The app lives in the tray: closing the window only hides it, so nudges keep
//! coming. Where no tray exists (stock GNOME) it behaves like an ordinary
//! window instead — see `nabd_native::close_action` and `starts_hidden`.

use nabd_native::{is_autostart_launch, starts_hidden, Launch, NotifPayload};
use tauri::{App, AppHandle, Manager, Runtime};

mod autostart;
mod clock;
mod commands;
mod db;
mod error;
mod export;
mod glass;
mod idle;
mod notifications;
mod platform;
mod tray;
mod window;

use db::Database;
use error::AppResult;
use idle::IdleMonitor;

/// Exit code of a launch that could not start.
const STARTUP_FAILURE: i32 = 1;

pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        // First, so a second launch hands over before any other plugin or the
        // setup hook has touched the database, the tray or the login entry.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // A login launch that finds the app already running asks for nothing.
            if !is_autostart_launch(&argv) {
                window::reveal(app);
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(autostart::plugin())
        .setup(|app| {
            // Tauri panics on a setup error, so a failed start is reported
            // and turned into a clean exit here instead.
            if let Err(error) = start(app) {
                report_startup_failure(app.handle(), &error);
                app.handle().exit(STARTUP_FAILURE);
            }
            Ok(())
        })
        .on_window_event(window::on_window_event)
        .invoke_handler(commands::handler())
        .run(tauri::generate_context!())
}

fn start<R: Runtime>(app: &mut App<R>) -> AppResult<()> {
    let handle = app.handle().clone();
    let args: Vec<String> = std::env::args().collect();
    let autostart = is_autostart_launch(&args);

    // Capabilities first: the window-close handler reads them.
    let idle = IdleMonitor::connect();
    let capabilities = platform::capabilities(autostart, idle.is_available());
    app.manage(capabilities);

    let db = Database::open_in(&handle.path().app_data_dir()?)?;
    // Unreadable settings must not keep the app from starting: default to shown.
    let start_minimized = db.with(nabd_ipc::starts_minimized).unwrap_or(false);
    app.manage(db);

    if capabilities.tray {
        tray::build(&handle)?;
    }
    clock::spawn(handle.clone(), idle)?;

    let launch = Launch {
        autostart,
        start_minimized,
        tray: capabilities.tray,
    };
    if !starts_hidden(launch) {
        window::reveal(&handle);
    }
    Ok(())
}

/// The window never appeared, so the only places to say why are the OS
/// notification area and, for a launch from a terminal, stderr.
fn report_startup_failure<R: Runtime>(app: &AppHandle<R>, error: &error::AppError) {
    eprintln!("Nabd could not start: {error}");
    let payload = NotifPayload {
        title: "Nabd could not start".to_string(),
        body: error.to_string(),
    };
    // If even this fails there is nowhere left to report to.
    let _ = notifications::show(app, payload);
}
