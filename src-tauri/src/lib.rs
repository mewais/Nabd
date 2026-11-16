//! The Tauri binary: wires the SQLite command core, the tray, the clock,
//! notifications, autostart and window behaviour together.
//!
//! The app lives in the tray: closing the window only hides it, so nudges keep
//! coming. Where no tray exists (stock GNOME) it behaves like an ordinary
//! window instead — see `nabd_native::CloseAction` and `Launch`.

use nabd_native::{Capabilities, DesktopNotification, Launch};
use tauri::{App, AppHandle, Manager, Runtime};

#[cfg(target_os = "macos")]
mod app_menu;
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
use error::{AppError, AppResult};
use idle::IdleMonitor;

#[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
compile_error!(
    "Nabd supports Windows, macOS and Linux only: the idle, tray and window code has no backend for this target."
);

/// Exit code of a launch that could not start.
const STARTUP_FAILURE: i32 = 1;

pub fn run() -> AppResult<()> {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "macos")]
    let builder = builder.menu(app_menu::build);
    builder
        // First, so a second launch hands over before any other plugin or the
        // setup hook has touched the database, the tray or the login entry.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // A login launch that finds the app already running asks for nothing.
            if !Launch::is_autostart(&argv) {
                window::reveal(app);
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(autostart::plugin())
        .setup(|app| {
            // Tauri panics on a setup error, so a failed start is reported
            // and turned into a plain failing exit here instead. Nothing is
            // on screen yet, and the event loop would report success.
            if let Err(error) = start(app) {
                report_startup_failure(app.handle(), &error);
                std::process::exit(STARTUP_FAILURE);
            }
            Ok(())
        })
        .on_window_event(window::on_window_event)
        .invoke_handler(commands::handler())
        .build(tauri::generate_context!())?
        .run(window::on_run_event);
    Ok(())
}

fn start<R: Runtime>(app: &mut App<R>) -> AppResult<()> {
    let handle = app.handle().clone();
    let args: Vec<String> = std::env::args().collect();
    let autostart = Launch::is_autostart(&args);

    // Before the window exists: its close handler reads the capabilities,
    // and its glass effect the platform.
    let idle = IdleMonitor::connect();
    let platform = platform::detect(autostart);
    let capabilities = Capabilities::decide(platform, idle.is_available());
    app.manage(platform);
    app.manage(capabilities);

    let db = Database::open_in(&handle.path().app_data_dir()?)?;
    // Unreadable settings must not keep the app from starting: default to shown.
    let start_minimized = db
        .with(nabd_ipc::DataCommands::starts_minimized)
        .unwrap_or(false);
    app.manage(db);

    window::create(&handle, platform)?;
    if capabilities.tray {
        tray::build(&handle)?;
    }
    clock::spawn(handle.clone(), idle)?;

    let launch = Launch {
        autostart,
        start_minimized,
        tray: capabilities.tray,
    };
    if !launch.starts_hidden() {
        window::reveal(&handle);
    }
    Ok(())
}

/// The window never appeared, so the only places to say why are the OS
/// notification area and, for a launch from a terminal, stderr.
fn report_startup_failure<R: Runtime>(app: &AppHandle<R>, error: &AppError) {
    let name = &app.package_info().name;
    eprintln!("{name} could not start: {error}");
    // If even this fails there is nowhere left to report to.
    let _ = notifications::show(app, DesktopNotification::startup_failure(name, error));
}
