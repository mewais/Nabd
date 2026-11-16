//! The JSON shape of a logged set.

use nabd_persistence::LoggedSetRow;
use serde_json::json;

use crate::support::set_row;

#[test]
fn logged_set_row_serialises_as_camel_case() {
    let row = LoggedSetRow {
        plan_item_id: Some("item-1".to_string()),
        set_type: "warmup".to_string(),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    assert_eq!(
        serde_json::to_value(&row).unwrap(),
        json!({
            "id": "a",
            "exId": "push-up",
            "exercise": "Push-up",
            "group": "chest",
            "muscles": ["chest", "triceps"],
            "value": 12.0,
            "weight": null,
            "ts": "2025-03-01T10:00:00.000Z",
            "date": "2025-03-01",
            "trigger": "manual",
            "planItemId": "item-1",
            "setType": "warmup",
        })
    );
}

#[test]
fn logged_set_row_json_round_trips() {
    let row = LoggedSetRow {
        weight: Some(40.0),
        plan_item_id: Some("item-1".to_string()),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    let json = serde_json::to_string(&row).unwrap();
    assert_eq!(serde_json::from_str::<LoggedSetRow>(&json).unwrap(), row);
}

#[test]
fn old_json_without_plan_item_or_set_type_gets_defaults() {
    let old = json!({
        "id": "a",
        "exId": "plank",
        "exercise": "Plank",
        "group": "core",
        "muscles": ["abs"],
        "value": 60,
        "weight": null,
        "ts": "2024-12-01T10:00:00.000Z",
        "date": "2024-12-01",
        "trigger": "idle",
    });
    let row: LoggedSetRow = serde_json::from_value(old).unwrap();
    assert_eq!(row.plan_item_id, None);
    assert_eq!(row.set_type, "working");
    assert_eq!(row.ex_id, "plank");
    assert_eq!(row.value, 60.0);
}
