//! nabd-ipc — the command core, driven through its JSON-in/JSON-out API
//! against an in-memory database.

#[path = "../common/mod.rs"]
mod common;

use common::set_json;
use nabd_ipc::{Commands, IpcError};
use nabd_persistence::{Store, KV_KEYS};
use serde_json::{json, Value};

/// The export document version the tests stamp.
const VERSION: u32 = 2;

// ── fixtures ─────────────────────────────────────────────────────────────────

fn fresh_db() -> Commands {
    Commands::over(Store::open_in_memory().unwrap())
}

fn append(c: &Commands, id: &str, ts: &str) {
    c.append_set(&set_json(id, ts).to_string()).unwrap();
}

/// The boot snapshot, parsed.
fn snapshot(c: &Commands) -> Value {
    serde_json::from_str(&c.load_all().unwrap()).unwrap()
}

fn history_ids(c: &Commands) -> Vec<String> {
    snapshot(c)["history"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| row["id"].as_str().unwrap().to_string())
        .collect()
}

/// The export document, parsed.
fn exported(c: &Commands) -> Value {
    serde_json::from_str(&c.export_data(VERSION).unwrap()).unwrap()
}

// ── load_all ─────────────────────────────────────────────────────────────────

#[test]
fn load_all_on_an_empty_db_has_every_key_null_and_no_history() {
    let snap = snapshot(&fresh_db());
    let obj = snap.as_object().unwrap();

    assert_eq!(obj.len(), KV_KEYS.len() + 1);
    for key in KV_KEYS {
        assert_eq!(
            obj.get(key),
            Some(&Value::Null),
            "{key} should be present and null"
        );
    }
    assert_eq!(obj["history"], json!([]));
}

#[test]
fn load_all_returns_singletons_as_json_values_not_strings() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"intervalMin":45}"#)
        .unwrap();
    c.save_singleton("customExercises", "[]").unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["settings"], json!({"intervalMin": 45}));
    assert_eq!(snap["customExercises"], json!([]));
    assert_eq!(snap["program"], Value::Null);
}

// ── save_singleton ───────────────────────────────────────────────────────────

#[test]
fn save_singleton_accepts_every_known_key() {
    let c = fresh_db();
    for (n, key) in KV_KEYS.iter().enumerate() {
        c.save_singleton(key, &json!({ "n": n }).to_string())
            .unwrap();
    }
    let snap = snapshot(&c);
    for (n, key) in KV_KEYS.iter().enumerate() {
        assert_eq!(snap[*key], json!({ "n": n }));
    }
}

