//! nabd-native — the pure decisions behind native features (no OS or
//! Tauri dependency): what the tray shows and does, what a notification is, what
//! this platform can do, how a launch and a close behave, which idle backend
//! to ask, and how an export file is named. The binary performs the OS calls.

mod autostart;
mod export;
mod idle;
mod launch;
mod notification;
mod platform;
mod tray;

pub use autostart::AutostartChange;
pub use export::{export_file_name, ExportPurpose};
pub use idle::{millis_since, IdleBackend, SessionKind};
pub use launch::{CloseAction, Launch, AUTOSTART_ARG};
pub use notification::DesktopNotification;
pub use platform::{tray_host_present, Capabilities, GlassEffect, Platform};
pub use tray::{
    TrayCommand, TrayItem, TrayState, TRAY_OPEN, TRAY_PAUSE, TRAY_QUIT, TRAY_START, TRAY_STATUS,
};
