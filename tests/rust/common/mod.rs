//! Fixtures shared by the crates' test suites.

use serde_json::{json, Value};

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
