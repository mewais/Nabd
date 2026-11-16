//! nabd-persistence — behaviour tests, against an in-memory database or,
//! where a test has to prepare or inspect the file behind the store's back, a
//! temporary one.

#[path = "../common/mod.rs"]
mod common;

use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};

use nabd_persistence::{Error, LoggedSetRow, Store, SCHEMA_VERSION};
use rusqlite::Connection;
use serde_json::{json, Value};

// ── fixtures ─────────────────────────────────────────────────────────────────

fn fresh_db() -> Store {
    Store::open_in_memory().unwrap()
}

/// A logged set with the given id and timestamp; everything else is fixed.
fn set_row(id: &str, ts: &str) -> LoggedSetRow {
    serde_json::from_value(common::set_json(id, ts)).unwrap()
}

fn history_ids(c: &Store) -> Vec<String> {
    c.all_history()
        .unwrap()
        .into_iter()
        .map(|row| row.id)
        .collect()
}

/// A database file of this test's own, removed when the test ends.
struct TempDb(PathBuf);

impl TempDb {
    fn new() -> Self {
        static NEXT: AtomicU32 = AtomicU32::new(0);
        let name = format!(
            "nabd-test-{}-{}.sqlite",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        );
        let path = std::env::temp_dir().join(name);
        let _ = std::fs::remove_file(&path);
        Self(path)
    }

    /// The file as plain SQLite, behind the store's back.
    fn raw(&self) -> Connection {
        Connection::open(&self.0).unwrap()
    }

    /// The file as the app opens it.
    fn store(&self) -> nabd_persistence::Result<Store> {
        Store::open(&self.0)
    }

    /// The schema version written in the file.
    fn stored_version(&self) -> String {
        self.raw()
            .query_row(
                "SELECT value FROM app_meta WHERE key = 'version'",
                [],
                |r| r.get(0),
            )
            .unwrap()
    }
}

