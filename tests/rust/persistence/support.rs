//! Fixtures of the persistence suite: typed sets and database files.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};

use nabd_persistence::{LoggedSetRow, Store};
use rusqlite::Connection;

use crate::common::{ids, set_json};

/// A logged set with the given id and timestamp; everything else is fixed.
pub fn set_row(id: &str, ts: &str) -> LoggedSetRow {
    serde_json::from_value(set_json(id, ts)).unwrap()
}

/// The ids in the store's history, oldest first.
pub fn history_ids(store: &Store) -> Vec<String> {
    ids(store.all_history().unwrap())
}

/// A database file of this test's own, removed when the test ends.
pub struct TempDb(PathBuf);

impl TempDb {
    pub fn new() -> Self {
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

    /// A database exactly as schema v1 left it: `history` without
    /// `plan_item_id` / `set_type`, version '1', and one logged set.
    pub fn v1() -> Self {
        let db = Self::new();
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

    /// The file as plain SQLite, behind the store's back.
    pub fn raw(&self) -> Connection {
        Connection::open(&self.0).unwrap()
    }

    /// The file as the app opens it.
    pub fn store(&self) -> nabd_persistence::Result<Store> {
        Store::open(&self.0)
    }

    /// The schema version written in the file.
    pub fn stored_version(&self) -> String {
        self.raw()
            .query_row(
                "SELECT value FROM app_meta WHERE key = 'version'",
                [],
                |r| r.get(0),
            )
            .unwrap()
    }

    /// Store a singleton behind the store's back.
    pub fn insert_kv(&self, key: &str, value: &str) {
        self.raw()
            .execute("INSERT INTO kv (key, value) VALUES (?1, ?2)", [key, value])
            .unwrap();
    }
}

impl Drop for TempDb {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}
