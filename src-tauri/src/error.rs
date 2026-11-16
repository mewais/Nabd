//! The one error type of the binary. Commands return it; Tauri hands its
//! message to the frontend, which shows it to the user.

use std::path::PathBuf;

use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error(transparent)]
    Command(#[from] nabd_ipc::IpcError),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error("could not show the notification: {0}")]
    Notification(#[from] tauri_plugin_notification::Error),
    #[error("could not change the login entry: {0}")]
    Autostart(#[from] tauri_plugin_autostart::Error),
    #[error("could not open the database at {}: {source}", path.display())]
    Database {
        path: PathBuf,
        source: nabd_ipc::IpcError,
    },
    #[error("could not create the data folder {}: {source}", path.display())]
    DataDir {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not start the clock thread: {0}")]
    Clock(#[source] std::io::Error),
    #[error("found no folder to export to")]
    NoExportDir,
    #[error("could not write {}: {source}", path.display())]
    ExportWrite {
        path: PathBuf,
        source: std::io::Error,
    },
}

pub type AppResult<T> = Result<T, AppError>;

/// Over IPC an error is its message.
impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}
