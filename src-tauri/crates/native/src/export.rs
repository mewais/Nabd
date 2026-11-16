//! Naming export files.

use chrono::NaiveDateTime;

/// `nabd-data-YYYYMMDD-HHMMSS.json` for the (local) moment of the export, so
/// successive exports sit side by side instead of replacing each other.
pub fn export_file_name(at: NaiveDateTime) -> String {
    at.format("nabd-data-%Y%m%d-%H%M%S.json").to_string()
}
