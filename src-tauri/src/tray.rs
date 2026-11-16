//! The tray icon and its menu. What the menu says and what each entry does is
//! decided in `nabd-native`; this renders it and carries the commands out.

use std::thread;
use std::time::Duration;

use nabd_native::{TrayCommand, TrayState};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Runtime};

use crate::error::AppResult;
use crate::window;

const TRAY_ID: &str = "nabd-tray";
/// Carries a tray action ("start" | "pause" | "quit") to the frontend, which
/// owns the workout state.
const TRAY_ACTION_EVENT: &str = "tray-action";
/// How long the frontend gets to answer a tray Quit — it saves what is still
/// waiting to be saved, then asks to exit — before the app exits regardless.
const QUIT_GRACE: Duration = Duration::from_secs(3);

/// macOS's convention: a menu-bar item opens its menu on a left click (the
/// window comes back from the Dock or the menu's Open entry).
const MENU_ON_LEFT_CLICK: bool = cfg!(target_os = "macos");

/// Create the tray icon. On Windows a left click opens the window and the
/// menu is on right click; on macOS a click opens the menu; Linux indicators
/// only ever open their menu, and show no tooltip.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
    let state = TrayState::default();
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu(app, &state)?)
        .tooltip(state.tooltip())
        .show_menu_on_left_click(MENU_ON_LEFT_CLICK)
        .on_menu_event(|app, event| run_menu_entry(app, event.id().as_ref()));
    if !MENU_ON_LEFT_CLICK {
        tray = tray.on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                window::reveal(tray.app_handle());
            }
        });
    }
    #[cfg(target_os = "linux")]
    let tray = tray.temp_dir_path(icon_dir(app)?);
    with_icon(tray, app)?.build(app)?;
    Ok(())
}

/// Linux indicators show the icon from a file, which the tray library writes
/// to `$XDG_RUNTIME_DIR/tray-icon` or, without that variable, to a shared
/// `/tmp/tray-icon` — where another user's folder of that name makes the
/// write, and so the launch, fail. The app's own cache folder is private.
#[cfg(target_os = "linux")]
fn icon_dir<R: Runtime>(app: &AppHandle<R>) -> AppResult<std::path::PathBuf> {
    use tauri::Manager;

    Ok(app.path().app_cache_dir()?.join("tray-icon"))
}

/// The menu bar tints a monochrome "template" image for light and dark bars;
/// the colourful app icon would show as a solid black blob there.
#[cfg(target_os = "macos")]
fn with_icon<R: Runtime>(
    tray: TrayIconBuilder<R>,
    _app: &AppHandle<R>,
) -> AppResult<TrayIconBuilder<R>> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-template.png"))?;
    Ok(tray.icon(icon).icon_as_template(true))
}

#[cfg(not(target_os = "macos"))]
fn with_icon<R: Runtime>(
    tray: TrayIconBuilder<R>,
    app: &AppHandle<R>,
) -> AppResult<TrayIconBuilder<R>> {
    Ok(match app.default_window_icon() {
        Some(icon) => tray.icon(icon.clone()),
        None => tray,
    })
}

/// Make the menu and tooltip reflect `state`. Nothing to do without a tray.
pub fn update<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> AppResult<()> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(());
    };
    tray.set_menu(Some(menu(app, state)?))?;
    tray.set_tooltip(Some(state.tooltip()))?;
    Ok(())
}

fn menu<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> AppResult<Menu<R>> {
    let menu = Menu::new(app)?;
    for item in state.items() {
        menu.append(&MenuItem::with_id(
            app,
            item.id,
            item.label,
            item.enabled,
            None::<&str>,
        )?)?;
    }
    Ok(menu)
}

fn run_menu_entry<R: Runtime>(app: &AppHandle<R>, id: &str) {
    if let Some(command) = TrayCommand::from_id(id) {
        run(app, command);
    }
}

/// Carry out a tray command. Quit also comes from elsewhere — Cmd+Q, and
/// closing a window that has no tray to hide in — so that every way of
/// quitting that the app gets to hear of saves first.
pub fn run<R: Runtime>(app: &AppHandle<R>, command: TrayCommand) {
    if command.reveals_window() {
        window::reveal(app);
    }
    if let Some(action) = command.frontend_action() {
        // Emitting only fails while the app is shutting down.
        let _ = app.emit(TRAY_ACTION_EVENT, action);
    }
    if command == TrayCommand::Quit {
        exit_after_grace(app);
    }
}

/// Quit is the frontend's to carry out (see `QUIT_GRACE`); this is the
/// fallback for a frontend that cannot answer, so Quit always quits.
fn exit_after_grace<R: Runtime>(app: &AppHandle<R>) {
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(QUIT_GRACE);
        app.exit(0);
    });
}
