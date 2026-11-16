//! The tray icon and its menu. What the menu says and what each entry does is
//! decided in `nabd-native`; this renders it and carries the commands out.

use nabd_native::{tray_items, tray_tooltip, TrayCommand, TrayState};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Runtime};

use crate::window;

const TRAY_ID: &str = "nabd-tray";
/// Carries a tray action ("start" | "pause") to the frontend, which owns the
/// workout state.
const TRAY_ACTION_EVENT: &str = "tray-action";

/// Create the tray icon. On Windows a left click opens the window and the
/// menu is on right click; Linux indicators only ever open their menu, and
/// show no tooltip.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let state = TrayState::default();
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu(app, &state)?)
        .tooltip(tray_tooltip(&state))
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| run_menu_entry(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                window::reveal(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Make the menu and tooltip reflect `state`. Nothing to do without a tray.
pub fn update<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> tauri::Result<()> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(());
    };
    tray.set_menu(Some(menu(app, state)?))?;
    tray.set_tooltip(Some(tray_tooltip(state)))
}

fn menu<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> tauri::Result<Menu<R>> {
    let menu = Menu::new(app)?;
    for item in tray_items(state) {
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
    let Some(command) = TrayCommand::from_id(id) else {
        return;
    };
    if command.reveals_window() {
        window::reveal(app);
    }
    if let Some(action) = command.frontend_action() {
        // Emitting only fails while the app is shutting down.
        let _ = app.emit(TRAY_ACTION_EVENT, action);
    }
    if command == TrayCommand::Quit {
        app.exit(0);
    }
}
