//! Fixtures shared by the crates' test suites.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

use nabd_persistence::{LoggedSetRow, Store};
use rusqlite::Connection;
use serde_json::{json, Value};

/// An empty in-memory database.
pub fn fresh_store() -> Store {
    Store::open_in_memory().unwrap()
}

/// A complete logged set as the frontend sends it: a planned working set of
/// push-ups with the given id and timestamp.
pub fn set_json(id: &str, ts: &str) -> Value {
    json!({
        "id": id,
        "exId": "push-up",
        "exercise": "Push-up",
        "group": "chest",
        "muscles": ["chest", "triceps"],
        "value": 12.0,
        "weight": null,
        "ts": ts,
        "date": &ts[..10],
        "trigger": "manual",
        "planItemId": "item-1",
        "setType": "working",
        "session": &ts[..10],
    })
}

/// The ids of history rows, in the order given.
pub fn ids(history: Vec<LoggedSetRow>) -> Vec<String> {
    history.into_iter().map(|row| row.id).collect()
}

/// A database file of this test's own, removed when the test ends: for the
/// tests that prepare or damage the file behind the store's back.
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

    pub fn path(&self) -> &Path {
        &self.0
    }

    /// The file as plain SQLite, behind the store's back.
    pub fn raw(&self) -> Connection {
        Connection::open(&self.0).unwrap()
    }

    /// Make the stored set `id` unreadable: SQLite will hold any value in any
    /// column, and a muscle list that is not JSON cannot be read back.
    pub fn damage_set(&self, id: &str) {
        self.raw()
            .execute(
                "UPDATE history SET muscles = 'not json' WHERE id = ?1",
                [id],
            )
            .unwrap();
    }
}

impl Drop for TempDb {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}
