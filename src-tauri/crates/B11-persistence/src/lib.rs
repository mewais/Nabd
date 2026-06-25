//! B11 · nabd-persistence — SQLite store.
//!
//! Singletons (program, settings, theme, customExercises, rotationState,
//! dayState) are stored as opaque JSON strings in a key-value table — the TS
//! domain layer owns their structure. Logged sets live in a queryable `history`
//! table. All functions take a `&Connection` so they are testable against an
//! in-memory database.
//!
//! SKELETON: signatures are frozen; bodies `unimplemented!()` except the trivial
//! connection openers (tests need a real Connection to call the rest).

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

pub mod error;
pub use error::{Error, Result};

/// Current database schema version.
pub const SCHEMA_VERSION: i64 = 1;

/// Canonical KV keys for singleton JSON blobs.
pub const KV_KEYS: [&str; 6] = [
    "program",
    "settings",
    "theme",
    "customExercises",
    "rotationState",
    "dayState",
];

/// One persisted logged set (a row of history).
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct LoggedSetRow {
    pub id: String,
    pub ex_id: String,
    pub exercise: String,
    pub group: String,
    pub muscles: Vec<String>,
    /// Reps, or seconds for time-based exercises.
    pub value: f64,
    /// kg, or null for unweighted.
    pub weight: Option<f64>,
    /// ISO 8601 timestamp.
    pub ts: String,
    /// Local date key YYYY-MM-DD.
    pub date: String,
    /// "idle" | "timer" | "manual".
    pub trigger: String,
}

/// Open an in-memory database (tests + ephemeral use). REAL in the skeleton.
pub fn open_memory() -> Result<Connection> {
    Ok(Connection::open_in_memory()?)
}

/// Open (creating if needed) a database file at `path`. REAL in the skeleton.
pub fn open_at(path: &str) -> Result<Connection> {
    Ok(Connection::open(path)?)
}

/// Create tables and stamp the schema version (idempotent).
pub fn init_schema(c: &Connection) -> Result<()> {
    c.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS kv (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id       TEXT PRIMARY KEY,
            ex_id    TEXT,
            exercise TEXT,
            \"group\" TEXT,
            muscles  TEXT,
            value    REAL,
            weight   REAL,
            ts       TEXT,
            date     TEXT,
            trigger  TEXT
        );
        CREATE INDEX IF NOT EXISTS history_date_idx ON history(date);",
    )
    .expect("init_schema DDL is valid SQL on a fresh connection");
    c.execute(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('version', ?1)",
        rusqlite::params![SCHEMA_VERSION.to_string()],
    )
    .expect("upsert version into app_meta cannot fail");
    Ok(())
}

/// Read the stored schema version (0 if uninitialized).
pub fn schema_version(c: &Connection) -> Result<i64> {
    // Query app_meta directly; any error (table missing or no version row) → 0.
    let res: rusqlite::Result<String> = c.query_row(
        "SELECT value FROM app_meta WHERE key = 'version'",
        [],
        |r| r.get(0),
    );
    match res {
        Ok(v) => Ok(v.parse().unwrap_or(0)),
        Err(_) => Ok(0),
    }
}

/// Get a singleton JSON blob by key.
pub fn get_kv(c: &Connection, key: &str) -> Result<Option<String>> {
    let res: rusqlite::Result<String> = c.query_row(
        "SELECT value FROM kv WHERE key = ?1",
        rusqlite::params![key],
        |r| r.get(0),
    );
    match res {
        Ok(v) => Ok(Some(v)),
        Err(_) => Ok(None),
    }
}

