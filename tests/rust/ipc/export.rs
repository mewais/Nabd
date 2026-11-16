//! The export document.

use serde_json::json;

use crate::common::set_json;
use crate::support::{append, exported, fresh_db, snapshot, VERSION};

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
