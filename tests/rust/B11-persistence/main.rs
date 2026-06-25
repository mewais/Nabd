/// B11-persistence integration tests.
///
/// RED/GREEN strategy:
/// - Behavior tests call the real function and assert_eq! on the CORRECT expected
///   value. Against the current skeleton the body is `unimplemented!()`, so the
///   call panics and the test FAILS (RED). After the code agent implements the
///   function the same test will PASS (GREEN).
/// - There are ZERO #[should_panic] annotations in this file.
/// - error.rs tests (Section 2) call fully-implemented infra; they are GREEN now.
///
/// Thread safety of the auto-extension test:
/// - `open_memory_error_branch_via_auto_extension` registers a failing SQLite
///   auto-extension (process-global) to cover the `?` error branch in
///   `open_memory`. To prevent other tests from calling `open_memory()` /
///   `open_at()` during that window we use a global `RwLock`: all
///   connection-opening tests acquire a SHARED read lock; the auto-extension
///   test acquires the EXCLUSIVE write lock. `conn()` is the shared-lock helper
///   used by every test that needs a `Connection`.

use std::sync::RwLock;

use nabd_persistence::{
    all_history, append_history, clear_history, delete_kv, get_kv, history_between, init_schema,
    open_at, open_memory, replace_history, schema_version, set_kv, Error, KV_KEYS,
    SCHEMA_VERSION, LoggedSetRow,
};

/// Process-global RwLock used to serialize the auto-extension test against all
/// tests that open connections.  Only `open_memory_error_branch_via_auto_extension`
/// acquires the write lock; every other test that opens a connection acquires a
/// shared read lock via `conn()`.
static CONN_LOCK: RwLock<()> = RwLock::new(());

/// Helper: acquire the shared (read) lock then call `open_memory()`.
/// Returns the lock guard + the connection; the guard must live until the
/// connection is dropped to maintain the RwLock invariant.
fn conn() -> (std::sync::RwLockReadGuard<'static, ()>, rusqlite::Connection) {
    let guard = CONN_LOCK.read().unwrap();
    let c = open_memory().expect("open_memory should succeed");
    (guard, c)
}

// ─── helpers ───────────────────────────────────────────────────────────────

fn make_row(id: &str, ts: &str, date: &str) -> LoggedSetRow {
    LoggedSetRow {
        id: id.to_string(),
        ex_id: "ex1".to_string(),
        exercise: "Squat".to_string(),
        group: "legs".to_string(),
        muscles: vec!["quads".to_string(), "glutes".to_string()],
        value: 10.0,
        weight: Some(100.0),
        ts: ts.to_string(),
        date: date.to_string(),
        trigger: "manual".to_string(),
    }
}

