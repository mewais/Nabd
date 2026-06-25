//! B13 · nabd-ipc — IPC command-core tests.
//!
//! Real value-asserting tests against an in-memory SQLite DB.
//! Behaviour tests are RED vs the skeleton (unimplemented panic), GREEN once
//! the code agent implements the bodies. error.rs tests are GREEN immediately
//! (error infra is already implemented).
//!
//! Zero #[should_panic]. Every assertion encodes a concrete expected value.

use nabd_ipc::{
    self,
    error::{IpcError, IpcResult},
    LoggedSetRow,
};
use nabd_persistence as db;
use serde_json::Value;

// ─── helpers ────────────────────────────────────────────────────────────────

/// Open a fresh in-memory DB and call init so every behaviour test starts
/// with a ready schema.
fn fresh_db() -> rusqlite::Connection {
    let c = db::open_memory().expect("open_memory must succeed");
    nabd_ipc::init(&c).expect("init must succeed on a fresh in-memory DB");
    c
}

/// Parse the JSON string returned by load_all / export_data.
fn parse(s: &str) -> Value {
    serde_json::from_str(s).expect("returned string must be valid JSON")
}

/// Build a minimal valid LoggedSetRow for test use.
fn make_row(id: &str, ts: &str, date: &str) -> LoggedSetRow {
    LoggedSetRow {
        id: id.to_string(),
        ex_id: "ex-push-up".to_string(),
        exercise: "Push-up".to_string(),
        group: "Chest".to_string(),
        muscles: vec!["pectoralis major".to_string(), "triceps".to_string()],
        value: 12.0,
        weight: None,
        ts: ts.to_string(),
        date: date.to_string(),
        trigger: "manual".to_string(),
    }
}

// ─── init + load_all ────────────────────────────────────────────────────────

/// After init, load_all on an empty DB must return a JSON object where all six
/// singleton keys are null and history is an empty array.
#[test]
fn load_all_empty_db_all_null_history_empty() {
    let c = fresh_db();
    let raw = nabd_ipc::load_all(&c).expect("load_all must not error on empty DB");
    let v = parse(&raw);

    // All six singletons must be present and null.
    assert_eq!(v["program"], Value::Null, "program must be null on empty DB");
    assert_eq!(v["settings"], Value::Null, "settings must be null on empty DB");
    assert_eq!(v["theme"], Value::Null, "theme must be null on empty DB");
    assert_eq!(
        v["customExercises"], Value::Null,
        "customExercises must be null on empty DB"
    );
    assert_eq!(
        v["rotationState"], Value::Null,
        "rotationState must be null on empty DB"
    );
    assert_eq!(
        v["dayState"], Value::Null,
        "dayState must be null on empty DB"
    );

    // history must be an empty array, not null, not missing.
    let hist = v["history"].as_array().expect("history must be a JSON array");
    assert_eq!(hist.len(), 0, "history must be empty on fresh DB");
}

// ─── save_singleton ──────────────────────────────────────────────────────────

/// Saving a valid key/value succeeds, and load_all reflects the stored value
/// as a parsed JSON value (not a raw string).
#[test]
fn save_singleton_theme_dark_round_trips() {
    let c = fresh_db();
    nabd_ipc::save_singleton(&c, "theme", "\"dark\"").expect("save_singleton must succeed");
    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    // The stored JSON string "\"dark\"" must be decoded back to the string "dark".
    assert_eq!(v["theme"], Value::String("dark".to_string()));
}

/// Saving each of the six canonical keys must succeed.
#[test]
fn save_singleton_all_valid_keys_accepted() {
    let c = fresh_db();
    let payloads: &[(&str, &str)] = &[
        ("program", "{\"id\":\"pgm-1\"}"),
        ("settings", "{\"unit\":\"kg\"}"),
        ("theme", "\"light\""),
        ("customExercises", "[]"),
        ("rotationState", "null"),
        ("dayState", "{\"day\":0}"),
    ];
    for (key, value) in payloads {
        nabd_ipc::save_singleton(&c, key, value)
            .unwrap_or_else(|e| panic!("save_singleton({key}) must succeed, got: {e}"));
    }
    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);

    assert_eq!(v["theme"], Value::String("light".to_string()));
    assert_eq!(v["settings"]["unit"], Value::String("kg".to_string()));
    assert_eq!(v["customExercises"], Value::Array(vec![]));
    assert_eq!(v["rotationState"], Value::Null);
    assert_eq!(v["dayState"]["day"], Value::Number(0.into()));
}

