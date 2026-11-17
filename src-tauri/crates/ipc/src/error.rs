//! What can go wrong in a command; the sources are kept so the binary can
//! report the whole chain.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum IpcError {
    #[error("unknown singleton key: {0}")]
    BadKey(String),
    #[error("invalid json: {0}")]
    BadJson(#[from] serde_json::Error),
    #[error("storage error: {0}")]
    Storage(#[from] nabd_persistence::Error),
}

pub type IpcResult<T> = std::result::Result<T, IpcError>;
