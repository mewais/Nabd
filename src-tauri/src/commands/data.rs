//! Commands over the user's data (the command core in `nabd-ipc`).

use tauri::{AppHandle, Runtime, State};

use crate::db::Database;
use crate::error::AppResult;
use crate::export;

#[tauri::command]
pub fn load_all(db: State<'_, Database>) -> AppResult<String> {
    db.with(nabd_ipc::load_all)
}

#[tauri::command]
pub fn save_singleton(key: String, value: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|c| nabd_ipc::save_singleton(c, &key, &value))
}

#[tauri::command]
pub fn append_set(row_json: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|c| nabd_ipc::append_set(c, &row_json))
}

#[tauri::command]
pub fn delete_set(id: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|c| nabd_ipc::delete_set(c, &id))
}

/// Write the export document to a new file; returns where, for display.
#[tauri::command]
pub fn export_data<R: Runtime>(app: AppHandle<R>, db: State<'_, Database>) -> AppResult<String> {
    let json = db.with(nabd_ipc::export_data)?;
    Ok(export::write(&app, &json)?.display().to_string())
}

#[tauri::command]
pub fn import_data(json: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|c| nabd_ipc::import_data(c, &json))
}