#[test]
fn save_singleton_overwrites_the_previous_value() {
    let c = fresh_db();
    c.save_singleton("dayLog", r#"{"sets":1}"#).unwrap();
    c.save_singleton("dayLog", r#"{"sets":2}"#).unwrap();
    assert_eq!(snapshot(&c)["dayLog"], json!({"sets": 2}));
}

#[test]
fn save_singleton_rejects_an_unknown_key() {
    let c = fresh_db();
    let err = c.save_singleton("theme", r#""dark""#).unwrap_err();
    assert!(
        matches!(&err, IpcError::BadKey(key) if key == "theme"),
        "got {err:?}"
    );
    assert!(!snapshot(&c).as_object().unwrap().contains_key("theme"));
}

#[test]
fn save_singleton_does_not_let_history_be_written_as_a_singleton() {
    let c = fresh_db();
    let err = c.save_singleton("history", "[]").unwrap_err();
    assert!(matches!(err, IpcError::BadKey(_)), "got {err:?}");
}

#[test]
fn save_singleton_rejects_invalid_json_and_keeps_the_old_value() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"ok":true}"#).unwrap();

    let err = c.save_singleton("settings", "{not json").unwrap_err();

    assert!(matches!(err, IpcError::BadJson(_)), "got {err:?}");
    assert_eq!(snapshot(&c)["settings"], json!({"ok": true}));
}

// ── save_singletons ──────────────────────────────────────────────────────────

#[test]
fn save_singletons_writes_every_entry() {
    let c = fresh_db();
    c.save_singletons(&[
        ("dayState", r#"{"date":"2025-03-02"}"#),
        ("rotationState", r#"{"s1":1}"#),
    ])
    .unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["dayState"], json!({"date": "2025-03-02"}));
    assert_eq!(snap["rotationState"], json!({"s1": 1}));
}

#[test]
fn save_singletons_writes_nothing_when_one_entry_is_bad() {
    let c = fresh_db();
    c.save_singleton("dayState", r#"{"date":"2025-03-01"}"#)
        .unwrap();

    let bad_key = c
        .save_singletons(&[("dayState", r#"{"date":"2025-03-02"}"#), ("nope", "1")])
        .unwrap_err();
    let bad_json = c
        .save_singletons(&[("dayState", r#"{"date":"2025-03-02"}"#), ("dayLog", "{")])
        .unwrap_err();

    assert!(matches!(bad_key, IpcError::BadKey(_)), "got {bad_key:?}");
    assert!(matches!(bad_json, IpcError::BadJson(_)), "got {bad_json:?}");
    assert_eq!(snapshot(&c)["dayState"], json!({"date": "2025-03-01"}));
    assert_eq!(snapshot(&c)["dayLog"], Value::Null);
}

// ── append_set / delete_set ──────────────────────────────────────────────────

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

// ── export_data ──────────────────────────────────────────────────────────────

#[test]
fn export_of_an_empty_db_has_only_app_version_and_empty_history() {
    assert_eq!(
        exported(&fresh_db()),
        json!({"app": "Nabd", "version": VERSION, "history": []})
    );
}

#[test]
fn export_includes_stored_singletons_and_history_and_omits_nulls() {
    let c = fresh_db();
    c.save_singleton("program", r#"{"days":[]}"#).unwrap();
    c.save_singleton("settings", r#"{"theme":"dark"}"#).unwrap();
    let set = set_json("a", "2025-03-01T10:00:00.000Z");
    c.append_set(&set.to_string()).unwrap();

    assert_eq!(
        exported(&c),
        json!({
            "app": "Nabd",
            "version": 2,
            "program": {"days": []},
            "settings": {"theme": "dark"},
            "history": [set],
        })
    );
}

#[test]
fn export_can_be_imported_into_another_db() {
    let source = fresh_db();
    source
        .save_singleton("program", r#"{"days":["mon"]}"#)
        .unwrap();
    source.save_singleton("dayLog", r#"{"sets":3}"#).unwrap();
    append(&source, "a", "2025-03-01T10:00:00.000Z");
    append(&source, "b", "2025-03-02T10:00:00.000Z");

    let target = fresh_db();
    target
        .import_data(&source.export_data(VERSION).unwrap())
        .unwrap();

    assert_eq!(snapshot(&target), snapshot(&source));
}

// ── import_data ──────────────────────────────────────────────────────────────

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
    assert_eq!(obj.len(), KV_KEYS.len() + 1);
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

// ── starts_minimized ─────────────────────────────────────────────────────────

#[test]
fn starts_minimized_defaults_to_false_without_settings() {
    assert!(!fresh_db().starts_minimized().unwrap());
}

#[test]
fn starts_minimized_defaults_to_false_when_the_flag_is_absent() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"theme":"dark"}"#).unwrap();
    assert!(!c.starts_minimized().unwrap());
}

#[test]
fn starts_minimized_follows_the_stored_flag() {
    let c = fresh_db();

    c.save_singleton("settings", r#"{"minimizedByDefault":true}"#)
        .unwrap();
    assert!(c.starts_minimized().unwrap());

    c.save_singleton("settings", r#"{"minimizedByDefault":false}"#)
        .unwrap();
    assert!(!c.starts_minimized().unwrap());
}

#[test]
fn starts_minimized_is_false_when_the_flag_is_not_a_boolean() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"minimizedByDefault":"yes"}"#)
        .unwrap();
    assert!(!c.starts_minimized().unwrap());
}
