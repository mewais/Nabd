//! B13 · nabd-ipc — the IPC command core (no Tauri dependency).
//!
//! Each handler takes a `&Connection` and JSON in/out and delegates to
//! nabd-persistence. The `#[tauri::command]` wrappers live in the binary.

use nabd_persistence as db;
use rusqlite::Connection;
use serde_json::{json, Map, Value};

pub mod error;
pub use error::{IpcError, IpcResult};

/// Version stamped on exported documents (the TypeScript `APPDATA_VERSION`).
const EXPORT_VERSION: i64 = 2;

/// Ensure the schema exists and is current (called once on boot).
pub fn init(c: &Connection) -> IpcResult<()> {
    Ok(db::init_schema(c)?)
}

/// Every singleton (stored JSON value, or null) plus the `history` array.
fn snapshot(c: &Connection) -> IpcResult<Map<String, Value>> {
    let mut obj = Map::new();
    for key in db::KV_KEYS {
        let value = match db::get_kv(c, key)? {
            Some(json) => serde_json::from_str(&json)?,
            None => Value::Null,
        };
        obj.insert(key.to_string(), value);
    }
    obj.insert(
        "history".to_string(),
        serde_json::to_value(db::all_history(c)?)?,
    );
    Ok(obj)
}

/// The boot snapshot the frontend hydrates from, as a JSON object string.
pub fn load_all(c: &Connection) -> IpcResult<String> {
    Ok(Value::Object(snapshot(c)?).to_string())
}

/// Persist one singleton JSON blob. `key` must be one of `db::KV_KEYS`.
pub fn save_singleton(c: &Connection, key: &str, value: &str) -> IpcResult<()> {
    save_singletons(c, &[(key, value)])
}

/// Persist several singleton JSON blobs in one transaction: all of them or,
/// if any key or value is bad or the write fails, none.
pub fn save_singletons(c: &Connection, entries: &[(&str, &str)]) -> IpcResult<()> {
    let singletons = entries
        .iter()
        .map(|(key, value)| Ok((known_key(key)?, valid_json(value)?)))
        .collect::<IpcResult<Vec<_>>>()?;
    Ok(db::replace_all(c, &singletons, None)?)
}

fn known_key(key: &str) -> IpcResult<&'static str> {
    db::KV_KEYS
        .into_iter()
        .find(|known| *known == key)
        .ok_or_else(|| IpcError::BadKey(key.to_string()))
}

fn valid_json(value: &str) -> IpcResult<String> {
    serde_json::from_str::<Value>(value)?;
    Ok(value.to_string())
}

/// Append one logged set (`row_json` is a `LoggedSetRow`).
pub fn append_set(c: &Connection, row_json: &str) -> IpcResult<()> {
    let row: db::LoggedSetRow = serde_json::from_str(row_json)?;
    Ok(db::append_history(c, &row)?)
}

/// Delete one logged set by id.
pub fn delete_set(c: &Connection, id: &str) -> IpcResult<()> {
    Ok(db::delete_history(c, id)?)
}

/// The export document: the snapshot without nulls, stamped with app + version.
pub fn export_data(c: &Connection) -> IpcResult<String> {
    let mut obj = snapshot(c)?;
    obj.retain(|_, value| !value.is_null());
    obj.insert("app".to_string(), json!("Nabd"));
    obj.insert("version".to_string(), json!(EXPORT_VERSION));
    Ok(serde_json::to_string_pretty(&Value::Object(obj))?)
}

/// Apply an (already validated) export document: every singleton present is
/// replaced, and so is the history when present. All or nothing.
pub fn import_data(c: &Connection, json: &str) -> IpcResult<()> {
    let doc: Map<String, Value> = serde_json::from_str(json)?;
    let singletons: Vec<(&str, String)> = db::KV_KEYS
        .iter()
        .filter_map(|key| doc.get(*key).map(|value| (*key, value.to_string())))
        .collect();
    let history: Option<Vec<db::LoggedSetRow>> = match doc.get("history") {
        Some(rows) => Some(serde_json::from_value(rows.clone())?),
        None => None,
    };
    Ok(db::replace_all(c, &singletons, history.as_deref())?)
}

/// Whether the stored settings ask for the window to stay hidden at launch.
pub fn starts_minimized(c: &Connection) -> IpcResult<bool> {
    let settings: Value = match db::get_kv(c, "settings")? {
        Some(json) => serde_json::from_str(&json)?,
        None => Value::Null,
    };
    Ok(settings["minimizedByDefault"].as_bool().unwrap_or(false))
}

pub use db::LoggedSetRow;
