//! Error type for the persistence layer.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error(
        "this database was written by a newer version of Nabd \
         (schema {found}; this build understands up to {supported}) — update the app to open it"
    )]
    NewerSchema { found: i64, supported: i64 },
    #[error("the database has an unreadable schema version: {0:?}")]
    UnreadableSchemaVersion(String),
}

pub type Result<T> = std::result::Result<T, Error>;
