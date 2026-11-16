//! The boot snapshot.

use nabd_persistence::KV_KEYS;
use serde_json::{json, Value};

use crate::support::{fresh_db, snapshot};

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
