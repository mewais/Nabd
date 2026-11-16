//! Migrating a schema v1 or v2 database.

use nabd_persistence::{LoggedSetRow, SCHEMA_VERSION};
use serde_json::json;

use crate::support::{history_ids, set_row, TempDb};

#[test]
fn v1_fixture_is_detected_as_version_one() {
    assert_eq!(TempDb::v1().stored_version(), "1");
}

#[test]
fn migration_bumps_the_version_to_the_current_one() {
    assert_eq!(SCHEMA_VERSION, 3);
    for db in [TempDb::v1(), TempDb::v2()] {
        let c = db.store().unwrap();
        assert_eq!(c.schema_version().unwrap(), SCHEMA_VERSION);
        assert_eq!(db.stored_version(), "3");
    }
}

#[test]
fn v2_fixture_is_detected_as_version_two() {
    assert_eq!(TempDb::v2().stored_version(), "2");
}

#[test]
fn migrating_v2_gives_every_set_the_session_of_its_own_date() {
    let db = TempDb::v2();
    let c = db.store().unwrap();

    let rows = c.all_history().unwrap().sets;
    let sessions: Vec<_> = rows
        .iter()
        .map(|row| (row.id.as_str(), row.session()))
        .collect();
    assert_eq!(sessions, [("old-1", "2025-01-02"), ("old-2", "2025-01-03")]);
    // What v2 knew stays as it was.
    assert_eq!(rows[1].plan_item_id.as_deref(), Some("item-1"));
    assert_eq!(rows[1].set_type, "drop");
}

#[test]
fn a_set_logged_after_migrating_v2_keeps_the_session_it_was_given() {
    let db = TempDb::v2();
    let c = db.store().unwrap();
    let continued = LoggedSetRow {
        session: Some("2025-01-03".to_string()),
        ..set_row("new-1", "2025-01-04T10:00:00.000Z")
    };
    c.append_history(&continued).unwrap();

    let rows = db.store().unwrap().all_history().unwrap().sets;
    assert_eq!(rows[2], continued);
    assert_eq!(rows[2].date, "2025-01-04");
}

#[test]
fn migration_keeps_old_history_rows_readable_with_defaults() {
    let db = TempDb::v1();
    let c = db.store().unwrap();

    let rows = c.all_history().unwrap().sets;
    assert_eq!(rows.len(), 1);
    let row = &rows[0];
    assert_eq!(row.id, "old-1");
    assert_eq!(row.exercise, "Squat");
    assert_eq!(row.muscles, ["quads", "glutes"]);
    assert_eq!(row.value, 8.0);
    assert_eq!(row.weight, Some(60.5));
    assert_eq!(row.trigger, "timer");
    assert_eq!(row.plan_item_id, None);
    assert_eq!(row.set_type, "working");
    assert_eq!(row.session(), "2025-01-02");
}

#[test]
fn migration_folds_the_theme_into_existing_settings() {
    let db = TempDb::v1();
    db.insert_kv("theme", r#""light""#);
    db.insert_kv("settings", r#"{"intervalMin":45,"sound":true}"#);

    let c = db.store().unwrap();

    assert_eq!(
        c.get_json("settings").unwrap(),
        json!({"intervalMin": 45, "sound": true, "theme": "light"})
    );
    assert_eq!(c.get_kv("theme").unwrap(), None);
}

#[test]
fn migration_creates_settings_from_the_theme_when_there_were_none() {
    let db = TempDb::v1();
    db.insert_kv("theme", r#""light""#);

    let c = db.store().unwrap();

    assert_eq!(c.get_json("settings").unwrap(), json!({"theme": "light"}));
    assert_eq!(c.get_kv("theme").unwrap(), None);
}

#[test]
fn migration_leaves_settings_alone_when_there_is_no_theme_row() {
    let db = TempDb::v1();
    db.insert_kv("settings", r#"{"intervalMin":45}"#);

    let c = db.store().unwrap();

    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"intervalMin":45}"#)
    );
}

#[test]
fn migration_keeps_the_old_day_state_and_the_other_singletons() {
    let db = TempDb::v1();
    // The old blob carries the floating-day position, which history cannot rebuild.
    let day_state = r#"{"date":"2025-01-02","floatingIndex":2,"slots":[1,2,3]}"#;
    db.insert_kv("dayState", day_state);
    db.insert_kv("program", r#"{"days":[]}"#);

    let c = db.store().unwrap();

    assert_eq!(c.get_kv("dayState").unwrap().as_deref(), Some(day_state));
    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
}

#[test]
fn migrated_db_accepts_new_style_rows_and_survives_a_second_init() {
    let db = TempDb::v1();
    db.insert_kv("theme", r#""light""#);
    let c = db.store().unwrap();

    let new_row = LoggedSetRow {
        plan_item_id: Some("item-9".to_string()),
        set_type: "warmup".to_string(),
        ..set_row("new-1", "2025-06-01T10:00:00.000Z")
    };
    c.append_history(&new_row).unwrap();
    c.set_kv("dayState", r#"{"date":"2025-06-01"}"#).unwrap();

    let c = db.store().unwrap();

    assert_eq!(c.schema_version().unwrap(), SCHEMA_VERSION);
    assert_eq!(history_ids(&c), ["old-1", "new-1"]);
    assert_eq!(c.all_history().unwrap().sets[1], new_row);
    // A v2 dayState must not be deleted by re-running init.
    assert_eq!(
        c.get_kv("dayState").unwrap().as_deref(),
        Some(r#"{"date":"2025-06-01"}"#)
    );
}

#[test]
fn a_failed_migration_leaves_the_v1_database_untouched_and_retryable() {
    let db = TempDb::v1();
    db.insert_kv("theme", "not json");

    assert!(db.store().is_err());
    assert_eq!(db.stored_version(), "1");

    db.raw()
        .execute("UPDATE kv SET value = '\"dark\"' WHERE key = 'theme'", [])
        .unwrap();
    assert_eq!(
        db.store().unwrap().schema_version().unwrap(),
        SCHEMA_VERSION
    );
}