fn make_row_no_weight(id: &str, ts: &str, date: &str) -> LoggedSetRow {
    LoggedSetRow {
        id: id.to_string(),
        ex_id: "ex2".to_string(),
        exercise: "Pull-up".to_string(),
        group: "back".to_string(),
        muscles: vec!["lats".to_string()],
        value: 8.0,
        weight: None,
        ts: ts.to_string(),
        date: date.to_string(),
        trigger: "idle".to_string(),
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 1 — Fully implemented functions (GREEN)
// ═══════════════════════════════════════════════════════════════════════════

// ─── open_memory (success path) ────────────────────────────────────────────

#[test]
fn open_memory_returns_connection() {
    let (_g, c) = conn();
    let n: i64 = c
        .query_row("SELECT 42", [], |r| r.get(0))
        .expect("trivial query on in-memory db");
    assert_eq!(n, 42);
}

// ─── open_memory error branch — covered via auto-extension (GREEN) ──────────

/// Registers a failing SQLite auto-extension so that `open_memory()` returns
/// `Err`, covering the `?` error region on lib.rs line 53.
/// Acquires the exclusive write lock so no other test can open a connection
/// while the bad extension is registered.
#[test]
fn open_memory_error_branch_via_auto_extension() {
    use rusqlite::auto_extension::{init_auto_extension, register_auto_extension, reset_auto_extension};
    use rusqlite::{ffi, Connection as RConn, Error as RErr, Result as RRes};
    use std::os::raw::{c_char, c_int};

    fn always_fail(_: RConn) -> RRes<()> {
        Err(RErr::SqliteFailure(
            ffi::Error::new(ffi::SQLITE_CORRUPT),
            Some("forced failure for coverage".to_owned()),
        ))
    }

    unsafe extern "C" fn raw_always_fail(
        db: *mut ffi::sqlite3,
        pz_err_msg: *mut *mut c_char,
        _: *const ffi::sqlite3_api_routines,
    ) -> c_int {
        init_auto_extension(db, pz_err_msg, always_fail)
    }

    // Exclusive lock: blocks all other tests from opening connections.
    let _write_guard = CONN_LOCK.write().unwrap();

    unsafe {
        register_auto_extension(raw_always_fail)
            .expect("register_auto_extension must succeed");
    }

    let result = open_memory();
    // Always deregister before any assert.
    reset_auto_extension();
    // Write guard is still held until the end of the function, ensuring
    // no other test sneaks a connection open before we're done.

    assert!(result.is_err(), "open_memory should fail with the bad extension");
    assert!(
        matches!(result.unwrap_err(), Error::Sqlite(_)),
        "error must be Error::Sqlite"
    );
}

// ─── open_at ───────────────────────────────────────────────────────────────

#[test]
fn open_at_creates_file() {
    let _g = CONN_LOCK.read().unwrap();
    let dir = std::env::temp_dir();
    let path = dir.join("nabd_test_open_at.db");
    let _ = std::fs::remove_file(&path);
    let c = open_at(path.to_str().unwrap()).expect("open_at should succeed");
    drop(c);
    assert!(path.exists(), "db file should be created");
    let _ = std::fs::remove_file(&path);
}

/// open_at with an invalid path (embedded null byte) → Error::Sqlite.
/// Covers the `?` error branch on lib.rs line 58.
#[test]
fn open_at_invalid_path_returns_error() {
    let _g = CONN_LOCK.read().unwrap();
    let result = open_at("/tmp/nabd\x00invalid.db");
    assert!(result.is_err(), "open_at with null-byte path should error");
    assert!(
        matches!(result.unwrap_err(), Error::Sqlite(_)),
        "error should be Error::Sqlite"
    );
}

// ─── KV_KEYS constant ──────────────────────────────────────────────────────

#[test]
fn kv_keys_has_six_entries() {
    assert_eq!(KV_KEYS.len(), 6, "KV_KEYS must have exactly 6 entries");
}

#[test]
fn kv_keys_contains_expected_keys() {
    let expected = [
        "program",
        "settings",
        "theme",
        "customExercises",
        "rotationState",
        "dayState",
    ];
    for key in &expected {
        assert!(KV_KEYS.contains(key), "KV_KEYS missing: {key}");
    }
}

// ─── SCHEMA_VERSION constant ───────────────────────────────────────────────

#[test]
fn schema_version_constant_is_one() {
    assert_eq!(SCHEMA_VERSION, 1i64);
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 2 — error.rs coverage (GREEN — error.rs is fully implemented)
// ═══════════════════════════════════════════════════════════════════════════

/// Trigger a real rusqlite::Error → Error::Sqlite, exercise Display.
#[test]
fn error_sqlite_display() {
    let (_g, c) = conn();
    let rusqlite_err: rusqlite::Error = c
        .execute("THIS IS NOT VALID SQL", [])
        .unwrap_err();
    let e = Error::from(rusqlite_err);
    let msg = format!("{e}");
    assert!(
        msg.starts_with("sqlite error:"),
        "Display prefix wrong, got: {msg}"
    );
}

/// Trigger a real serde_json::Error → Error::Json, exercise Display.
#[test]
fn error_json_display() {
    let json_err: serde_json::Error =
        serde_json::from_str::<serde_json::Value>("not json {{{{").unwrap_err();
    let e = Error::from(json_err);
    let msg = format!("{e}");
    assert!(
        msg.starts_with("json error:"),
        "Display prefix wrong, got: {msg}"
    );
}

/// Error::Sqlite — Debug impl reachable.
#[test]
fn error_sqlite_debug() {
    let (_g, c) = conn();
    let rusqlite_err: rusqlite::Error = c
        .execute("SELECT * FROM nonexistent_table_xyz", [])
        .unwrap_err();
    let e = Error::from(rusqlite_err);
    assert!(!format!("{e:?}").is_empty());
}

/// Error::Json — Debug impl reachable.
#[test]
fn error_json_debug() {
    let json_err: serde_json::Error =
        serde_json::from_str::<serde_json::Value>("{bad}").unwrap_err();
    let e = Error::from(json_err);
    assert!(!format!("{e:?}").is_empty());
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 3 — Schema behavior tests (RED — call unimplemented!() bodies)
//
// Each test asserts CORRECT expected behavior. The test is RED now because
// the function body is `unimplemented!()` (panics). After implementation it
// will be GREEN. No #[should_panic] anywhere.
// ═══════════════════════════════════════════════════════════════════════════

// ── Schema ──────────────────────────────────────────────────────────────────

/// schema_version on a fresh connection returns 0 before init_schema.
#[test]
fn schema_version_before_init_is_zero() {
    let (_g, c) = conn();
    let v = schema_version(&c).unwrap();
    assert_eq!(v, 0);
}

/// init_schema idempotent: two calls succeed.
#[test]
fn init_schema_idempotent() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    init_schema(&c).unwrap();
}

/// schema_version returns SCHEMA_VERSION after init.
#[test]
fn schema_version_after_init_equals_constant() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    assert_eq!(schema_version(&c).unwrap(), SCHEMA_VERSION);
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 4 — KV behavior tests (RED — call unimplemented!() bodies)
// ═══════════════════════════════════════════════════════════════════════════

/// set_kv then get_kv returns stored value.
#[test]
fn set_then_get_kv_returns_value() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    set_kv(&c, "settings", r#"{"theme":"dark"}"#).unwrap();
    let val = get_kv(&c, "settings").unwrap();
    assert_eq!(val, Some(r#"{"theme":"dark"}"#.to_string()));
}

/// get_kv on missing key returns None.
#[test]
fn get_kv_missing_returns_none() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    assert_eq!(get_kv(&c, "program").unwrap(), None);
}

/// set_kv twice updates (upsert).
#[test]
fn set_kv_twice_updates() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    set_kv(&c, "theme", r#"{"color":"red"}"#).unwrap();
    set_kv(&c, "theme", r#"{"color":"blue"}"#).unwrap();
    assert_eq!(
        get_kv(&c, "theme").unwrap(),
        Some(r#"{"color":"blue"}"#.to_string())
    );
}

/// delete_kv removes the key; subsequent get returns None.
#[test]
fn delete_kv_removes_key() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    set_kv(&c, "dayState", "{}").unwrap();
    delete_kv(&c, "dayState").unwrap();
    assert_eq!(get_kv(&c, "dayState").unwrap(), None);
}

/// delete_kv on absent key is a no-op (Ok).
#[test]
fn delete_kv_absent_key_ok() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    delete_kv(&c, "rotationState").unwrap();
}

/// Round-trip all canonical KV keys.
#[test]
fn kv_roundtrip_all_canonical_keys() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    for key in &KV_KEYS {
        let val = format!("{{\"k\":\"{key}\"}}");
        set_kv(&c, key, &val).unwrap();
        assert_eq!(get_kv(&c, key).unwrap(), Some(val), "key={key}");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 5 — History behavior tests (RED — call unimplemented!() bodies)
// ═══════════════════════════════════════════════════════════════════════════

// ── History round-trips ──────────────────────────────────────────────────────

/// append + all_history round-trip, with weight.
#[test]
fn append_then_all_history_with_weight() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    let row = make_row("id-001", "2024-01-15T10:00:00Z", "2024-01-15");
    append_history(&c, &row).unwrap();
    let rows = all_history(&c).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0], row);
}

/// append + all_history round-trip, null weight.
#[test]
fn append_then_all_history_null_weight() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    let row = make_row_no_weight("id-002", "2024-02-20T08:30:00Z", "2024-02-20");
    append_history(&c, &row).unwrap();
    let rows = all_history(&c).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0], row);
    assert_eq!(rows[0].weight, None);
}