/// Saving an unknown key must return IpcError::BadKey (not panic, not BadJson).
#[test]
fn save_singleton_bad_key_returns_bad_key_error() {
    let c = fresh_db();
    let result = nabd_ipc::save_singleton(&c, "unknownKey", "\"value\"");
    match result {
        Err(IpcError::BadKey(k)) => {
            assert_eq!(k, "unknownKey", "BadKey must carry the rejected key name");
        }
        Err(other) => panic!("expected IpcError::BadKey, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadKey), got Ok"),
    }
}

/// Saving a valid key with invalid JSON must return IpcError::BadJson.
#[test]
fn save_singleton_bad_json_returns_bad_json_error() {
    let c = fresh_db();
    let result = nabd_ipc::save_singleton(&c, "theme", "not-json{{{");
    match result {
        Err(IpcError::BadJson(_)) => {}
        Err(other) => panic!("expected IpcError::BadJson, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadJson), got Ok"),
    }
}

// ─── append_set ──────────────────────────────────────────────────────────────

/// A valid row appended via append_set appears in load_all history with correct
/// field values (round-trip).
#[test]
fn append_set_valid_row_appears_in_load_all_history() {
    let c = fresh_db();
    let row = make_row("set-001", "2024-03-15T10:00:00Z", "2024-03-15");
    let row_json = serde_json::to_string(&row).expect("serialisation must succeed");

    nabd_ipc::append_set(&c, &row_json).expect("append_set must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    let hist = v["history"].as_array().expect("history must be an array");
    assert_eq!(hist.len(), 1, "history must contain exactly one row");

    let r = &hist[0];
    assert_eq!(r["id"], Value::String("set-001".to_string()));
    assert_eq!(r["ex_id"], Value::String("ex-push-up".to_string()));
    assert_eq!(r["exercise"], Value::String("Push-up".to_string()));
    assert_eq!(r["group"], Value::String("Chest".to_string()));
    assert_eq!(r["value"], serde_json::json!(12.0));
    assert_eq!(r["weight"], Value::Null);
    assert_eq!(r["ts"], Value::String("2024-03-15T10:00:00Z".to_string()));
    assert_eq!(r["date"], Value::String("2024-03-15".to_string()));
    assert_eq!(r["trigger"], Value::String("manual".to_string()));
    let muscles = r["muscles"].as_array().expect("muscles must be array");
    assert_eq!(muscles.len(), 2);
    assert_eq!(muscles[0], Value::String("pectoralis major".to_string()));
    assert_eq!(muscles[1], Value::String("triceps".to_string()));
}

/// Appending multiple sets preserves insertion order and all rows appear.
#[test]
fn append_set_multiple_rows_all_appear_in_order() {
    let c = fresh_db();
    let row1 = make_row("set-a", "2024-03-15T09:00:00Z", "2024-03-15");
    let row2 = make_row("set-b", "2024-03-15T10:00:00Z", "2024-03-15");

    nabd_ipc::append_set(&c, &serde_json::to_string(&row1).unwrap())
        .expect("append row1 must succeed");
    nabd_ipc::append_set(&c, &serde_json::to_string(&row2).unwrap())
        .expect("append row2 must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    let hist = v["history"].as_array().expect("history must be array");
    assert_eq!(hist.len(), 2, "history must contain two rows");
    // history ordered by ts ascending
    assert_eq!(hist[0]["id"], Value::String("set-a".to_string()));
    assert_eq!(hist[1]["id"], Value::String("set-b".to_string()));
}

/// Appending malformed JSON must return IpcError::BadJson.
#[test]
fn append_set_bad_json_returns_bad_json_error() {
    let c = fresh_db();
    let result = nabd_ipc::append_set(&c, "{invalid json!!!");
    match result {
        Err(IpcError::BadJson(_)) => {}
        Err(other) => panic!("expected IpcError::BadJson, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadJson), got Ok"),
    }
}

/// Appending a JSON object that is not a valid LoggedSetRow must return BadJson.
#[test]
fn append_set_wrong_shape_returns_bad_json_error() {
    let c = fresh_db();
    // Valid JSON but completely wrong shape — missing required fields.
    let result = nabd_ipc::append_set(&c, "{\"foo\":\"bar\"}");
    match result {
        Err(IpcError::BadJson(_)) => {}
        Err(other) => panic!("expected IpcError::BadJson, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadJson) for wrong-shape object, got Ok"),
    }
}

/// A row with a non-null weight round-trips through append_set / load_all.
#[test]
fn append_set_weighted_row_weight_preserved() {
    let c = fresh_db();
    let mut row = make_row("set-w", "2024-03-15T10:00:00Z", "2024-03-15");
    row.weight = Some(80.5);
    nabd_ipc::append_set(&c, &serde_json::to_string(&row).unwrap())
        .expect("append weighted row must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    let hist = v["history"].as_array().unwrap();
    assert_eq!(hist.len(), 1);
    assert_eq!(hist[0]["weight"], serde_json::json!(80.5));
}

// ─── export_data ─────────────────────────────────────────────────────────────

/// export_data on an empty DB returns envelope with app:"Nabd", version:1,
/// null singletons and empty history array.
#[test]
fn export_data_empty_db_envelope_structure() {
    let c = fresh_db();
    let raw = nabd_ipc::export_data(&c).expect("export_data must not error");
    let v = parse(&raw);

    assert_eq!(v["app"], Value::String("Nabd".to_string()), "app must be \"Nabd\"");
    assert_eq!(v["version"], Value::Number(1.into()), "version must be 1");

    // All six singletons null.
    assert_eq!(v["program"], Value::Null);
    assert_eq!(v["settings"], Value::Null);
    assert_eq!(v["theme"], Value::Null);
    assert_eq!(v["customExercises"], Value::Null);
    assert_eq!(v["rotationState"], Value::Null);
    assert_eq!(v["dayState"], Value::Null);

    // Empty history array.
    let hist = v["history"].as_array().expect("history must be an array");
    assert_eq!(hist.len(), 0);
}

/// export_data reflects previously saved singletons.
#[test]
fn export_data_reflects_saved_singletons() {
    let c = fresh_db();
    nabd_ipc::save_singleton(&c, "theme", "\"dark\"").expect("save theme");
    nabd_ipc::save_singleton(&c, "settings", "{\"unit\":\"lbs\"}").expect("save settings");

    let raw = nabd_ipc::export_data(&c).expect("export_data must not error");
    let v = parse(&raw);

    assert_eq!(v["app"], Value::String("Nabd".to_string()));
    assert_eq!(v["version"], Value::Number(1.into()));
    assert_eq!(v["theme"], Value::String("dark".to_string()));
    assert_eq!(v["settings"]["unit"], Value::String("lbs".to_string()));
    // Unsaved singletons still null.
    assert_eq!(v["program"], Value::Null);
}

/// export_data reflects appended history rows.
#[test]
fn export_data_reflects_history() {
    let c = fresh_db();
    let row = make_row("exp-001", "2024-03-15T10:00:00Z", "2024-03-15");
    nabd_ipc::append_set(&c, &serde_json::to_string(&row).unwrap()).expect("append");

    let raw = nabd_ipc::export_data(&c).expect("export_data must not error");
    let v = parse(&raw);

    assert_eq!(v["app"], Value::String("Nabd".to_string()));
    assert_eq!(v["version"], Value::Number(1.into()));
    let hist = v["history"].as_array().expect("history must be array");
    assert_eq!(hist.len(), 1);
    assert_eq!(hist[0]["id"], Value::String("exp-001".to_string()));
    assert_eq!(hist[0]["exercise"], Value::String("Push-up".to_string()));
}

// ─── import_data ─────────────────────────────────────────────────────────────

/// Importing a full AppData document sets all singletons and replaces history.
#[test]
fn import_data_full_document_applies_singletons_and_history() {
    let c = fresh_db();
    // Pre-seed some data that will be replaced.
    nabd_ipc::save_singleton(&c, "theme", "\"light\"").expect("pre-seed theme");
    let old_row = make_row("old-set", "2024-01-01T00:00:00Z", "2024-01-01");
    nabd_ipc::append_set(&c, &serde_json::to_string(&old_row).unwrap()).expect("pre-seed row");

    let new_row = make_row("new-set", "2024-03-15T10:00:00Z", "2024-03-15");
    let import_doc = serde_json::json!({
        "app": "Nabd",
        "version": 1,
        "program": {"id": "pgm-imported"},
        "settings": {"unit": "kg"},
        "theme": "dark",
        "customExercises": [{"id": "ce-1"}],
        "rotationState": {"rotation": 0},
        "dayState": {"day": 2},
        "history": [new_row]
    });

    nabd_ipc::import_data(&c, &import_doc.to_string()).expect("import_data must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);

    // Theme overwritten with the imported value.
    assert_eq!(v["theme"], Value::String("dark".to_string()));
    // Other singletons set.
    assert_eq!(v["program"]["id"], Value::String("pgm-imported".to_string()));
    assert_eq!(v["settings"]["unit"], Value::String("kg".to_string()));
    let ce = v["customExercises"].as_array().expect("customExercises array");
    assert_eq!(ce.len(), 1);
    assert_eq!(ce[0]["id"], Value::String("ce-1".to_string()));
    assert_eq!(v["rotationState"]["rotation"], Value::Number(0.into()));
    assert_eq!(v["dayState"]["day"], Value::Number(2.into()));

    // Old history row gone; new one present.
    let hist = v["history"].as_array().expect("history array");
    assert_eq!(hist.len(), 1, "old history must be replaced, not merged");
    assert_eq!(hist[0]["id"], Value::String("new-set".to_string()));
}

/// Partial import (only program key present) sets only that key; others untouched.
#[test]
fn import_data_partial_doc_only_sets_present_keys() {
    let c = fresh_db();
    // Pre-set theme before the partial import.
    nabd_ipc::save_singleton(&c, "theme", "\"dark\"").expect("pre-set theme");
    let existing_row = make_row("keep-set", "2024-03-15T10:00:00Z", "2024-03-15");
    nabd_ipc::append_set(&c, &serde_json::to_string(&existing_row).unwrap())
        .expect("pre-seed history");

    // Partial doc: only program is supplied.
    let partial = serde_json::json!({
        "program": {"id": "pgm-partial"}
    });
    nabd_ipc::import_data(&c, &partial.to_string()).expect("partial import must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);

    // Program was set.
    assert_eq!(v["program"]["id"], Value::String("pgm-partial".to_string()));
    // Theme untouched (was "dark", not in partial doc).
    assert_eq!(v["theme"], Value::String("dark".to_string()));
    // History not touched (no history key in partial doc).
    let hist = v["history"].as_array().expect("history array");
    assert_eq!(hist.len(), 1, "history must be unchanged by partial import");
    assert_eq!(hist[0]["id"], Value::String("keep-set".to_string()));
    // Other singletons still null.
    assert_eq!(v["settings"], Value::Null);
}

/// Importing with no singletons or history key in the document is a no-op.
#[test]
fn import_data_empty_object_is_noop() {
    let c = fresh_db();
    nabd_ipc::save_singleton(&c, "theme", "\"dark\"").expect("pre-set theme");

    nabd_ipc::import_data(&c, "{}").expect("empty-object import must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    assert_eq!(v["theme"], Value::String("dark".to_string()), "theme must be unchanged");
}

/// Importing an invalid JSON string must return IpcError::BadJson.
#[test]
fn import_data_bad_json_returns_bad_json_error() {
    let c = fresh_db();
    let result = nabd_ipc::import_data(&c, "not valid json {{");
    match result {
        Err(IpcError::BadJson(_)) => {}
        Err(other) => panic!("expected IpcError::BadJson, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadJson), got Ok"),
    }
}

/// Importing with a history array of invalid row shapes must return BadJson.
#[test]
fn import_data_history_wrong_shape_returns_bad_json_error() {
    let c = fresh_db();
    // history items are wrong shape — missing all required LoggedSetRow fields.
    let doc = serde_json::json!({
        "history": [{"totally": "wrong"}]
    });
    let result = nabd_ipc::import_data(&c, &doc.to_string());
    match result {
        Err(IpcError::BadJson(_)) => {}
        Err(other) => panic!("expected IpcError::BadJson, got: {other:?}"),
        Ok(_) => panic!("expected Err(BadJson) for wrong-shape history rows, got Ok"),
    }
}

/// Import replaces (not merges) history: pre-existing rows are gone after import.
#[test]
fn import_data_history_replaces_not_merges() {
    let c = fresh_db();
    // Pre-seed two rows.
    let r1 = make_row("pre-1", "2024-01-01T00:00:00Z", "2024-01-01");
    let r2 = make_row("pre-2", "2024-01-02T00:00:00Z", "2024-01-02");
    nabd_ipc::append_set(&c, &serde_json::to_string(&r1).unwrap()).expect("append r1");
    nabd_ipc::append_set(&c, &serde_json::to_string(&r2).unwrap()).expect("append r2");

    // Import with a single different row.
    let imported_row = make_row("post-1", "2024-03-15T10:00:00Z", "2024-03-15");
    let doc = serde_json::json!({
        "history": [imported_row]
    });
    nabd_ipc::import_data(&c, &doc.to_string()).expect("import must succeed");

    let raw = nabd_ipc::load_all(&c).expect("load_all must not error");
    let v = parse(&raw);
    let hist = v["history"].as_array().expect("history array");
    assert_eq!(hist.len(), 1, "history must be replaced, not merged (2 pre + 1 imported = 1)");
    assert_eq!(hist[0]["id"], Value::String("post-1".to_string()));
}

// ─── error.rs — GREEN tests (infrastructure already implemented) ─────────────

/// IpcError::BadKey carries the key name and formats correctly.
#[test]
fn error_bad_key_display() {
    let e = IpcError::BadKey("unknownKey".to_string());
    let msg = e.to_string();
    assert!(
        msg.contains("unknownKey"),
        "BadKey Display must include the key name, got: {msg}"
    );
}

/// IpcError::BadJson formats correctly.
#[test]
fn error_bad_json_display() {
    let e = IpcError::BadJson("unexpected end of input".to_string());
    let msg = e.to_string();
    assert!(
        msg.contains("unexpected end of input"),
        "BadJson Display must include the error detail, got: {msg}"
    );
}

/// IpcError::Storage formats correctly.
#[test]
fn error_storage_display() {
    let e = IpcError::Storage("disk full".to_string());
    let msg = e.to_string();
    assert!(
        msg.contains("disk full"),
        "Storage Display must include the detail, got: {msg}"
    );
}

/// From<nabd_persistence::Error> yields IpcError::Storage.
#[test]
fn error_from_persistence_error_yields_storage() {
    // Trigger a real persistence error: query on a connection with no schema.
    let c = db::open_memory().expect("open_memory must succeed");
    // get_kv on a connection with no tables returns a rusqlite error → persistence::Error.
    // We exercise the From conversion by converting explicitly.
    let persistence_err: nabd_persistence::Error =
        rusqlite::Error::QueryReturnedNoRows.into();
    let ipc_err = IpcError::from(persistence_err);
    match ipc_err {
        IpcError::Storage(msg) => {
            assert!(!msg.is_empty(), "Storage message must not be empty");
        }
        other => panic!("expected IpcError::Storage, got: {other:?}"),
    }
}

/// From<serde_json::Error> yields IpcError::BadJson.
#[test]
fn error_from_serde_json_error_yields_bad_json() {
    let serde_err: serde_json::Error =
        serde_json::from_str::<Value>("{{invalid").unwrap_err();
    let ipc_err = IpcError::from(serde_err);
    match ipc_err {
        IpcError::BadJson(msg) => {
            assert!(!msg.is_empty(), "BadJson message must not be empty");
        }
        other => panic!("expected IpcError::BadJson, got: {other:?}"),
    }
}

/// IpcResult is a type alias for Result<T, IpcError> and works as expected.
#[test]
fn error_ipc_result_type_alias() {
    let ok: IpcResult<u32> = Ok(42);
    assert_eq!(ok.unwrap(), 42);

    let err: IpcResult<u32> = Err(IpcError::BadKey("x".to_string()));
    assert!(err.is_err());
}
