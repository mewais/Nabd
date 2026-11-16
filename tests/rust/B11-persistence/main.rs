//! B11 · nabd-persistence — behaviour tests against an in-memory database.

use nabd_persistence::{
    all_history, append_history, delete_history, get_kv, init_schema, open_at, open_memory,
    replace_all, schema_version, set_kv, Error, LoggedSetRow, SCHEMA_VERSION,
};
use rusqlite::Connection;
use serde_json::{json, Value};

// ── fixtures ─────────────────────────────────────────────────────────────────

/// A fresh, initialised in-memory database.
fn fresh_db() -> Connection {
    let c = open_memory().unwrap();
    init_schema(&c).unwrap();
    c
}

/// A logged set with the given id and timestamp; everything else is fixed.
fn set_row(id: &str, ts: &str) -> LoggedSetRow {
    LoggedSetRow {
        id: id.to_string(),
        ex_id: "push-up".to_string(),
        exercise: "Push-up".to_string(),
        group: "chest".to_string(),
        muscles: vec!["chest".to_string(), "triceps".to_string()],
        value: 12.0,
        weight: None,
        ts: ts.to_string(),
        date: ts[..10].to_string(),
        trigger: "manual".to_string(),
        plan_item_id: None,
        set_type: "working".to_string(),
    }
}

fn history_ids(c: &Connection) -> Vec<String> {
    all_history(c)
        .unwrap()
        .into_iter()
        .map(|row| row.id)
        .collect()
}

