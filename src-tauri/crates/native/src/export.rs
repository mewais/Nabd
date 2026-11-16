//! Naming export files.

use chrono::NaiveDateTime;
use serde::Deserialize;

/// Why an export file is written.
#[derive(Clone, Copy, PartialEq, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportPurpose {
    /// The user asked for it.
    Manual,
    /// An import is about to replace what is stored: this keeps it.
    BeforeImport,
}

impl ExportPurpose {
    /// What the file is called before its timestamp, so a backup is told from
    /// an export at a glance.
    fn stem(self) -> &'static str {
        match self {
            Self::Manual => "nabd-data",
            Self::BeforeImport => "nabd-backup-before-import",
        }
    }
}

/// `nabd-data-YYYYMMDD-HHMMSS.json` (or `nabd-backup-before-import-…`) for the
/// (local) moment of the export, so successive exports sit side by side
/// instead of replacing each other.
pub fn export_file_name(purpose: ExportPurpose, at: NaiveDateTime) -> String {
    format!("{}-{}.json", purpose.stem(), at.format("%Y%m%d-%H%M%S"))
}
