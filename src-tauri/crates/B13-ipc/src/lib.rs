//! B13 · nabd-ipc — IPC command-core (no Tauri deps).
//!
//! Pure command handlers that take a `&Connection` and JSON in/out, delegating
//! to nabd-persistence. The thin `#[tauri::command]` wrappers that call these
//! live in the Tauri binary (B23). Keeping the core Tauri-free makes it 100%
//! unit testable against an in-memory database.

use nabd_persistence as db;
use rusqlite::Connection;
use serde_json::{json, Map, Value};

pub mod error;
pub use error::{IpcError, IpcResult};

/// Ensure the schema exists (called once on boot before other commands).
pub fn init(c: &Connection) -> IpcResult<()> {
    db::init_schema(c).unwrap();
    Ok(())
}

/// Read the KV singletons and history from DB into a JSON object map.
fn read_snapshot(c: &Connection) -> Map<String, Value> {
    let mut obj = Map::new();
    for key in db::KV_KEYS {
        let raw = db::get_kv(c, key).unwrap();
        let val: Value = match raw {
            Some(s) => serde_json::from_str(&s).unwrap(),
            None => Value::Null,
        };
        obj.insert(key.to_string(), val);
    }
    let rows = db::all_history(c).unwrap();
    let mut history = Vec::with_capacity(rows.len());
    for r in &rows {
        history.push(serde_json::to_value(r).unwrap());
    }
    obj.insert("history".to_string(), Value::Array(history));
    obj
}

/// Boot snapshot: a JSON object string with keys program, settings, theme,
/// customExercises, rotationState, dayState (each the stored JSON value or
/// null) and `history` (array of logged sets). The frontend hydrates from this.
pub fn load_all(c: &Connection) -> IpcResult<String> {
    let obj = read_snapshot(c);
    Ok(serde_json::to_string(&Value::Object(obj)).unwrap())
}

/// Persist one singleton JSON blob. `key` must be one of db::KV_KEYS, else
/// `IpcError::BadKey`. `value` must be valid JSON, else `IpcError::BadJson`.
pub fn save_singleton(c: &Connection, key: &str, value: &str) -> IpcResult<()> {
    if !db::KV_KEYS.contains(&key) {
        return Err(IpcError::BadKey(key.to_string()));
    }
    // Validate that value is valid JSON.
    let _: Value = serde_json::from_str(value)?;
    db::set_kv(c, key, value).unwrap();
    Ok(())
}

/// Append one logged set (row_json is a LoggedSetRow). Invalid JSON → BadJson.
pub fn append_set(c: &Connection, row_json: &str) -> IpcResult<()> {
    let row: db::LoggedSetRow = serde_json::from_str(row_json)?;
    db::append_history(c, &row).unwrap();
    Ok(())
}

/// Build the export document (AppData-shaped JSON string) from the DB.
pub fn export_data(c: &Connection) -> IpcResult<String> {
    let mut obj = read_snapshot(c);
    obj.insert("app".to_string(), json!("Nabd"));
    obj.insert("version".to_string(), json!(1));
    Ok(serde_json::to_string(&Value::Object(obj)).unwrap())
}

/// Apply an imported AppData JSON: upsert each present singleton and replace
/// history. Invalid JSON or wrong shape → BadJson. Partial documents allowed.
pub fn import_data(c: &Connection, json: &str) -> IpcResult<()> {
    // Parse directly as an object map — non-object JSON yields BadJson via From.
    let obj: Map<String, Value> = serde_json::from_str(json)?;

    for key in db::KV_KEYS {
        if let Some(val) = obj.get(key) {
            db::set_kv(c, key, &serde_json::to_string(val).unwrap()).unwrap();
        }
    }

    if let Some(history_val) = obj.get("history") {
        let rows: Vec<db::LoggedSetRow> = serde_json::from_value(history_val.clone())?;
        db::replace_history(c, &rows).unwrap();
    }

    Ok(())
}

// Re-export the row type so the binary and tests share it.
pub use db::LoggedSetRow;
