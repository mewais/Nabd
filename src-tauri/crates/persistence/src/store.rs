//! The store: the singletons and the set history, over one connection.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::{LoggedSetRow, Result};

/// The singleton JSON blobs the app may store.
pub const KV_KEYS: [&str; 6] = [
    "program",
    "settings",
    "customExercises",
    "rotationState",
    "dayState",
    "dayLog",
];

/// The app's database: the singletons and the set history.
pub struct Store {
    pub(crate) conn: Connection,
}

impl Store {
    /// Open (creating or migrating as needed) the database file at `path`.
    pub fn open(path: &Path) -> Result<Self> {
        Self::over(Connection::open(path)?)
    }

    /// A fresh database that lives in memory.
    pub fn open_in_memory() -> Result<Self> {
        Self::over(Connection::open_in_memory()?)
    }

    fn over(conn: Connection) -> Result<Self> {
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    /// Run `work` in one transaction: everything it writes through this store
    /// is committed if it succeeds and rolled back if it fails.
    pub(crate) fn atomically<T>(&self, work: impl FnOnce() -> Result<T>) -> Result<T> {
        let transaction = self.conn.unchecked_transaction()?;
        let done = work()?;
        transaction.commit()?;
        Ok(done)
    }

    /// A singleton JSON blob exactly as it was stored.
    pub fn get_kv(&self, key: &str) -> Result<Option<String>> {
        let value = self
            .conn
            .query_row("SELECT value FROM kv WHERE key = ?1", params![key], |row| {
                row.get(0)
            })
            .optional()?;
        Ok(value)
    }

    /// A singleton as a JSON value; null when nothing is stored under `key`.
    pub fn get_json(&self, key: &str) -> Result<Value> {
        match self.get_kv(key)? {
            Some(json) => Ok(serde_json::from_str(&json)?),
            None => Ok(Value::Null),
        }
    }

    /// Upsert a singleton JSON blob.
    pub fn set_kv(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    /// Append one logged set to history.
    pub fn append_history(&self, row: &LoggedSetRow) -> Result<()> {
        row.insert_into(&self.conn)
    }

    /// Remove one logged set (no error if it does not exist).
    pub fn delete_history(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM history WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// All history rows, oldest first.
    pub fn all_history(&self) -> Result<Vec<LoggedSetRow>> {
        let mut statement = self.conn.prepare("SELECT * FROM history ORDER BY ts ASC")?;
        let mut rows = statement.query([])?;
        let mut history = Vec::new();
        while let Some(row) = rows.next()? {
            history.push(LoggedSetRow::from_row(row)?);
        }
        Ok(history)
    }

    /// Replace every singleton in `singletons` and, when given, the whole
    /// history — all or nothing.
    pub fn replace_all(
        &self,
        singletons: &[(&str, String)],
        history: Option<&[LoggedSetRow]>,
    ) -> Result<()> {
        self.atomically(|| {
            for (key, value) in singletons {
                self.set_kv(key, value)?;
            }
            if let Some(rows) = history {
                self.conn.execute("DELETE FROM history", [])?;
                for row in rows {
                    self.append_history(row)?;
                }
            }
            Ok(())
        })
    }
}
