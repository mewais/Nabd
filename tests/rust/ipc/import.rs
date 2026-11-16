//! Applying an export document.

use nabd_ipc::IpcError;
use nabd_persistence::KV_KEYS;
use serde_json::json;

use crate::common::set_json;
use crate::support::{append, fresh_db, history_ids, snapshot};

#[test]
fn import_replaces_present_singletons_and_the_history() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"name":"old"}"#).unwrap();
    append(&c, "old", "2025-03-01T10:00:00.000Z");

    let new_set = set_json("new", "2025-04-01T10:00:00.000Z");
    let doc = json!({
        "app": "Nabd",
        "version": 2,
        "program": {"name": "new"},
        "settings": {"theme": "light"},
        "history": [new_set],
    });
    c.import_data(&doc.to_string()).unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["program"], json!({"name": "new"}));
    assert_eq!(snap["settings"], json!({"theme": "light"}));
    assert_eq!(snap["history"], json!([new_set]));
}

#[test]
fn import_leaves_absent_singletons_and_absent_history_alone() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"name":"kept"}"#).unwrap();
    c.save_singleton("settings", r#"{"theme":"dark"}"#).unwrap();
    append(&c, "kept", "2025-03-01T10:00:00.000Z");

    c.import_data(r#"{"settings":{"theme":"light"}}"#).unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["program"], json!({"name": "kept"}));
    assert_eq!(snap["settings"], json!({"theme": "light"}));
    assert_eq!(history_ids(&c), ["kept"]);
}

#[test]
fn import_with_an_empty_history_array_clears_the_history() {
    let c = fresh_db();
    append(&c, "gone", "2025-03-01T10:00:00.000Z");
    c.import_data(r#"{"history":[]}"#).unwrap();
    assert!(history_ids(&c).is_empty());
}

#[test]
fn import_ignores_keys_that_are_not_singletons() {
    let c = fresh_db();
    c.import_data(r#"{"app":"Nabd","version":2,"theme":"dark"}"#)
        .unwrap();

    let snap = snapshot(&c);
    let obj = snap.as_object().unwrap();
    assert!(!obj.contains_key("theme"));
    assert!(KV_KEYS.iter().all(|key| obj[*key].is_null()));
}

#[test]
fn import_rejects_json_that_is_not_an_object() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"name":"kept"}"#).unwrap();

    for bad in ["[]", "42", r#""text""#, "null", "{broken"] {
        let err = c.import_data(bad).unwrap_err();
        assert!(matches!(err, IpcError::BadJson(_)), "{bad}: got {err:?}");
    }
    assert_eq!(snapshot(&c)["program"], json!({"name": "kept"}));
}

#[test]
fn import_changes_nothing_when_a_history_row_is_malformed() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"name":"old"}"#).unwrap();
    append(&c, "old", "2025-03-01T10:00:00.000Z");
    let before = snapshot(&c);

    let doc = json!({
        "program": {"name": "new"},
        "history": [set_json("good", "2025-04-01T10:00:00.000Z"), {"id": "bad"}],
    });
    let err = c.import_data(&doc.to_string()).unwrap_err();

    assert!(matches!(err, IpcError::BadJson(_)), "got {err:?}");
    assert_eq!(snapshot(&c), before);
}

#[test]
fn import_changes_nothing_when_history_rows_clash_in_the_database() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"name":"old"}"#).unwrap();
    append(&c, "old", "2025-03-01T10:00:00.000Z");
    let before = snapshot(&c);

    // Both rows are well-formed, so the failure happens mid-transaction.
    let doc = json!({
        "program": {"name": "new"},
        "history": [
            set_json("dup", "2025-04-01T10:00:00.000Z"),
            set_json("dup", "2025-04-02T10:00:00.000Z"),
        ],
    });
    let err = c.import_data(&doc.to_string()).unwrap_err();

    assert!(matches!(err, IpcError::Storage(_)), "got {err:?}");
    assert_eq!(snapshot(&c), before);
}
