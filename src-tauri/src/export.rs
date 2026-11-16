//! Writing the export document where the user will find it.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use chrono::Local;
use tauri::{AppHandle, Manager, Runtime};

use crate::error::{AppError, AppResult};

/// Write `json` to a new timestamped file; returns where it went.
pub fn write<R: Runtime>(app: &AppHandle<R>, json: &str) -> AppResult<PathBuf> {
    let dir = export_dir(app).ok_or(AppError::NoExportDir)?;
    let path = dir.join(nabd_native::export_file_name(Local::now().naive_local()));
    write_new(&path, json).map_err(|source| AppError::ExportWrite {
        path: path.clone(),
        source,
    })?;
    Ok(path)
}

/// The first folder that exists, most findable first. Downloads can be
/// unknown (a Linux session without xdg-user-dirs, a redirected Windows
/// profile); the app's own data folder always exists by the time we get here.
fn export_dir<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    let paths = app.path();
    [
        paths.download_dir().ok(),
        paths.home_dir().ok().map(|home| home.join("Downloads")),
        paths.document_dir().ok(),
        paths.app_data_dir().ok(),
    ]
    .into_iter()
    .flatten()
    .find(|dir| dir.is_dir())
}

/// `create_new` fails rather than replace a file: two exports within the same
/// second must not silently become one.
fn write_new(path: &Path, contents: &str) -> std::io::Result<()> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?
        .write_all(contents.as_bytes())
}
