//! nabd-ipc — the IPC command core (no Tauri dependency).
//!
//! [`DataCommands`] is what the frontend can ask of the stored data, JSON in and
//! JSON out, over a `nabd-persistence` store. The `#[tauri::command]` wrappers
//! live in the binary.

use std::path::Path;

use nabd_persistence::{LoggedSetRow, Store, KV_KEYS};
use serde_json::{json, Map, Value};

mod error;
pub use error::{IpcError, IpcResult};

/// The commands over the user's data.
pub struct DataCommands {
    store: Store,
}

impl DataCommands {
    /// Over the database file at `path`, created or migrated as needed.
    pub fn open(path: &Path) -> IpcResult<Self> {
        Ok(Self::over(Store::open(path)?))
    }

    pub fn over(store: Store) -> Self {
        Self { store }
    }

    /// Every singleton (stored JSON value, or null) plus the `history` array
    /// of the sets that could be read; and how many could not.
    fn snapshot(&self) -> IpcResult<(Map<String, Value>, usize)> {
        let mut obj = Map::new();
        for key in KV_KEYS {
            obj.insert(key.to_string(), self.store.get_json(key)?);
        }
        let history = self.store.all_history()?;
        obj.insert("history".to_string(), serde_json::to_value(history.sets)?);
        Ok((obj, history.unreadable))
    }

    /// The boot snapshot the frontend hydrates from, as a JSON object string.
    /// `unreadableSets` counts the stored sets left out of `history` because
    /// they could not be read, so the frontend can say so.
    pub fn load_all(&self) -> IpcResult<String> {
        let (mut obj, unreadable) = self.snapshot()?;
        obj.insert("unreadableSets".to_string(), json!(unreadable));
        Ok(Value::Object(obj).to_string())
    }

    /// Persist one singleton JSON blob. `key` must be one of `KV_KEYS`.
    pub fn save_singleton(&self, key: &str, value: &str) -> IpcResult<()> {
        self.save_singletons(&[(key, value)])
    }

    /// Persist several singleton JSON blobs in one transaction: all of them or,
    /// if any key or value is bad or the write fails, none.
    pub fn save_singletons(&self, entries: &[(&str, &str)]) -> IpcResult<()> {
        let singletons = entries
            .iter()
            .map(|(key, value)| Ok((known_key(key)?, valid_json(value)?)))
            .collect::<IpcResult<Vec<_>>>()?;
        Ok(self.store.replace_all(&singletons, None)?)
    }

    /// Append one logged set (`row_json` is a `LoggedSetRow`).
    pub fn append_set(&self, row_json: &str) -> IpcResult<()> {
        let row: LoggedSetRow = serde_json::from_str(row_json)?;
        Ok(self.store.append_history(&row)?)
    }

    /// Delete one logged set by id.
    pub fn delete_set(&self, id: &str) -> IpcResult<()> {
        Ok(self.store.delete_history(id)?)
    }

    /// The export document: the snapshot without nulls, stamped with the app
    /// name and the document `version` (which the frontend owns).
    pub fn export_data(&self, version: u32) -> IpcResult<String> {
        let (mut obj, _unreadable) = self.snapshot()?;
        obj.retain(|_, value| !value.is_null());
        obj.insert("app".to_string(), json!("Nabd"));
        obj.insert("version".to_string(), json!(version));
        Ok(serde_json::to_string_pretty(&Value::Object(obj))?)
    }

    /// Apply an (already validated) export document: every singleton present
    /// is replaced, and so is the history when present. All or nothing.
    pub fn import_data(&self, json: &str) -> IpcResult<()> {
        let doc: Map<String, Value> = serde_json::from_str(json)?;
        let singletons: Vec<(&str, String)> = KV_KEYS
            .iter()
            .filter_map(|key| doc.get(*key).map(|value| (*key, value.to_string())))
            .collect();
        let history: Option<Vec<LoggedSetRow>> = match doc.get("history") {
            Some(rows) => Some(serde_json::from_value(rows.clone())?),
            None => None,
        };
        Ok(self.store.replace_all(&singletons, history.as_deref())?)
    }

    /// Whether the stored settings ask for the window to stay hidden at launch.
    pub fn starts_minimized(&self) -> IpcResult<bool> {
        let settings = self.store.get_json("settings")?;
        Ok(settings["minimizedByDefault"].as_bool().unwrap_or(false))
    }
}

fn known_key(key: &str) -> IpcResult<&'static str> {
    KV_KEYS
        .into_iter()
        .find(|known| *known == key)
        .ok_or_else(|| IpcError::BadKey(key.to_string()))
}

fn valid_json(value: &str) -> IpcResult<String> {
    serde_json::from_str::<Value>(value)?;
    Ok(value.to_string())
}