/// muscles vec survives round-trip (JSON serialised in DB).
#[test]
fn append_history_muscles_roundtrip() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    let mut row = make_row("id-muscles", "2024-03-01T12:00:00Z", "2024-03-01");
    row.muscles = vec![
        "quadriceps".to_string(),
        "hamstrings".to_string(),
        "glutes".to_string(),
    ];
    append_history(&c, &row).unwrap();
    let rows = all_history(&c).unwrap();
    assert_eq!(rows[0].muscles, row.muscles);
}

/// all_history ordered by ts ASC across multiple rows.
#[test]
fn all_history_ordered_by_ts_asc() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    let r1 = make_row("id-a", "2024-01-01T07:00:00Z", "2024-01-01");
    let r2 = make_row("id-b", "2024-01-01T09:00:00Z", "2024-01-01");
    let r3 = make_row("id-c", "2024-01-02T06:00:00Z", "2024-01-02");
    append_history(&c, &r3).unwrap();
    append_history(&c, &r1).unwrap();
    append_history(&c, &r2).unwrap();
    let rows = all_history(&c).unwrap();
    assert_eq!(rows.len(), 3);
    assert_eq!(rows[0].id, "id-a");
    assert_eq!(rows[1].id, "id-b");
    assert_eq!(rows[2].id, "id-c");
}

