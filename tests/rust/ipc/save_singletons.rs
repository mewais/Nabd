//! Saving singletons, one or several at a time.

use nabd_ipc::IpcError;
use nabd_persistence::KV_KEYS;
use serde_json::{json, Value};

use crate::support::{fresh_db, snapshot};

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
