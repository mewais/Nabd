//! The app's SQLite database as managed state.

use std::path::Path;
use std::sync::{Mutex, PoisonError};

use nabd_ipc::IpcResult;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

const DB_FILE: &str = "nabd.sqlite";

pub struct Database(Mutex<Connection>);

impl Database {
    /// Open (creating or migrating as needed) the database in `data_dir`.
    pub fn open_in(data_dir: &Path) -> AppResult<Self> {
        std::fs::create_dir_all(data_dir).map_err(|source| AppError::DataDir {
            path: data_dir.to_path_buf(),
            source,
        })?;
        let path = data_dir.join(DB_FILE);
        Self::open(&path).map_err(|source| AppError::Database { path, source })
    }

    fn open(path: &Path) -> IpcResult<Self> {
        let connection = nabd_persistence::open_at(path)?;
        nabd_ipc::init(&connection)?;
        Ok(Self(Mutex::new(connection)))
    }

    /// Run a command-core handler against the connection.
    pub fn with<T>(&self, handler: impl FnOnce(&Connection) -> IpcResult<T>) -> AppResult<T> {
        // A handler that panicked leaves the connection itself sound (SQLite
        // rolls an open transaction back), so a poisoned lock is still usable.
        let connection = self.0.lock().unwrap_or_else(PoisonError::into_inner);
        Ok(handler(&connection)?)
    }
}
