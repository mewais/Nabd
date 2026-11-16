//! B12 · nabd-native — the pure decisions behind native features (no OS or
//! Tauri dependency): what the tray shows and does, notification text, what
//! this platform can do, how a launch and a close behave, which idle backend
//! to ask, and how an export file is named. The binary performs the OS calls.

mod autostart;
mod export;
mod idle;
mod launch;
mod notification;
mod platform;
mod tray;

pub use autostart::{autostart_change, AutostartChange};
pub use export::export_file_name;
pub use idle::{idle_backends, millis_since, IdleBackend, SessionKind};
pub use launch::{
    close_action, is_autostart_launch, starts_hidden, CloseAction, Launch, AUTOSTART_ARG,
};
pub use notification::{nudge_notification, test_notification, NotifPayload, NotifReason};
pub use platform::{glass_effect, tray_host_present, Capabilities, GlassEffect, Platform};
pub use tray::{
    tray_items, tray_tooltip, TrayCommand, TrayItem, TrayState, TRAY_OPEN, TRAY_PAUSE, TRAY_QUIT,
    TRAY_START, TRAY_STATUS,
};