/// A database exactly as schema v1 left it: `history` without `plan_item_id` /
/// `set_type`, version '1', and one logged set.
fn v1_db() -> Connection {
    let c = open_memory().unwrap();
    c.execute_batch(
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
    c
}

fn insert_v1_kv(c: &Connection, key: &str, value: &str) {
    c.execute("INSERT INTO kv (key, value) VALUES (?1, ?2)", [key, value])
        .unwrap();
}

/// Read a kv row directly, including keys the crate no longer knows about.
fn raw_kv(c: &Connection, key: &str) -> Option<String> {
    let mut stmt = c.prepare("SELECT value FROM kv WHERE key = ?1").unwrap();
    let mut rows = stmt.query([key]).unwrap();
    rows.next().unwrap().map(|row| row.get(0).unwrap())
}

// ── schema ───────────────────────────────────────────────────────────────────

#[test]
fn uninitialised_db_reports_version_zero() {
    let c = open_memory().unwrap();
    assert_eq!(schema_version(&c).unwrap(), 0);
}

#[test]
fn fresh_db_is_at_current_schema_version() {
    let c = fresh_db();
    assert_eq!(SCHEMA_VERSION, 2);
    assert_eq!(schema_version(&c).unwrap(), SCHEMA_VERSION);
}

#[test]
fn init_schema_is_idempotent_and_keeps_data() {
    let c = fresh_db();
    set_kv(&c, "program", r#"{"days":[]}"#).unwrap();
    append_history(&c, &set_row("a", "2025-03-01T10:00:00.000Z")).unwrap();

    init_schema(&c).unwrap();
    init_schema(&c).unwrap();

    assert_eq!(schema_version(&c).unwrap(), SCHEMA_VERSION);
    assert_eq!(
        get_kv(&c, "program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
    assert_eq!(history_ids(&c), ["a"]);
}

// ── kv singletons ────────────────────────────────────────────────────────────

#[test]
fn get_kv_returns_none_for_a_missing_key() {
    let c = fresh_db();
    assert_eq!(get_kv(&c, "settings").unwrap(), None);
}

#[test]
fn set_kv_then_get_kv_round_trips_the_exact_string() {
    let c = fresh_db();
    set_kv(&c, "settings", r#"{"intervalMin": 45}"#).unwrap();
    assert_eq!(
        get_kv(&c, "settings").unwrap().as_deref(),
        Some(r#"{"intervalMin": 45}"#)
    );
}

#[test]
fn set_kv_overwrites_an_existing_value() {
    let c = fresh_db();
    set_kv(&c, "settings", r#"{"a":1}"#).unwrap();
    set_kv(&c, "settings", r#"{"a":2}"#).unwrap();
    assert_eq!(
        get_kv(&c, "settings").unwrap().as_deref(),
        Some(r#"{"a":2}"#)
    );
}

#[test]
fn kv_keys_are_independent() {
    let c = fresh_db();
    set_kv(&c, "program", "1").unwrap();
    set_kv(&c, "dayLog", "2").unwrap();
    assert_eq!(get_kv(&c, "program").unwrap().as_deref(), Some("1"));
    assert_eq!(get_kv(&c, "dayLog").unwrap().as_deref(), Some("2"));
}

// ── history ──────────────────────────────────────────────────────────────────

#[test]
fn history_is_empty_on_a_fresh_db() {
    let c = fresh_db();
    assert!(all_history(&c).unwrap().is_empty());
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
    append_history(&c, &row).unwrap();
    assert_eq!(all_history(&c).unwrap(), [row]);
}

#[test]
fn all_history_is_ordered_by_timestamp_not_insertion() {
    let c = fresh_db();
    append_history(&c, &set_row("late", "2025-03-02T08:00:00.000Z")).unwrap();
    append_history(&c, &set_row("early", "2025-03-01T08:00:00.000Z")).unwrap();
    append_history(&c, &set_row("middle", "2025-03-01T20:00:00.000Z")).unwrap();
    assert_eq!(history_ids(&c), ["early", "middle", "late"]);
}

#[test]
fn appending_a_duplicate_id_is_an_error() {
    let c = fresh_db();
    append_history(&c, &set_row("a", "2025-03-01T10:00:00.000Z")).unwrap();
    assert!(append_history(&c, &set_row("a", "2025-03-01T11:00:00.000Z")).is_err());
    assert_eq!(history_ids(&c), ["a"]);
}

#[test]
fn delete_history_removes_only_the_given_row() {
    let c = fresh_db();
    append_history(&c, &set_row("a", "2025-03-01T10:00:00.000Z")).unwrap();
    append_history(&c, &set_row("b", "2025-03-01T11:00:00.000Z")).unwrap();
    delete_history(&c, "a").unwrap();
    assert_eq!(history_ids(&c), ["b"]);
}

#[test]
fn delete_history_of_an_unknown_id_is_a_no_op() {
    let c = fresh_db();
    append_history(&c, &set_row("a", "2025-03-01T10:00:00.000Z")).unwrap();
    delete_history(&c, "nope").unwrap();
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
    set_kv(&c, "program", r#""old program""#).unwrap();
    set_kv(&c, "dayLog", r#""untouched""#).unwrap();
    append_history(&c, &set_row("old", "2025-03-01T10:00:00.000Z")).unwrap();

    let singletons = [
        ("program", r#""new program""#.to_string()),
        ("settings", r#"{"theme":"dark"}"#.to_string()),
    ];
    let history = [
        set_row("new-2", "2025-04-02T10:00:00.000Z"),
        set_row("new-1", "2025-04-01T10:00:00.000Z"),
    ];
    replace_all(&c, &singletons, Some(&history)).unwrap();

    assert_eq!(
        get_kv(&c, "program").unwrap().as_deref(),
        Some(r#""new program""#)
    );
    assert_eq!(
        get_kv(&c, "settings").unwrap().as_deref(),
        Some(r#"{"theme":"dark"}"#)
    );
    assert_eq!(
        get_kv(&c, "dayLog").unwrap().as_deref(),
        Some(r#""untouched""#)
    );
    assert_eq!(history_ids(&c), ["new-1", "new-2"]);
}

#[test]
fn replace_all_without_history_leaves_history_untouched() {
    let c = fresh_db();
    append_history(&c, &set_row("keep", "2025-03-01T10:00:00.000Z")).unwrap();

    replace_all(&c, &[("program", "1".to_string())], None).unwrap();

    assert_eq!(get_kv(&c, "program").unwrap().as_deref(), Some("1"));
    assert_eq!(history_ids(&c), ["keep"]);
}

#[test]
fn replace_all_with_empty_history_clears_history() {
    let c = fresh_db();
    append_history(&c, &set_row("gone", "2025-03-01T10:00:00.000Z")).unwrap();

    replace_all(&c, &[], Some(&[])).unwrap();

    assert!(all_history(&c).unwrap().is_empty());
}

#[test]
fn replace_all_rolls_everything_back_when_a_history_row_fails() {
    let c = fresh_db();
    set_kv(&c, "program", r#""old program""#).unwrap();
    append_history(&c, &set_row("old", "2025-03-01T10:00:00.000Z")).unwrap();

    // Two rows with the same id: the second insert violates the primary key.
    let clashing = [
        set_row("dup", "2025-04-01T10:00:00.000Z"),
        set_row("dup", "2025-04-02T10:00:00.000Z"),
    ];
    let result = replace_all(
        &c,
        &[("program", r#""new program""#.to_string())],
        Some(&clashing),
    );

    assert!(result.is_err());
    assert_eq!(
        get_kv(&c, "program").unwrap().as_deref(),
        Some(r#""old program""#)
    );
    assert_eq!(history_ids(&c), ["old"]);
}

#[test]
fn a_database_from_a_newer_build_is_refused_and_left_untouched() {
    let c = fresh_db();
    set_kv(&c, "program", r#"{"days":[]}"#).unwrap();
    let newer = SCHEMA_VERSION + 1;
    c.execute(
        "UPDATE app_meta SET value = ?1 WHERE key = 'version'",
        [newer.to_string()],
    )
    .unwrap();

    let err = init_schema(&c).unwrap_err();

    assert!(
        matches!(err, Error::NewerSchema { found, supported }
            if found == newer && supported == SCHEMA_VERSION),
        "got {err:?}"
    );
    assert!(err.to_string().contains("newer version of Nabd"));
    assert_eq!(schema_version(&c).unwrap(), newer);
    assert_eq!(
        get_kv(&c, "program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
}

#[test]
fn a_schema_version_that_is_not_a_number_is_an_error_not_a_fresh_database() {
    let c = fresh_db();
    c.execute(
        "UPDATE app_meta SET value = 'two' WHERE key = 'version'",
        [],
    )
    .unwrap();

    assert!(matches!(
        schema_version(&c).unwrap_err(),
        Error::UnreadableSchemaVersion(text) if text == "two"
    ));
    assert!(init_schema(&c).is_err());
}

#[test]
fn a_database_file_is_opened_from_a_path_and_reopened_with_its_data() {
    let path = std::env::temp_dir().join(format!("nabd-open-at-{}.sqlite", std::process::id()));
    let _ = std::fs::remove_file(&path);
    {
        let c = open_at(&path).unwrap();
        init_schema(&c).unwrap();
        set_kv(&c, "program", r#"{"days":[]}"#).unwrap();
    }

    let reopened = open_at(&path).unwrap();
    init_schema(&reopened).unwrap();
    assert_eq!(
        get_kv(&reopened, "program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
    drop(reopened);
    std::fs::remove_file(&path).unwrap();
}

// ── v1 → v2 migration ────────────────────────────────────────────────────────

#[test]
fn v1_fixture_is_detected_as_version_one() {
    assert_eq!(schema_version(&v1_db()).unwrap(), 1);
}

#[test]
fn migration_bumps_the_version_to_two() {
    let c = v1_db();
    init_schema(&c).unwrap();
    assert_eq!(schema_version(&c).unwrap(), 2);
}

#[test]
fn migration_keeps_old_history_rows_readable_with_defaults() {
    let c = v1_db();
    init_schema(&c).unwrap();

    let rows = all_history(&c).unwrap();
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
    let c = v1_db();
    insert_v1_kv(&c, "theme", r#""light""#);
    insert_v1_kv(&c, "settings", r#"{"intervalMin":45,"sound":true}"#);

    init_schema(&c).unwrap();

    let settings: Value = serde_json::from_str(&get_kv(&c, "settings").unwrap().unwrap()).unwrap();
    assert_eq!(
        settings,
        json!({"intervalMin": 45, "sound": true, "theme": "light"})
    );
    assert_eq!(raw_kv(&c, "theme"), None);
}

#[test]
fn migration_creates_settings_from_the_theme_when_there_were_none() {
    let c = v1_db();
    insert_v1_kv(&c, "theme", r#""light""#);

    init_schema(&c).unwrap();

    let settings: Value = serde_json::from_str(&get_kv(&c, "settings").unwrap().unwrap()).unwrap();
    assert_eq!(settings, json!({"theme": "light"}));
    assert_eq!(raw_kv(&c, "theme"), None);
}

#[test]
fn migration_leaves_settings_alone_when_there_is_no_theme_row() {
    let c = v1_db();
    insert_v1_kv(&c, "settings", r#"{"intervalMin":45}"#);

    init_schema(&c).unwrap();

    assert_eq!(
        get_kv(&c, "settings").unwrap().as_deref(),
        Some(r#"{"intervalMin":45}"#)
    );
}

#[test]
fn migration_keeps_the_old_day_state_and_the_other_singletons() {
    let c = v1_db();
    // The old blob carries the floating-day position, which history cannot rebuild.
    let day_state = r#"{"date":"2025-01-02","floatingIndex":2,"slots":[1,2,3]}"#;
    insert_v1_kv(&c, "dayState", day_state);
    insert_v1_kv(&c, "program", r#"{"days":[]}"#);

    init_schema(&c).unwrap();

    assert_eq!(get_kv(&c, "dayState").unwrap().as_deref(), Some(day_state));
    assert_eq!(
        get_kv(&c, "program").unwrap().as_deref(),
        Some(r#"{"days":[]}"#)
    );
}

#[test]
fn migrated_db_accepts_new_style_rows_and_survives_a_second_init() {
    let c = v1_db();
    insert_v1_kv(&c, "theme", r#""light""#);
    init_schema(&c).unwrap();

    let new_row = LoggedSetRow {
        plan_item_id: Some("item-9".to_string()),
        set_type: "warmup".to_string(),
        ..set_row("new-1", "2025-06-01T10:00:00.000Z")
    };
    append_history(&c, &new_row).unwrap();
    set_kv(&c, "dayState", r#"{"date":"2025-06-01"}"#).unwrap();

    init_schema(&c).unwrap();

    assert_eq!(schema_version(&c).unwrap(), 2);
    assert_eq!(history_ids(&c), ["old-1", "new-1"]);
    assert_eq!(all_history(&c).unwrap()[1], new_row);
    // A v2 dayState must not be deleted by re-running init.
    assert_eq!(
        get_kv(&c, "dayState").unwrap().as_deref(),
        Some(r#"{"date":"2025-06-01"}"#)
    );
}

#[test]
fn a_failed_migration_leaves_the_v1_database_untouched_and_retryable() {
    let c = nabd_persistence::open_memory().unwrap();
    c.execute_batch(
        "CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
         CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE history (id TEXT PRIMARY KEY, ex_id TEXT, exercise TEXT, \"group\" TEXT,
            muscles TEXT, value REAL, weight REAL, ts TEXT, date TEXT, trigger TEXT);
         INSERT INTO app_meta VALUES ('version', '1');
         INSERT INTO kv VALUES ('theme', 'not json');",
    )
    .unwrap();

    assert!(nabd_persistence::init_schema(&c).is_err());
    assert_eq!(nabd_persistence::schema_version(&c).unwrap(), 1);

    c.execute("UPDATE kv SET value = '\"dark\"' WHERE key = 'theme'", [])
        .unwrap();
    nabd_persistence::init_schema(&c).unwrap();
    assert_eq!(
        nabd_persistence::schema_version(&c).unwrap(),
        nabd_persistence::SCHEMA_VERSION
    );
}
