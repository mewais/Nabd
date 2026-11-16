//! B12 · nabd-native — the pure decisions behind native features (no OS or
//! Tauri dependency): the tray menu model, notification text and the
//! translucency alpha. The binary performs the actual OS calls.

use serde::{Deserialize, Serialize};

/// Map the translucent background opacity (0.1–1.0) to an 8-bit alpha.
pub fn vibrancy_alpha(opacity: f64) -> u8 {
    (opacity.clamp(0.1, 1.0) * 255.0).round() as u8
}

/// What the tray menu reflects; pushed from the frontend whenever it changes.
#[derive(Clone, PartialEq, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayState {
    /// The exercise that is up next, or None when nothing is left today.
    pub next_exercise: Option<String>,
    pub done: u32,
    pub total: u32,
    pub paused: bool,
}

/// Tray menu entry ids (also the action names sent to the frontend).
pub const TRAY_STATUS: &str = "status";
pub const TRAY_START: &str = "start";
pub const TRAY_PAUSE: &str = "pause";
pub const TRAY_OPEN: &str = "open";
pub const TRAY_QUIT: &str = "quit";

/// A tray menu entry the binary will render.
#[derive(Clone, PartialEq, Debug)]
pub struct TrayItem {
    pub id: &'static str,
    pub label: String,
    pub enabled: bool,
}

/// The tray menu: status line, Start next set, Pause/Resume, Open, Quit.
pub fn tray_items(state: &TrayState) -> Vec<TrayItem> {
    let progress = format!("{}/{} sets", state.done, state.total);
    let status = match &state.next_exercise {
        Some(exercise) => format!("Next: {exercise} · {progress}"),
        None if state.total == 0 => "Nothing planned today".to_string(),
        None => format!("All done · {progress}"),
    };
    let pause = if state.paused {
        "Resume nudges"
    } else {
        "Pause nudges"
    };
    let item = |id, label: &str, enabled| TrayItem {
        id,
        label: label.to_string(),
        enabled,
    };
    vec![
        item(TRAY_STATUS, &status, false),
        item(TRAY_START, "Start next set", state.next_exercise.is_some()),
        item(TRAY_PAUSE, pause, true),
        item(TRAY_OPEN, "Open Nabd", true),
        item(TRAY_QUIT, "Quit", true),
    ]
}

/// Why a notification is being raised.
#[derive(Clone, Copy, PartialEq, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NotifReason {
    Timer,
    Idle,
}

/// A built OS-notification payload.
#[derive(Clone, PartialEq, Debug, Serialize)]
pub struct NotifPayload {
    pub title: String,
    pub body: String,
}

/// The notification for a due set.
pub fn notif_payload(reason: NotifReason, exercise: &str) -> NotifPayload {
    let why = match reason {
        NotifReason::Timer => "Interval's up",
        NotifReason::Idle => "You've gone quiet",
    };
    NotifPayload {
        title: "Time to move".to_string(),
        body: format!("{exercise} \u{2014} {why}"),
    }
}
