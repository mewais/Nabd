//! B13 · nabd-ipc — the command core, driven through its JSON-in/JSON-out API
//! against an in-memory database.

use nabd_ipc::{
    append_set, delete_set, export_data, import_data, init, load_all, save_singleton,
    starts_minimized, IpcError,
};
use rusqlite::Connection;
use serde_json::{json, Value};

const KV_KEYS: [&str; 6] = [
    "program",
    "settings",
    "customExercises",
    "rotationState",
    "dayState",
    "dayLog",
];

// ── fixtures ─────────────────────────────────────────────────────────────────

/// A fresh, initialised in-memory database.
fn fresh_db() -> Connection {
    let c = Connection::open_in_memory().unwrap();
    init(&c).unwrap();
    c
}

/// A complete logged set as the frontend sends it.
fn set_json(id: &str, ts: &str) -> Value {
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

fn append(c: &Connection, id: &str, ts: &str) {
    append_set(c, &set_json(id, ts).to_string()).unwrap();
}

/// The boot snapshot, parsed.
fn snapshot(c: &Connection) -> Value {
    serde_json::from_str(&load_all(c).unwrap()).unwrap()
}

fn history_ids(c: &Connection) -> Vec<String> {
    snapshot(c)["history"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| row["id"].as_str().unwrap().to_string())
        .collect()
}

/// The export document, parsed.
fn exported(c: &Connection) -> Value {
    serde_json::from_str(&export_data(c).unwrap()).unwrap()
}

// ── init / load_all ──────────────────────────────────────────────────────────

#[test]
fn init_can_be_called_on_every_boot() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"days":[]}"#).unwrap();
    init(&c).unwrap();
    assert_eq!(snapshot(&c)["program"], json!({"days": []}));
}

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
    save_singleton(&c, "settings", r#"{"intervalMin":45}"#).unwrap();
    save_singleton(&c, "customExercises", "[]").unwrap();

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
        save_singleton(&c, key, &json!({ "n": n }).to_string()).unwrap();
    }
    let snap = snapshot(&c);
    for (n, key) in KV_KEYS.iter().enumerate() {
        assert_eq!(snap[*key], json!({ "n": n }));
    }
}

