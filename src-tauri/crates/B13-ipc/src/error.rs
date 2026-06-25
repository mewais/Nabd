//! IPC error type — maps to a code the frontend can branch on.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum IpcError {
    #[error("unknown singleton key: {0}")]
    BadKey(String),
    #[error("invalid json: {0}")]
    BadJson(String),
    #[error("storage error: {0}")]
    Storage(String),
}

impl From<nabd_persistence::Error> for IpcError {
    fn from(e: nabd_persistence::Error) -> Self {
        IpcError::Storage(e.to_string())
    }
}

impl From<serde_json::Error> for IpcError {
    fn from(e: serde_json::Error) -> Self {
        IpcError::BadJson(e.to_string())
    }
}

pub type IpcResult<T> = std::result::Result<T, IpcError>;
