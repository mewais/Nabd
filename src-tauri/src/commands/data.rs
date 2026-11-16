//! Commands over the user's data (the command core in `nabd-ipc`).

use nabd_ipc::Commands;
use tauri::{AppHandle, Runtime, State};

use crate::db::Database;
use crate::error::AppResult;
use crate::export;

#[tauri::command]
pub fn load_all(db: State<'_, Database>) -> AppResult<String> {
    db.with(Commands::load_all)
}

#[tauri::command]
pub fn save_singleton(key: String, value: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|commands| commands.save_singleton(&key, &value))
}

/// Several singletons at once, all or nothing (`entries` are key/JSON pairs).
#[tauri::command]
pub fn save_singletons(entries: Vec<(String, String)>, db: State<'_, Database>) -> AppResult<()> {
    let entries: Vec<(&str, &str)> = entries
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect();
    db.with(|commands| commands.save_singletons(&entries))
}

#[tauri::command]
pub fn append_set(row_json: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|commands| commands.append_set(&row_json))
}

#[tauri::command]
pub fn delete_set(id: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|commands| commands.delete_set(&id))
}

/// Write the export document, stamped with the frontend's document `version`,
/// to a new file; returns where, for display.
#[tauri::command]
pub fn export_data<R: Runtime>(
    version: u32,
    app: AppHandle<R>,
    db: State<'_, Database>,
) -> AppResult<String> {
    let json = db.with(|commands| commands.export_data(version))?;
    Ok(export::write(&app, &json)?.display().to_string())
}

#[tauri::command]
pub fn import_data(json: String, db: State<'_, Database>) -> AppResult<()> {
    db.with(|commands| commands.import_data(&json))
}