// ── history_between ─────────────────────────────────────────────────────────

/// Row on from_date is included (inclusive lower bound).
#[test]
fn history_between_inclusive_lower_bound() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("hb-1", "2024-06-01T00:00:00Z", "2024-06-01")).unwrap();
    append_history(&c, &make_row("hb-2", "2024-06-15T12:00:00Z", "2024-06-15")).unwrap();
    append_history(&c, &make_row("hb-3", "2024-06-30T23:59:59Z", "2024-06-30")).unwrap();
    let rows = history_between(&c, "2024-06-01", "2024-06-20").unwrap();
    assert_eq!(rows.len(), 2);
    assert!(rows.iter().any(|r| r.id == "hb-1"));
    assert!(rows.iter().any(|r| r.id == "hb-2"));
}

/// Row on to_date is included (inclusive upper bound).
#[test]
fn history_between_inclusive_upper_bound() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("ub-1", "2024-06-10T00:00:00Z", "2024-06-10")).unwrap();
    append_history(&c, &make_row("ub-2", "2024-06-20T12:00:00Z", "2024-06-20")).unwrap();
    append_history(&c, &make_row("ub-3", "2024-06-21T00:00:00Z", "2024-06-21")).unwrap();
    let rows = history_between(&c, "2024-06-10", "2024-06-20").unwrap();
    assert_eq!(rows.len(), 2);
    assert!(rows.iter().any(|r| r.id == "ub-1"));
    assert!(rows.iter().any(|r| r.id == "ub-2"));
    assert!(!rows.iter().any(|r| r.id == "ub-3"));
}

/// Rows outside the range are excluded.
#[test]
fn history_between_excludes_outside_rows() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("out-before", "2024-05-31T23:59:59Z", "2024-05-31")).unwrap();
    append_history(&c, &make_row("in-range", "2024-06-15T12:00:00Z", "2024-06-15")).unwrap();
    append_history(&c, &make_row("out-after", "2024-07-01T00:00:00Z", "2024-07-01")).unwrap();
    let rows = history_between(&c, "2024-06-01", "2024-06-30").unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].id, "in-range");
}

