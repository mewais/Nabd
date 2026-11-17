//! The boot snapshot.

use nabd_persistence::KV_KEYS;
use serde_json::{json, Value};

use nabd_ipc::DataCommands;

use crate::common::TempDb;
use crate::support::{append, fresh_db, history_ids, snapshot};

#[test]
fn load_all_on_an_empty_db_has_every_key_null_and_no_history() {
    let snap = snapshot(&fresh_db());
    let obj = snap.as_object().unwrap();

    assert_eq!(obj.len(), KV_KEYS.len() + 2);
    for key in KV_KEYS {
        assert_eq!(
            obj.get(key),
            Some(&Value::Null),
            "{key} should be present and null"
        );
    }
    assert_eq!(obj["history"], json!([]));
    assert_eq!(obj["unreadableSets"], json!(0));
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

#[test]
fn load_all_leaves_out_a_set_that_cannot_be_read_and_says_how_many() {
    let db = TempDb::new();
    let c = DataCommands::open(db.path()).unwrap();
    append(&c, "good", "2025-03-01T10:00:00.000Z");
    append(&c, "bad", "2025-03-01T11:00:00.000Z");
    db.damage_set("bad");

    assert_eq!(history_ids(&c), ["good"]);
    assert_eq!(snapshot(&c)["unreadableSets"], json!(1));
}
