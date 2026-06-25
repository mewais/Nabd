use std::sync::Mutex;

use nabd_ipc::IpcError;
use nabd_native::NotifReason;
use rusqlite::Connection;
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_notification::NotificationExt;

/// Managed SQLite connection state.
pub struct DbConn(pub Mutex<Connection>);

// ─── Helper: map IpcError to String ─────────────────────────────────────────

fn ipc_err(e: IpcError) -> String {
    e.to_string()
}

// ─── IPC commands ─────────────────────────────────────────────────────────────

#[tauri::command]
fn init(db: State<'_, DbConn>) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::init(&conn).map_err(ipc_err)
}

#[tauri::command]
fn load_all(db: State<'_, DbConn>) -> Result<String, String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::load_all(&conn).map_err(ipc_err)
}

#[tauri::command]
fn save_singleton(
    key: String,
    value: String,
    db: State<'_, DbConn>,
) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::save_singleton(&conn, &key, &value).map_err(ipc_err)
}

/// `rowJson` from JS maps to `row_json` here (Tauri camelCase ↔ snake_case).
#[tauri::command]
fn append_set(row_json: String, db: State<'_, DbConn>) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::append_set(&conn, &row_json).map_err(ipc_err)
}

#[tauri::command]
fn export_data(db: State<'_, DbConn>) -> Result<String, String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::export_data(&conn).map_err(ipc_err)
}

#[tauri::command]
fn import_data(json: String, db: State<'_, DbConn>) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    nabd_ipc::import_data(&conn, &json).map_err(ipc_err)
}

// ─── Native commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn notify<R: Runtime>(
    reason: String,
    exercise: String,
    app: AppHandle<R>,
) -> Result<(), String> {
    let notif_reason = match reason.as_str() {
        "idle" => NotifReason::Idle,
        _ => NotifReason::Timer,
    };
    let payload = nabd_native::notif_payload(notif_reason, &exercise);
    app.notification()
        .builder()
        .title(payload.title)
        .body(payload.body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_vibrancy<R: Runtime>(opacity: f64, app: AppHandle<R>) -> Result<(), String> {
    let alpha = nabd_native::vibrancy_alpha(opacity);
    // Try to get the main window and apply a cross-platform vibrancy effect.
    // window-vibrancy effects are platform-specific; we attempt the best
    // available on each OS and silently succeed on unsupported platforms.
    if let Some(window) = app.get_webview_window("main") {
        // On Windows: apply acrylic with the computed alpha.
        // On macOS: apply AppearanceBased vibrancy.
        // On Linux: no-op (compositor handles it).
        let color = (18u8, 18u8, 18u8, alpha);
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
    Ok(())
}

#[tauri::command]
fn get_idle_seconds() -> u64 {
    user_idle::UserIdle::get_time()
        .map(|t| t.as_seconds())
        .unwrap_or(0)
}

// ─── Tray helpers ─────────────────────────────────────────────────────────────

fn build_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> tauri::Result<tauri::menu::Menu<R>> {
    use nabd_native::{TrayState, tray_items};
    use tauri::menu::{Menu, MenuItem};

    // Build a default initial tray state (no exercise known yet).
    let state = TrayState {
        next_exercise: None,
        next_time: None,
        done: 0,
        total: 0,
        paused: false,
    };

    let items = tray_items(&state);
    let menu = Menu::new(app)?;

    for item in &items {
        let menu_item = MenuItem::with_id(
            app,
            item.id.clone(),
            item.label.clone(),
            item.enabled,
            None::<&str>,
        )?;
        menu.append(&menu_item)?;
    }

    Ok(menu)
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
            // If a second instance is launched, focus the existing window.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // ── 1. Open SQLite and initialise schema ───────────────────────
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("nabd.sqlite");
            let db_path_str = db_path.to_string_lossy().to_string();

            let conn =
                nabd_persistence::open_at(&db_path_str).map_err(|e| e.to_string())?;
            nabd_ipc::init(&conn).map_err(|e| e.to_string())?;

            app.manage(DbConn(Mutex::new(conn)));

            // ── 2. System tray with menu ───────────────────────────────────
            let handle = app.handle();
            let menu = build_tray_menu(handle)?;

            tauri::tray::TrayIconBuilder::with_id("nabd-tray")
                .icon(app.default_window_icon().cloned().unwrap_or_else(|| {
                    tauri::image::Image::new(&[], 0, 0)
                }))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app_handle, event| {
                    match event.id().as_ref() {
                        "open" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        // "pause", "start" and "status" are handled by the frontend
                        // via a separate IPC event; tray state is updated from JS.
                        _ => {}
                    }
                })
                .build(handle)?;

            // ── 3. Apply vibrancy on startup (translucent window) ─────────
            if let Some(window) = app.get_webview_window("main") {
                // Default opacity: 0.7 → alpha ≈ 178
                let alpha = nabd_native::vibrancy_alpha(0.7);
                let color = (18u8, 18u8, 18u8, alpha);
                let _ = window_vibrancy::apply_acrylic(&window, Some(color));
                #[cfg(target_os = "macos")]
                let _ = window_vibrancy::apply_vibrancy(
                    &window,
                    window_vibrancy::NSVisualEffectMaterial::AppearanceBased,
                    None,
                    None,
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init,
            load_all,
            save_singleton,
            append_set,
            export_data,
            import_data,
            notify,
            set_vibrancy,
            get_idle_seconds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nabd");
}
