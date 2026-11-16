//! Fixtures shared by the crates' test suites.

use nabd_persistence::{LoggedSetRow, Store};
use serde_json::{json, Value};

/// An empty in-memory database.
pub fn fresh_store() -> Store {
    Store::open_in_memory().unwrap()
}

/// A complete logged set as the frontend sends it: a planned working set of
/// push-ups with the given id and timestamp.
pub fn set_json(id: &str, ts: &str) -> Value {
    json!({
        "id": id,
        "exId": "push-up",
        "exercise": "Push-up",
        "group": "chest",
        "muscles": ["chest", "triceps"],
        "value": 12.0,
        "weight": null,
        "ts": ts,
        "date": &ts[..10],
        "trigger": "manual",
        "planItemId": "item-1",
        "setType": "working",
    })
}

/// The ids of history rows, in the order given.
pub fn ids(history: Vec<LoggedSetRow>) -> Vec<String> {
    history.into_iter().map(|row| row.id).collect()
}