impl Drop for TempDb {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

/// A database exactly as schema v1 left it: `history` without `plan_item_id` /
/// `set_type`, version '1', and one logged set.
fn v1_db() -> TempDb {
    let db = TempDb::new();
    db.raw()
        .execute_batch(
            "CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
             CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             CREATE TABLE history (
                id       TEXT PRIMARY KEY,
                ex_id    TEXT,
                exercise TEXT,
                \"group\"  TEXT,
                muscles  TEXT,
                value    REAL,
                weight   REAL,
                ts       TEXT,
                date     TEXT,
                trigger  TEXT
             );
             CREATE INDEX history_date_idx ON history(date);
             INSERT INTO app_meta (key, value) VALUES ('version', '1');
             INSERT INTO history (id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger)
             VALUES ('old-1', 'squat', 'Squat', 'legs', '[\"quads\",\"glutes\"]', 8, 60.5,
                     '2025-01-02T09:00:00.000Z', '2025-01-02', 'timer');",
        )
        .unwrap();
    db
}

fn insert_v1_kv(db: &TempDb, key: &str, value: &str) {
    db.raw()
        .execute("INSERT INTO kv (key, value) VALUES (?1, ?2)", [key, value])
        .unwrap();
}

// ── schema ───────────────────────────────────────────────────────────────────

#[test]
fn a_fresh_database_is_at_the_current_schema_version() {
    assert_eq!(fresh_db().schema_version().unwrap(), SCHEMA_VERSION);
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

// ── kv singletons ────────────────────────────────────────────────────────────

#[test]
fn get_kv_returns_none_for_a_missing_key() {
    let c = fresh_db();
    assert_eq!(c.get_kv("settings").unwrap(), None);
}

#[test]
fn set_kv_then_get_kv_round_trips_the_exact_string() {
    let c = fresh_db();
    c.set_kv("settings", r#"{"intervalMin": 45}"#).unwrap();
    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"intervalMin": 45}"#)
    );
}

#[test]
fn set_kv_overwrites_an_existing_value() {
    let c = fresh_db();
    c.set_kv("settings", r#"{"a":1}"#).unwrap();
    c.set_kv("settings", r#"{"a":2}"#).unwrap();
    assert_eq!(c.get_kv("settings").unwrap().as_deref(), Some(r#"{"a":2}"#));
}

#[test]
fn kv_keys_are_independent() {
    let c = fresh_db();
    c.set_kv("program", "1").unwrap();
    c.set_kv("dayLog", "2").unwrap();
    assert_eq!(c.get_kv("program").unwrap().as_deref(), Some("1"));
    assert_eq!(c.get_kv("dayLog").unwrap().as_deref(), Some("2"));
}

// ── history ──────────────────────────────────────────────────────────────────

#[test]
fn history_is_empty_on_a_fresh_db() {
    let c = fresh_db();
    assert!(c.all_history().unwrap().is_empty());
}

#[test]
fn appended_row_round_trips_every_field() {
    let c = fresh_db();
    let row = LoggedSetRow {
        weight: Some(22.5),
        value: 7.5,
        plan_item_id: Some("item-3".to_string()),
        set_type: "drop".to_string(),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    c.append_history(&row).unwrap();
    assert_eq!(c.all_history().unwrap(), [row]);
}

#[test]
fn all_history_is_ordered_by_timestamp_not_insertion() {
    let c = fresh_db();
    c.append_history(&set_row("late", "2025-03-02T08:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("early", "2025-03-01T08:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("middle", "2025-03-01T20:00:00.000Z"))
        .unwrap();
    assert_eq!(history_ids(&c), ["early", "middle", "late"]);
}

#[test]
fn appending_a_duplicate_id_is_an_error() {
    let c = fresh_db();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    assert!(c
        .append_history(&set_row("a", "2025-03-01T11:00:00.000Z"))
        .is_err());
    assert_eq!(history_ids(&c), ["a"]);
}

#[test]
fn delete_history_removes_only_the_given_row() {
    let c = fresh_db();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("b", "2025-03-01T11:00:00.000Z"))
        .unwrap();
    c.delete_history("a").unwrap();
    assert_eq!(history_ids(&c), ["b"]);
}

#[test]
fn delete_history_of_an_unknown_id_is_a_no_op() {
    let c = fresh_db();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    c.delete_history("nope").unwrap();
    assert_eq!(history_ids(&c), ["a"]);
}

// ── LoggedSetRow JSON ────────────────────────────────────────────────────────

#[test]
fn logged_set_row_serialises_as_camel_case() {
    let row = LoggedSetRow {
        plan_item_id: Some("item-1".to_string()),
        set_type: "warmup".to_string(),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    assert_eq!(
        serde_json::to_value(&row).unwrap(),
        json!({
            "id": "a",
            "exId": "push-up",
            "exercise": "Push-up",
            "group": "chest",
            "muscles": ["chest", "triceps"],
            "value": 12.0,
            "weight": null,
            "ts": "2025-03-01T10:00:00.000Z",
            "date": "2025-03-01",
            "trigger": "manual",
            "planItemId": "item-1",
            "setType": "warmup",
        })
    );
}

#[test]
fn logged_set_row_json_round_trips() {
    let row = LoggedSetRow {
        weight: Some(40.0),
        plan_item_id: Some("item-1".to_string()),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    let json = serde_json::to_string(&row).unwrap();
    assert_eq!(serde_json::from_str::<LoggedSetRow>(&json).unwrap(), row);
}

#[test]
fn old_json_without_plan_item_or_set_type_gets_defaults() {
    let old = json!({
        "id": "a",
        "exId": "plank",
        "exercise": "Plank",
        "group": "core",
        "muscles": ["abs"],
        "value": 60,
        "weight": null,
        "ts": "2024-12-01T10:00:00.000Z",
        "date": "2024-12-01",
        "trigger": "idle",
    });
    let row: LoggedSetRow = serde_json::from_value(old).unwrap();
    assert_eq!(row.plan_item_id, None);
    assert_eq!(row.set_type, "working");
    assert_eq!(row.ex_id, "plank");
    assert_eq!(row.value, 60.0);
}

// ── replace_all ──────────────────────────────────────────────────────────────

#[test]
fn replace_all_replaces_given_singletons_and_the_whole_history() {
    let c = fresh_db();
    c.set_kv("program", r#""old program""#).unwrap();
    c.set_kv("dayLog", r#""untouched""#).unwrap();
    c.append_history(&set_row("old", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    let singletons = [
        ("program", r#""new program""#.to_string()),
        ("settings", r#"{"theme":"dark"}"#.to_string()),
    ];
    let history = [
        set_row("new-2", "2025-04-02T10:00:00.000Z"),
        set_row("new-1", "2025-04-01T10:00:00.000Z"),
    ];
    c.replace_all(&singletons, Some(&history)).unwrap();

    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#""new program""#)
    );
    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"theme":"dark"}"#)
    );
    assert_eq!(
        c.get_kv("dayLog").unwrap().as_deref(),
        Some(r#""untouched""#)
    );
    assert_eq!(history_ids(&c), ["new-1", "new-2"]);
}

#[test]
fn replace_all_without_history_leaves_history_untouched() {
    let c = fresh_db();
    c.append_history(&set_row("keep", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    c.replace_all(&[("program", "1".to_string())], None)
        .unwrap();

    assert_eq!(c.get_kv("program").unwrap().as_deref(), Some("1"));
    assert_eq!(history_ids(&c), ["keep"]);
}

#[test]
fn replace_all_with_empty_history_clears_history() {
    let c = fresh_db();
    c.append_history(&set_row("gone", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    c.replace_all(&[], Some(&[])).unwrap();

    assert!(c.all_history().unwrap().is_empty());
}

#[test]
fn replace_all_rolls_everything_back_when_a_history_row_fails() {
    let c = fresh_db();
    c.set_kv("program", r#""old program""#).unwrap();
    c.append_history(&set_row("old", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    // Two rows with the same id: the second insert violates the primary key.
    let clashing = [
        set_row("dup", "2025-04-01T10:00:00.000Z"),
        set_row("dup", "2025-04-02T10:00:00.000Z"),
    ];
    let result = c.replace_all(
        &[("program", r#""new program""#.to_string())],
        Some(&clashing),
    );

    assert!(result.is_err());
    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#""old program""#)
    );
    assert_eq!(history_ids(&c), ["old"]);
}

// ── v1 → v2 migration ────────────────────────────────────────────────────────

#[test]
fn v1_fixture_is_detected_as_version_one() {
    assert_eq!(v1_db().stored_version(), "1");
}

#[test]
fn migration_bumps_the_version_to_two() {
    let db = v1_db();
    let c = db.store().unwrap();
    assert_eq!(c.schema_version().unwrap(), 2);
}

#[test]
fn migration_keeps_old_history_rows_readable_with_defaults() {
    let db = v1_db();
    let c = db.store().unwrap();

    let rows = c.all_history().unwrap();
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
}

#[test]
fn migration_folds_the_theme_into_existing_settings() {
    let db = v1_db();
    insert_v1_kv(&db, "theme", r#""light""#);
    insert_v1_kv(&db, "settings", r#"{"intervalMin":45,"sound":true}"#);

    let c = db.store().unwrap();

    let settings: Value = serde_json::from_str(&c.get_kv("settings").unwrap().unwrap()).unwrap();
    assert_eq!(
        settings,
        json!({"intervalMin": 45, "sound": true, "theme": "light"})
    );
    assert_eq!(c.get_kv("theme").unwrap(), None);
}

#[test]
fn migration_creates_settings_from_the_theme_when_there_were_none() {
    let db = v1_db();
    insert_v1_kv(&db, "theme", r#""light""#);

    let c = db.store().unwrap();

    let settings: Value = serde_json::from_str(&c.get_kv("settings").unwrap().unwrap()).unwrap();
    assert_eq!(settings, json!({"theme": "light"}));
    assert_eq!(c.get_kv("theme").unwrap(), None);
}

#[test]
fn migration_leaves_settings_alone_when_there_is_no_theme_row() {
    let db = v1_db();
    insert_v1_kv(&db, "settings", r#"{"intervalMin":45}"#);

    let c = db.store().unwrap();

    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"intervalMin":45}"#)
    );
}

#[test]
fn migration_keeps_the_old_day_state_and_the_other_singletons() {
    let db = v1_db();
    // The old blob carries the floating-day position, which history cannot rebuild.
    let day_state = r#"{"date":"2025-01-02","floatingIndex":2,"slots":[1,2,3]}"#;
    insert_v1_kv(&db, "dayState", day_state);
    insert_v1_kv(&db, "program", r#"{"days":[]}"#);

    let c = db.store().unwrap();

    assert_eq!(c.get_kv("dayState").unwrap().as_deref(), Some(day_state));
    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
}

#[test]
fn migrated_db_accepts_new_style_rows_and_survives_a_second_init() {
    let db = v1_db();
    insert_v1_kv(&db, "theme", r#""light""#);
    let c = db.store().unwrap();

    let new_row = LoggedSetRow {
        plan_item_id: Some("item-9".to_string()),
        set_type: "warmup".to_string(),
        ..set_row("new-1", "2025-06-01T10:00:00.000Z")
    };
    c.append_history(&new_row).unwrap();
    c.set_kv("dayState", r#"{"date":"2025-06-01"}"#).unwrap();

    let c = db.store().unwrap();

    assert_eq!(c.schema_version().unwrap(), 2);
    assert_eq!(history_ids(&c), ["old-1", "new-1"]);
    assert_eq!(c.all_history().unwrap()[1], new_row);
    // A v2 dayState must not be deleted by re-running init.
    assert_eq!(
        c.get_kv("dayState").unwrap().as_deref(),
        Some(r#"{"date":"2025-06-01"}"#)
    );
}

#[test]
fn a_failed_migration_leaves_the_v1_database_untouched_and_retryable() {
    let db = v1_db();
    insert_v1_kv(&db, "theme", "not json");

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