/// Upsert a singleton JSON blob.
pub fn set_kv(c: &Connection, key: &str, value: &str) -> Result<()> {
    c.execute(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .expect("INSERT OR REPLACE on kv cannot fail for valid key/value");
    Ok(())
}

/// Delete a singleton key (no error if absent).
pub fn delete_kv(c: &Connection, key: &str) -> Result<()> {
    c.execute("DELETE FROM kv WHERE key = ?1", rusqlite::params![key])
        .expect("DELETE on kv cannot fail");
    Ok(())
}

/// Append one logged set to history.
pub fn append_history(c: &Connection, row: &LoggedSetRow) -> Result<()> {
    let muscles_json = serde_json::to_string(&row.muscles)
        .expect("Vec<String> serialisation is infallible");
    c.execute(
        "INSERT INTO history (id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            row.id,
            row.ex_id,
            row.exercise,
            row.group,
            muscles_json,
            row.value,
            row.weight,
            row.ts,
            row.date,
            row.trigger,
        ],
    )?;
    Ok(())
}

/// Collect history rows from a prepared statement and params.
fn collect_rows(
    mut stmt: rusqlite::Statement<'_>,
    params: impl rusqlite::Params,
) -> Result<Vec<LoggedSetRow>> {
    let mut rows = stmt
        .query(params)
        .expect("query on valid prepared statement cannot fail");
    let mut result = Vec::new();
    loop {
        let r = rows
            .next()
            .expect("iterating query results cannot fail");
        let Some(r) = r else { break };
        let muscles_json: String = r
            .get(4)
            .expect("muscles column is always TEXT");
        let muscles: Vec<String> = serde_json::from_str(&muscles_json)
            .expect("muscles JSON stored by us is always valid");
        result.push(LoggedSetRow {
            id: r.get(0).expect("id column is TEXT"),
            ex_id: r.get(1).expect("ex_id column is TEXT"),
            exercise: r.get(2).expect("exercise column is TEXT"),
            group: r.get(3).expect("group column is TEXT"),
            muscles,
            value: r.get(5).expect("value column is REAL"),
            weight: r.get(6).expect("weight column is REAL or NULL"),
            ts: r.get(7).expect("ts column is TEXT"),
            date: r.get(8).expect("date column is TEXT"),
            trigger: r.get(9).expect("trigger column is TEXT"),
        });
    }
    Ok(result)
}

/// All history rows, ordered by timestamp ascending.
pub fn all_history(c: &Connection) -> Result<Vec<LoggedSetRow>> {
    let stmt = c
        .prepare(
            "SELECT id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger
         FROM history ORDER BY ts ASC",
        )
        .expect("prepare all_history SQL cannot fail");
    collect_rows(stmt, [])
}

/// History rows with `date` in [from_date, to_date] inclusive, ts ascending.
pub fn history_between(c: &Connection, from_date: &str, to_date: &str) -> Result<Vec<LoggedSetRow>> {
    let stmt = c
        .prepare(
            "SELECT id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger
         FROM history WHERE date >= ?1 AND date <= ?2 ORDER BY ts ASC",
        )
        .expect("prepare history_between SQL cannot fail");
    collect_rows(stmt, rusqlite::params![from_date, to_date])
}

/// Remove all history rows.
pub fn clear_history(c: &Connection) -> Result<()> {
    c.execute("DELETE FROM history", [])
        .expect("DELETE FROM history cannot fail");
    Ok(())
}

/// Replace the entire history with `rows` (used by import). Transactional.
pub fn replace_history(c: &Connection, rows: &[LoggedSetRow]) -> Result<()> {
    let tx = c
        .unchecked_transaction()
        .expect("begin transaction cannot fail");
    tx.execute("DELETE FROM history", [])
        .expect("DELETE FROM history in transaction cannot fail");
    for row in rows {
        let muscles_json = serde_json::to_string(&row.muscles)
            .expect("Vec<String> serialisation is infallible");
        tx.execute(
            "INSERT INTO history (id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                row.id,
                row.ex_id,
                row.exercise,
                row.group,
                muscles_json,
                row.value,
                row.weight,
                row.ts,
                row.date,
                row.trigger,
            ],
        )?;
    }
    tx.commit().expect("commit cannot fail");
    Ok(())
}