/// history_between returns rows ordered by ts ASC.
#[test]
fn history_between_ordered_by_ts_asc() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("hb-late", "2024-07-15T20:00:00Z", "2024-07-15")).unwrap();
    append_history(&c, &make_row("hb-early", "2024-07-15T06:00:00Z", "2024-07-15")).unwrap();
    let rows = history_between(&c, "2024-07-15", "2024-07-15").unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].id, "hb-early");
    assert_eq!(rows[1].id, "hb-late");
}

/// history_between returns empty vec when no rows match.
#[test]
fn history_between_empty_when_no_match() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("hb-x", "2024-01-01T00:00:00Z", "2024-01-01")).unwrap();
    let rows = history_between(&c, "2024-12-01", "2024-12-31").unwrap();
    assert_eq!(rows.len(), 0);
}

// ── clear_history ───────────────────────────────────────────────────────────

/// clear_history removes all rows.
#[test]
fn clear_history_empties_table() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("clr-1", "2024-01-01T00:00:00Z", "2024-01-01")).unwrap();
    append_history(&c, &make_row("clr-2", "2024-01-02T00:00:00Z", "2024-01-02")).unwrap();
    clear_history(&c).unwrap();
    assert_eq!(all_history(&c).unwrap().len(), 0);
}

/// clear_history on empty table is a no-op (Ok).
#[test]
fn clear_history_on_empty_table_ok() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    clear_history(&c).unwrap();
}

// ── replace_history ─────────────────────────────────────────────────────────

/// replace_history: pre-existing rows gone, new rows present.
#[test]
fn replace_history_replaces_all_rows() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("old-1", "2024-01-01T00:00:00Z", "2024-01-01")).unwrap();
    append_history(&c, &make_row("old-2", "2024-01-02T00:00:00Z", "2024-01-02")).unwrap();
    let new_rows = vec![
        make_row("new-1", "2024-06-01T10:00:00Z", "2024-06-01"),
        make_row("new-2", "2024-06-02T10:00:00Z", "2024-06-02"),
    ];
    replace_history(&c, &new_rows).unwrap();
    let rows = all_history(&c).unwrap();
    assert_eq!(rows.len(), 2);
    assert!(rows.iter().any(|r| r.id == "new-1"));
    assert!(rows.iter().any(|r| r.id == "new-2"));
    assert!(!rows.iter().any(|r| r.id == "old-1"));
    assert!(!rows.iter().any(|r| r.id == "old-2"));
}

/// replace_history with empty slice clears everything.
#[test]
fn replace_history_with_empty_clears() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(&c, &make_row("pre-1", "2024-01-01T00:00:00Z", "2024-01-01")).unwrap();
    replace_history(&c, &[]).unwrap();
    assert_eq!(all_history(&c).unwrap().len(), 0);
}

/// replace_history is atomic: a duplicate-id within the replacement set causes
/// an error; the original data must survive intact.
#[test]
fn replace_history_is_atomic() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    append_history(
        &c,
        &make_row("orig", "2024-01-01T00:00:00Z", "2024-01-01"),
    )
    .unwrap();
    let dup_rows = vec![
        make_row("dup-a", "2024-06-01T00:00:00Z", "2024-06-01"),
        make_row("dup-a", "2024-06-02T00:00:00Z", "2024-06-02"),
    ];
    let result = replace_history(&c, &dup_rows);
    assert!(result.is_err(), "duplicate ids should cause an error");
    let rows = all_history(&c).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].id, "orig");
}

// ── Error surface ────────────────────────────────────────────────────────────

/// Error::Sqlite surface: inserting a duplicate primary key.
#[test]
fn append_history_duplicate_id_returns_sqlite_error() {
    let (_g, c) = conn();
    init_schema(&c).unwrap();
    let row = make_row("dup-id", "2024-01-01T00:00:00Z", "2024-01-01");
    append_history(&c, &row).unwrap();
    let result = append_history(&c, &row);
    assert!(
        matches!(result, Err(Error::Sqlite(_))),
        "duplicate PK must surface as Error::Sqlite"
    );
}
