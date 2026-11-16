//! The Tauri binary: wires the SQLite command core, the tray, notifications,
//! autostart and window behaviour together. The app lives in the tray — closing
//! the window only hides it, so nudges keep coming.

use std::sync::Mutex;

use nabd_ipc::IpcError;
use nabd_native::{NotifReason, TrayState, TRAY_OPEN, TRAY_QUIT};
use rusqlite::Connection;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WindowEvent};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;

const MAIN_WINDOW: &str = "main";
const TRAY_ID: &str = "nabd-tray";
/// Event carrying a tray menu action ("start" | "pause") to the frontend.
const TRAY_ACTION_EVENT: &str = "tray-action";
const EXPORT_FILE_NAME: &str = "nabd-data.json";

/// Managed SQLite connection state.
pub struct DbConn(pub Mutex<Connection>);

type CommandResult<T> = Result<T, String>;

/// Run a command-core handler against the managed connection.
fn with_db<T>(
    db: &State<'_, DbConn>,
    handler: impl FnOnce(&Connection) -> Result<T, IpcError>,
) -> CommandResult<T> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    handler(&conn).map_err(|e| e.to_string())
}

// ─── Data commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn load_all(db: State<'_, DbConn>) -> CommandResult<String> {
    with_db(&db, nabd_ipc::load_all)
}

#[tauri::command]
fn save_singleton(key: String, value: String, db: State<'_, DbConn>) -> CommandResult<()> {
    with_db(&db, |c| nabd_ipc::save_singleton(c, &key, &value))
}

#[tauri::command]
fn append_set(row_json: String, db: State<'_, DbConn>) -> CommandResult<()> {
    with_db(&db, |c| nabd_ipc::append_set(c, &row_json))
}

#[tauri::command]
fn delete_set(id: String, db: State<'_, DbConn>) -> CommandResult<()> {
    with_db(&db, |c| nabd_ipc::delete_set(c, &id))
}

/// Write the export document to the Downloads folder; returns the file path.
#[tauri::command]
fn export_data<R: Runtime>(app: AppHandle<R>, db: State<'_, DbConn>) -> CommandResult<String> {
    let json = with_db(&db, nabd_ipc::export_data)?;
    let path = app
        .path()
        .download_dir()
        .map_err(|e| e.to_string())?
        .join(EXPORT_FILE_NAME);
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn import_data(json: String, db: State<'_, DbConn>) -> CommandResult<()> {
    with_db(&db, |c| nabd_ipc::import_data(c, &json))
}

// ─── Native commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn notify<R: Runtime>(
    reason: NotifReason,
    exercise: String,
    app: AppHandle<R>,
) -> CommandResult<()> {
    let payload = nabd_native::notif_payload(reason, &exercise);
    app.notification()
        .builder()
        .title(payload.title)
        .body(payload.body)
        .show()
        .map_err(|e| e.to_string())
}

/// Frost the desktop behind the (transparent) window. Best effort: each effect
/// only exists on some platforms, so failures are ignored.
#[tauri::command]
fn set_vibrancy<R: Runtime>(opacity: f64, app: AppHandle<R>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let color = (18u8, 18u8, 18u8, nabd_native::vibrancy_alpha(opacity));
    let _ = window_vibrancy::apply_acrylic(&window, Some(color));
    let _ = window_vibrancy::apply_blur(&window, Some(color));
    #[cfg(target_os = "macos")]
    let _ = window_vibrancy::apply_vibrancy(
        &window,
        window_vibrancy::NSVisualEffectMaterial::AppearanceBased,
        None,
        None,
    );
}

#[tauri::command]
fn get_idle_seconds() -> u64 {
    user_idle::UserIdle::get_time()
        .map(|t| t.as_seconds())
        .unwrap_or(0)
}

#[tauri::command]
fn set_autostart<R: Runtime>(enabled: bool, app: AppHandle<R>) -> CommandResult<()> {
    let autolaunch = app.autolaunch();
    if autolaunch.is_enabled().unwrap_or(false) == enabled {
        return Ok(());
    }
    let result = if enabled {
        autolaunch.enable()
    } else {
        autolaunch.disable()
    };
    result.map_err(|e| e.to_string())
}

/// Rebuild the tray menu to reflect the frontend's current state.
#[tauri::command]
fn update_tray<R: Runtime>(state: TrayState, app: AppHandle<R>) -> CommandResult<()> {
    let menu = tray_menu(&app, &state).map_err(|e| e.to_string())?;
    match app.tray_by_id(TRAY_ID) {
        Some(tray) => tray.set_menu(Some(menu)).map_err(|e| e.to_string()),
        None => Ok(()),
    }
}

// ─── Window + tray ───────────────────────────────────────────────────────────

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn tray_menu<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> tauri::Result<Menu<R>> {
    let menu = Menu::new(app)?;
    for item in nabd_native::tray_items(state) {
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

fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&tray_menu(app, &TrayState::default())?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_OPEN => show_main_window(app),
            TRAY_QUIT => app.exit(0),
            // Start / Pause are the frontend's business: it owns the workout state.
            action => {
                show_main_window(app);
                let _ = app.emit(TRAY_ACTION_EVENT, action);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

// ─── Entry point ─────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main_window(app);
        }))
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("nabd.sqlite");
            let conn =
                nabd_persistence::open_at(&db_path.to_string_lossy()).map_err(|e| e.to_string())?;
            nabd_ipc::init(&conn).map_err(|e| e.to_string())?;
            let minimized = nabd_ipc::starts_minimized(&conn).unwrap_or(false);
            app.manage(DbConn(Mutex::new(conn)));

            build_tray(app.handle())?;
            if !minimized {
                show_main_window(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window keeps the app alive in the tray.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_all,
            save_singleton,
            append_set,
            delete_set,
            export_data,
            import_data,
            notify,
            set_vibrancy,
            get_idle_seconds,
            set_autostart,
            update_tray,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nabd");
}