#[test]
fn save_singleton_overwrites_the_previous_value() {
    let c = fresh_db();
    save_singleton(&c, "dayLog", r#"{"sets":1}"#).unwrap();
    save_singleton(&c, "dayLog", r#"{"sets":2}"#).unwrap();
    assert_eq!(snapshot(&c)["dayLog"], json!({"sets": 2}));
}

#[test]
fn save_singleton_rejects_an_unknown_key() {
    let c = fresh_db();
    let err = save_singleton(&c, "theme", r#""dark""#).unwrap_err();
    assert!(
        matches!(&err, IpcError::BadKey(key) if key == "theme"),
        "got {err:?}"
    );
    assert!(!snapshot(&c).as_object().unwrap().contains_key("theme"));
}

#[test]
fn save_singleton_does_not_let_history_be_written_as_a_singleton() {
    let c = fresh_db();
    let err = save_singleton(&c, "history", "[]").unwrap_err();
    assert!(matches!(err, IpcError::BadKey(_)), "got {err:?}");
}

#[test]
fn save_singleton_rejects_invalid_json_and_keeps_the_old_value() {
    let c = fresh_db();
    save_singleton(&c, "settings", r#"{"ok":true}"#).unwrap();

    let err = save_singleton(&c, "settings", "{not json").unwrap_err();

    assert!(matches!(err, IpcError::BadJson(_)), "got {err:?}");
    assert_eq!(snapshot(&c)["settings"], json!({"ok": true}));
}

// ── append_set / delete_set ──────────────────────────────────────────────────

#[test]
fn append_set_shows_up_in_the_snapshot_unchanged() {
    let c = fresh_db();
    let set = set_json("a", "2025-03-01T10:00:00.000Z");
    append_set(&c, &set.to_string()).unwrap();
    assert_eq!(snapshot(&c)["history"], json!([set]));
}

#[test]
fn append_set_fills_defaults_for_a_set_without_plan_item_or_set_type() {
    let c = fresh_db();
    let mut set = set_json("a", "2025-03-01T10:00:00.000Z");
    let fields = set.as_object_mut().unwrap();
    fields.remove("planItemId");
    fields.remove("setType");

    append_set(&c, &set.to_string()).unwrap();

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

    let not_json = append_set(&c, "nope").unwrap_err();
    let missing_fields = append_set(&c, r#"{"id":"a"}"#).unwrap_err();

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

    let err = append_set(&c, &set_json("a", "2025-03-01T11:00:00.000Z").to_string()).unwrap_err();

    assert!(matches!(err, IpcError::Storage(_)), "got {err:?}");
    assert_eq!(history_ids(&c), ["a"]);
}

#[test]
fn delete_set_removes_only_that_set() {
    let c = fresh_db();
    append(&c, "a", "2025-03-01T10:00:00.000Z");
    append(&c, "b", "2025-03-01T11:00:00.000Z");
    delete_set(&c, "a").unwrap();
    assert_eq!(history_ids(&c), ["b"]);
}

#[test]
fn delete_set_of_an_unknown_id_succeeds_and_changes_nothing() {
    let c = fresh_db();
    append(&c, "a", "2025-03-01T10:00:00.000Z");
    delete_set(&c, "missing").unwrap();
    assert_eq!(history_ids(&c), ["a"]);
}

// ── export_data ──────────────────────────────────────────────────────────────

#[test]
fn export_of_an_empty_db_has_only_app_version_and_empty_history() {
    assert_eq!(
        exported(&fresh_db()),
        json!({"app": "Nabd", "version": 2, "history": []})
    );
}

#[test]
fn export_includes_stored_singletons_and_history_and_omits_nulls() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"days":[]}"#).unwrap();
    save_singleton(&c, "settings", r#"{"theme":"dark"}"#).unwrap();
    let set = set_json("a", "2025-03-01T10:00:00.000Z");
    append_set(&c, &set.to_string()).unwrap();

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
    save_singleton(&source, "program", r#"{"days":["mon"]}"#).unwrap();
    save_singleton(&source, "dayLog", r#"{"sets":3}"#).unwrap();
    append(&source, "a", "2025-03-01T10:00:00.000Z");
    append(&source, "b", "2025-03-02T10:00:00.000Z");

    let target = fresh_db();
    import_data(&target, &export_data(&source).unwrap()).unwrap();

    assert_eq!(snapshot(&target), snapshot(&source));
}

// ── import_data ──────────────────────────────────────────────────────────────

#[test]
fn import_replaces_present_singletons_and_the_history() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"name":"old"}"#).unwrap();
    append(&c, "old", "2025-03-01T10:00:00.000Z");

    let new_set = set_json("new", "2025-04-01T10:00:00.000Z");
    let doc = json!({
        "app": "Nabd",
        "version": 2,
        "program": {"name": "new"},
        "settings": {"theme": "light"},
        "history": [new_set],
    });
    import_data(&c, &doc.to_string()).unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["program"], json!({"name": "new"}));
    assert_eq!(snap["settings"], json!({"theme": "light"}));
    assert_eq!(snap["history"], json!([new_set]));
}

#[test]
fn import_leaves_absent_singletons_and_absent_history_alone() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"name":"kept"}"#).unwrap();
    save_singleton(&c, "settings", r#"{"theme":"dark"}"#).unwrap();
    append(&c, "kept", "2025-03-01T10:00:00.000Z");

    import_data(&c, r#"{"settings":{"theme":"light"}}"#).unwrap();

    let snap = snapshot(&c);
    assert_eq!(snap["program"], json!({"name": "kept"}));
    assert_eq!(snap["settings"], json!({"theme": "light"}));
    assert_eq!(history_ids(&c), ["kept"]);
}

#[test]
fn import_with_an_empty_history_array_clears_the_history() {
    let c = fresh_db();
    append(&c, "gone", "2025-03-01T10:00:00.000Z");
    import_data(&c, r#"{"history":[]}"#).unwrap();
    assert!(history_ids(&c).is_empty());
}

#[test]
fn import_ignores_keys_that_are_not_singletons() {
    let c = fresh_db();
    import_data(&c, r#"{"app":"Nabd","version":2,"theme":"dark"}"#).unwrap();

    let snap = snapshot(&c);
    let obj = snap.as_object().unwrap();
    assert_eq!(obj.len(), KV_KEYS.len() + 1);
    assert!(KV_KEYS.iter().all(|key| obj[*key].is_null()));
}

#[test]
fn import_rejects_json_that_is_not_an_object() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"name":"kept"}"#).unwrap();

    for bad in ["[]", "42", r#""text""#, "null", "{broken"] {
        let err = import_data(&c, bad).unwrap_err();
        assert!(matches!(err, IpcError::BadJson(_)), "{bad}: got {err:?}");
    }
    assert_eq!(snapshot(&c)["program"], json!({"name": "kept"}));
}

#[test]
fn import_changes_nothing_when_a_history_row_is_malformed() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"name":"old"}"#).unwrap();
    append(&c, "old", "2025-03-01T10:00:00.000Z");
    let before = snapshot(&c);

    let doc = json!({
        "program": {"name": "new"},
        "history": [set_json("good", "2025-04-01T10:00:00.000Z"), {"id": "bad"}],
    });
    let err = import_data(&c, &doc.to_string()).unwrap_err();

    assert!(matches!(err, IpcError::BadJson(_)), "got {err:?}");
    assert_eq!(snapshot(&c), before);
}

#[test]
fn import_changes_nothing_when_history_rows_clash_in_the_database() {
    let c = fresh_db();
    save_singleton(&c, "program", r#"{"name":"old"}"#).unwrap();
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
    let err = import_data(&c, &doc.to_string()).unwrap_err();

    assert!(matches!(err, IpcError::Storage(_)), "got {err:?}");
    assert_eq!(snapshot(&c), before);
}

// ── starts_minimized ─────────────────────────────────────────────────────────

#[test]
fn starts_minimized_defaults_to_false_without_settings() {
    assert!(!starts_minimized(&fresh_db()).unwrap());
}

#[test]
fn starts_minimized_defaults_to_false_when_the_flag_is_absent() {
    let c = fresh_db();
    save_singleton(&c, "settings", r#"{"theme":"dark"}"#).unwrap();
    assert!(!starts_minimized(&c).unwrap());
}

#[test]
fn starts_minimized_follows_the_stored_flag() {
    let c = fresh_db();

    save_singleton(&c, "settings", r#"{"minimizedByDefault":true}"#).unwrap();
    assert!(starts_minimized(&c).unwrap());

    save_singleton(&c, "settings", r#"{"minimizedByDefault":false}"#).unwrap();
    assert!(!starts_minimized(&c).unwrap());
}

#[test]
fn starts_minimized_is_false_when_the_flag_is_not_a_boolean() {
    let c = fresh_db();
    save_singleton(&c, "settings", r#"{"minimizedByDefault":"yes"}"#).unwrap();
    assert!(!starts_minimized(&c).unwrap());
}
