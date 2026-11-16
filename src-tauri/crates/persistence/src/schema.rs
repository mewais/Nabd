//! The database schema and its migrations: a ladder of steps, each taking the
//! database from one version to the next. A fresh database climbs the whole
//! ladder, so it ends up exactly like a migrated one.

use rusqlite::{params, OptionalExtension};

use crate::logged_set::DEFAULT_SET_TYPE;
use crate::{Error, Result, Store};

/// Current database schema version.
pub const SCHEMA_VERSION: i64 = 3;

impl Store {
    /// The schema version the database is at (0 for one that was never
    /// initialised). A version that is not a number is an error, not "never
    /// initialised": the file is not something this build should start
    /// writing a schema into.
    pub fn schema_version(&self) -> Result<i64> {
        let has_meta: bool = self.conn.query_row(
            "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta')",
            [],
            |row| row.get(0),
        )?;
        if !has_meta {
            return Ok(0);
        }
        let version: Option<String> = self
            .conn
            .query_row(
                "SELECT value FROM app_meta WHERE key = 'version'",
                [],
                |row| row.get(0),
            )
            .optional()?;
        match version {
            Some(text) => text
                .parse()
                .map_err(|_| Error::UnreadableSchemaVersion(text)),
            None => Ok(0),
        }
    }

    /// Bring the schema up to [`SCHEMA_VERSION`]. A database written by a
    /// newer build is refused untouched: stamping it down would let this build
    /// misread, then overwrite, data whose shape it does not know.
    pub(crate) fn migrate(&self) -> Result<()> {
        let from = self.schema_version()?;
        if from > SCHEMA_VERSION {
            return Err(Error::NewerSchema {
                found: from,
                supported: SCHEMA_VERSION,
            });
        }
        if from == SCHEMA_VERSION {
            return Ok(());
        }
        // One transaction: a migration that fails half-way must leave the old schema intact.
        self.atomically(|| {
            if from < 1 {
                self.create_v1()?;
            }
            if from < 2 {
                self.upgrade_to_v2()?;
            }
            if from < 3 {
                self.upgrade_to_v3()?;
            }
            self.conn.execute(
                "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('version', ?1)",
                params![SCHEMA_VERSION.to_string()],
            )?;
            Ok(())
        })
    }

    fn create_v1(&self) -> Result<()> {
        self.conn.execute_batch(
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
             CREATE INDEX history_date_idx ON history(date);",
        )?;
        Ok(())
    }

    /// v2: sets know their plan item and set type, and the theme lives in
    /// `settings`. The `dayState` blob is kept as it is: the frontend tolerates
    /// its v1 shape, and it holds the floating-day position, which cannot be
    /// rebuilt from history.
    fn upgrade_to_v2(&self) -> Result<()> {
        self.conn.execute_batch(&format!(
            "ALTER TABLE history ADD COLUMN plan_item_id TEXT;
             ALTER TABLE history ADD COLUMN set_type TEXT NOT NULL DEFAULT '{DEFAULT_SET_TYPE}';"
        ))?;
        let theme = self.get_json("theme")?;
        if !theme.is_null() {
            let mut settings = self.get_json("settings")?;
            // Indexing a null value makes it an object.
            settings["theme"] = theme;
            self.set_kv("settings", &settings.to_string())?;
        }
        self.conn
            .execute("DELETE FROM kv WHERE key = 'theme'", [])?;
        Ok(())
    }

    /// v3: sets know the session they belong to (one visit to a program day,
    /// which an unfinished floating day stretches over several dates). Every
    /// set logged before belongs to the session of its own date.
    fn upgrade_to_v3(&self) -> Result<()> {
        self.conn.execute_batch(
            "ALTER TABLE history ADD COLUMN session TEXT NOT NULL DEFAULT '';
             UPDATE history SET session = COALESCE(date, '');",
        )?;
        Ok(())
    }
}
