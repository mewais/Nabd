//! Fixtures of the command suite: a command core and its parsed answers.

use nabd_ipc::DataCommands;
use nabd_persistence::LoggedSetRow;
use serde_json::Value;

use crate::common::{fresh_store, ids, set_json};

/// The export document version the tests stamp.
pub const VERSION: u32 = 2;
/// The product name the app passes in (tauri.conf.json `productName`).
pub const APP_NAME: &str = "Nabd";

pub fn fresh_db() -> DataCommands {
    DataCommands::over(fresh_store())
}

pub fn append(c: &DataCommands, id: &str, ts: &str) {
    c.append_set(&set_json(id, ts).to_string()).unwrap();
}

/// The boot snapshot, parsed.
pub fn snapshot(c: &DataCommands) -> Value {
    serde_json::from_str(&c.load_all().unwrap()).unwrap()
}

/// The ids in the snapshot's history, in the order it lists them.
pub fn history_ids(c: &DataCommands) -> Vec<String> {
    let history: Vec<LoggedSetRow> = serde_json::from_value(snapshot(c)["history"].take()).unwrap();
    ids(history)
}

/// The export document, parsed.
pub fn exported(c: &DataCommands) -> Value {
    serde_json::from_str(&c.export_data(APP_NAME, VERSION).unwrap()).unwrap()
}
