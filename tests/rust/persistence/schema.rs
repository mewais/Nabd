//! Opening a database: its schema version, and files this build must refuse.

use nabd_persistence::{Error, SCHEMA_VERSION};

use crate::common::fresh_store;
use crate::support::{history_ids, set_row, TempDb};

#[test]
fn a_fresh_database_is_at_the_current_schema_version() {
    assert_eq!(fresh_store().schema_version().unwrap(), SCHEMA_VERSION);
}

#[test]
fn a_database_file_is_reopened_with_its_data() {
    let db = TempDb::new();
    {
        let c = db.store().unwrap();
        c.set_kv("program", r#"{"days":[]}"#).unwrap();
        c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
            .unwrap();
    }

    let reopened = db.store().unwrap();
    assert_eq!(reopened.schema_version().unwrap(), SCHEMA_VERSION);
    assert_eq!(
        reopened.get_kv("program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
    assert_eq!(history_ids(&reopened), ["a"]);
}

#[test]
fn a_database_from_a_newer_build_is_refused_and_left_untouched() {
    let db = TempDb::new();
    db.store()
        .unwrap()
        .set_kv("program", r#"{"days":[]}"#)
        .unwrap();
    let newer = SCHEMA_VERSION + 1;
    db.raw()
        .execute(
            "UPDATE app_meta SET value = ?1 WHERE key = 'version'",
            [newer.to_string()],
        )
        .unwrap();

    let err = db.store().err().unwrap();

    assert!(
        matches!(err, Error::NewerSchema { found, supported }
            if found == newer && supported == SCHEMA_VERSION),
        "got {err:?}"
    );
    assert!(err.to_string().contains("newer version of Nabd"));
    assert_eq!(db.stored_version(), newer.to_string());
    let program: String = db
        .raw()
        .query_row("SELECT value FROM kv WHERE key = 'program'", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(program, r#"{"days":[]}"#);
}

#[test]
fn a_schema_version_that_is_not_a_number_is_an_error_not_a_fresh_database() {
    let db = TempDb::new();
    drop(db.store().unwrap());
    db.raw()
        .execute(
            "UPDATE app_meta SET value = 'two' WHERE key = 'version'",
            [],
        )
        .unwrap();

    assert!(matches!(
        db.store().err().unwrap(),
        Error::UnreadableSchemaVersion(text) if text == "two"
    ));
}
