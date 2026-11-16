//! The app's SQLite database as managed state.

use std::path::Path;
use std::sync::{Mutex, PoisonError};

use nabd_ipc::{DataCommands, IpcResult};

use crate::error::{AppError, AppResult};

const DB_FILE: &str = "nabd.sqlite";

pub struct Database(Mutex<DataCommands>);

impl Database {
    /// Open (creating or migrating as needed) the database in `data_dir`.
    pub fn open_in(data_dir: &Path) -> AppResult<Self> {
        std::fs::create_dir_all(data_dir).map_err(|source| AppError::DataDir {
            path: data_dir.to_path_buf(),
            source,
        })?;
        let path = data_dir.join(DB_FILE);
        match DataCommands::open(&path) {
            Ok(commands) => Ok(Self(Mutex::new(commands))),
            Err(source) => Err(AppError::Database { path, source }),
        }
    }

    /// Run a command against the database.
    pub fn with<T>(&self, command: impl FnOnce(&DataCommands) -> IpcResult<T>) -> AppResult<T> {
        // A command that panicked leaves the database itself sound (SQLite
        // rolls an open transaction back), so a poisoned lock is still usable.
        let commands = self.0.lock().unwrap_or_else(PoisonError::into_inner);
        Ok(command(&commands)?)
    }
}
