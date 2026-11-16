//! Appending and deleting logged sets.

use nabd_ipc::IpcError;
use serde_json::{json, Value};

use crate::common::set_json;
use crate::support::{append, fresh_db, history_ids, snapshot};

#[test]
fn append_set_shows_up_in_the_snapshot_unchanged() {
    let c = fresh_db();
    let set = set_json("a", "2025-03-01T10:00:00.000Z");
    c.append_set(&set.to_string()).unwrap();
    assert_eq!(snapshot(&c)["history"], json!([set]));
}

#[test]
fn append_set_fills_defaults_for_a_set_without_plan_item_or_set_type() {
    let c = fresh_db();
    let mut set = set_json("a", "2025-03-01T10:00:00.000Z");
    let fields = set.as_object_mut().unwrap();
    fields.remove("planItemId");
    fields.remove("setType");

    c.append_set(&set.to_string()).unwrap();

    let stored = &snapshot(&c)["history"][0];
    assert_eq!(stored["planItemId"], Value::Null);
    assert_eq!(stored["setType"], "working");
}

#[test]
fn history_is_returned_oldest_first() {
    let c = fresh_db();
    append(&c, "late", "2025-03-02T08:00:00.000Z");
    append(&c, "early", "2025-03-01T08:00:00.000Z");
    assert_eq!(history_ids(&c), ["early", "late"]);
}

#[test]
fn append_set_rejects_a_malformed_row() {
    let c = fresh_db();

    let not_json = c.append_set("nope").unwrap_err();
    let missing_fields = c.append_set(r#"{"id":"a"}"#).unwrap_err();

    assert!(matches!(not_json, IpcError::BadJson(_)), "got {not_json:?}");
    assert!(
        matches!(missing_fields, IpcError::BadJson(_)),
        "got {missing_fields:?}"
    );
    assert!(history_ids(&c).is_empty());
}

#[test]
fn append_set_reports_a_duplicate_id_as_a_storage_error() {
    let c = fresh_db();
    append(&c, "a", "2025-03-01T10:00:00.000Z");

    let err = c
        .append_set(&set_json("a", "2025-03-01T11:00:00.000Z").to_string())
        .unwrap_err();

    assert!(matches!(err, IpcError::Storage(_)), "got {err:?}");
    assert_eq!(history_ids(&c), ["a"]);
}

#[test]
fn delete_set_removes_only_that_set() {
    let c = fresh_db();
    append(&c, "a", "2025-03-01T10:00:00.000Z");
    append(&c, "b", "2025-03-01T11:00:00.000Z");
    c.delete_set("a").unwrap();
    assert_eq!(history_ids(&c), ["b"]);
}

#[test]
fn delete_set_of_an_unknown_id_succeeds_and_changes_nothing() {
    let c = fresh_db();
    append(&c, "a", "2025-03-01T10:00:00.000Z");
    c.delete_set("missing").unwrap();
    assert_eq!(history_ids(&c), ["a"]);
}
