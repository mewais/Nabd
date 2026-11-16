//! macOS's menu bar for the app itself (the menus beside the Apple menu).
//!
//! Tauri's default one would do, except its Quit is the system's `terminate:`,
//! which ends the process without asking the app. Here Quit is an ordinary item
//! with the tray's Quit id: tray menu listeners hear every menu event, so
//! Cmd+Q lands in `tray::run_menu_entry` and takes the same path as the tray's
//! Quit — the window saves what is pending, then asks to exit. Quitting from
//! the Dock's context menu is still the system's and cannot be intercepted.

use nabd_native::TRAY_QUIT;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Runtime};

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let name = &app.package_info().name;
    let quit = MenuItem::with_id(
        app,
        TRAY_QUIT,
        format!("Quit {name}"),
        true,
        Some("CmdOrCtrl+Q"),
    )?;
    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                name,
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?,
            // Without an Edit menu the webview's fields get no Cmd+C/V/X/A/Z.
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?,
        ],
    )
}
