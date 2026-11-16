//! B11 · nabd-persistence — the SQLite store.
//!
//! Singletons (program, settings, …) are opaque JSON blobs in a key-value
//! table: the TypeScript domain layer owns their structure. Logged sets live in
//! a queryable `history` table. Every function takes a `&Connection`, so the
//! whole crate runs against an in-memory database in tests.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

pub mod error;
pub use error::{Error, Result};

/// Current database schema version.
pub const SCHEMA_VERSION: i64 = 2;

/// The singleton JSON blobs the app may store.
pub const KV_KEYS: [&str; 6] = [
    "program",
    "settings",
    "customExercises",
    "rotationState",
    "dayState",
    "dayLog",
];

const HISTORY_COLUMNS: &str =
    "id, ex_id, exercise, \"group\", muscles, value, weight, ts, date, trigger, plan_item_id, set_type";

fn default_set_type() -> String {
    "working".to_string()
}

/// One logged set. JSON is camelCase to match the TypeScript `LoggedSet`.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
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
    /// The plan item this set counts toward, if any.
    #[serde(default)]
    pub plan_item_id: Option<String>,
    /// "warmup" | "working" | "drop".
    #[serde(default = "default_set_type")]
    pub set_type: String,
}

pub fn open_memory() -> Result<Connection> {
    Ok(Connection::open_in_memory()?)
}

/// Open (creating if needed) a database file at `path`.
pub fn open_at(path: &Path) -> Result<Connection> {
    Ok(Connection::open(path)?)
}

/// Create the schema, or migrate an older database up to [`SCHEMA_VERSION`].
/// Idempotent. A database written by a newer build is refused untouched:
/// stamping it down would let this build misread, then overwrite, data whose
/// shape it does not know.
pub fn init_schema(c: &Connection) -> Result<()> {
    let from = schema_version(c)?;
    if from > SCHEMA_VERSION {
        return Err(Error::NewerSchema {
            found: from,
            supported: SCHEMA_VERSION,
        });
    }
    // One transaction: a migration that fails half-way must leave the old schema intact.
    let tx = c.unchecked_transaction()?;
    tx.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
         CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS history (
            id           TEXT PRIMARY KEY,
            ex_id        TEXT,
            exercise     TEXT,
            \"group\"      TEXT,
            muscles      TEXT,
            value        REAL,
            weight       REAL,
            ts           TEXT,
            date         TEXT,
            trigger      TEXT,
            plan_item_id TEXT,
            set_type     TEXT NOT NULL DEFAULT 'working'
         );
         CREATE INDEX IF NOT EXISTS history_date_idx ON history(date);",
    )?;
    if from == 1 {
        migrate_v1_to_v2(&tx)?;
    }
    tx.execute(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('version', ?1)",
        params![SCHEMA_VERSION.to_string()],
    )?;
    tx.commit()?;
    Ok(())
}

/// v2: sets know their plan item and set type, and the theme lives in
/// `settings`. The `dayState` blob is kept as it is: the frontend tolerates
/// its old shape, and it holds the floating-day position, which cannot be
/// rebuilt from history.
fn migrate_v1_to_v2(c: &Connection) -> Result<()> {
    c.execute_batch(
        "ALTER TABLE history ADD COLUMN plan_item_id TEXT;
         ALTER TABLE history ADD COLUMN set_type TEXT NOT NULL DEFAULT 'working';",
    )?;
    if let Some(theme) = get_kv(c, "theme")? {
        let mut settings: serde_json::Value = match get_kv(c, "settings")? {
            Some(json) => serde_json::from_str(&json)?,
            None => serde_json::json!({}),
        };
        settings["theme"] = serde_json::from_str(&theme)?;
        set_kv(c, "settings", &settings.to_string())?;
        c.execute("DELETE FROM kv WHERE key = 'theme'", [])?;
    }
    Ok(())
}

/// The stored schema version (0 for a database that was never initialised).
/// A version that is not a number is an error, not "never initialised": the
/// file is not something this build should start writing a schema into.
pub fn schema_version(c: &Connection) -> Result<i64> {
    let has_meta: bool = c.query_row(
        "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta')",
        [],
        |r| r.get(0),
    )?;
    if !has_meta {
        return Ok(0);
    }
    let version: Option<String> = c
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'version'",
            [],
            |r| r.get(0),
        )
        .optional()?;
    match version {
        Some(text) => text
            .parse()
            .map_err(|_| Error::UnreadableSchemaVersion(text)),
        None => Ok(0),
    }
}

/// Get a singleton JSON blob by key.
pub fn get_kv(c: &Connection, key: &str) -> Result<Option<String>> {
    Ok(
        c.query_row("SELECT value FROM kv WHERE key = ?1", params![key], |r| {
            r.get(0)
        })
        .optional()?,
    )
}

/// Upsert a singleton JSON blob.
pub fn set_kv(c: &Connection, key: &str, value: &str) -> Result<()> {
    c.execute(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

/// Append one logged set to history.
pub fn append_history(c: &Connection, row: &LoggedSetRow) -> Result<()> {
    c.execute(
        &format!(
            "INSERT INTO history ({HISTORY_COLUMNS})
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
        ),
        params![
            row.id,
            row.ex_id,
            row.exercise,
            row.group,
            serde_json::to_string(&row.muscles)?,
            row.value,
            row.weight,
            row.ts,
            row.date,
            row.trigger,
            row.plan_item_id,
            row.set_type,
        ],
    )?;
    Ok(())
}

/// Remove one logged set (no error if it does not exist).
pub fn delete_history(c: &Connection, id: &str) -> Result<()> {
    c.execute("DELETE FROM history WHERE id = ?1", params![id])?;
    Ok(())
}

/// All history rows, oldest first.
pub fn all_history(c: &Connection) -> Result<Vec<LoggedSetRow>> {
    let mut stmt = c.prepare(&format!(
        "SELECT {HISTORY_COLUMNS} FROM history ORDER BY ts ASC"
    ))?;
    let mut rows = stmt.query([])?;
    let mut result = Vec::new();
    while let Some(r) = rows.next()? {
        let muscles: String = r.get(4)?;
        result.push(LoggedSetRow {
            id: r.get(0)?,
            ex_id: r.get(1)?,
            exercise: r.get(2)?,
            group: r.get(3)?,
            muscles: serde_json::from_str(&muscles)?,
            value: r.get(5)?,
            weight: r.get(6)?,
            ts: r.get(7)?,
            date: r.get(8)?,
            trigger: r.get(9)?,
            plan_item_id: r.get(10)?,
            set_type: r.get(11)?,
        });
    }
    Ok(result)
}

/// Replace every singleton in `singletons` and, when given, the whole history —
/// all or nothing (used by import).
pub fn replace_all(
    c: &Connection,
    singletons: &[(&str, String)],
    history: Option<&[LoggedSetRow]>,
) -> Result<()> {
    let tx = c.unchecked_transaction()?;
    for (key, value) in singletons {
        set_kv(&tx, key, value)?;
    }
    if let Some(rows) = history {
        tx.execute("DELETE FROM history", [])?;
        for row in rows {
            append_history(&tx, row)?;
        }
    }
    tx.commit()?;
    Ok(())
}
