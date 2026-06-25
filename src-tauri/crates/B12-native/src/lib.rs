//! B12 · nabd-native — pure native-behavior decisions (no OS/Tauri deps).
//!
//! Holds the *logic* behind native features so it is 100% unit testable:
//! idle-threshold crossing, translucency alpha mapping, tray menu model, and
//! notification payload building. The actual OS/Tauri calls (idle polling, tray
//! creation, window vibrancy, notifications, autostart) live in the Tauri binary
//! (B23) and are validated by the E2E suite.

use serde::{Deserialize, Serialize};

/// True when idle seconds have reached/exceeded the nudge threshold.
pub fn idle_crossed(idle_sec: u64, threshold_sec: u64) -> bool {
    idle_sec >= threshold_sec
}

/// Map translucent background opacity (0.2–0.9) to an 8-bit alpha (0–255),
/// clamping the opacity into range first.
pub fn vibrancy_alpha(opacity: f64) -> u8 {
    let clamped = opacity.clamp(0.2, 0.9);
    (clamped * 255.0).round() as u8
}

/// State the tray menu reflects.
#[derive(Clone, PartialEq, Debug)]
pub struct TrayState {
    pub next_exercise: Option<String>,
    pub next_time: Option<String>,
    pub done: u32,
    pub total: u32,
    pub paused: bool,
}

/// A tray menu entry the binary will render.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct TrayItem {
    pub id: String,
    pub label: String,
    pub enabled: bool,
}

/// Build the tray menu model from app state (pure). Order: status line
/// (disabled), Start next set (enabled iff a set is due), Pause/Resume (label
/// depends on `paused`), Open Nabd, Quit.
pub fn tray_items(state: &TrayState) -> Vec<TrayItem> {
    let status_label = if let Some(exercise) = &state.next_exercise {
        let time = state.next_time.as_deref().unwrap_or("");
        format!("Next: {} @ {}", exercise, time)
    } else {
        format!("All sets done ({}/{})", state.done, state.total)
    };

    let pause_label = if state.paused {
        "Resume nudges"
    } else {
        "Pause nudges"
    };

    vec![
        TrayItem {
            id: "status".to_string(),
            label: status_label,
            enabled: false,
        },
        TrayItem {
            id: "start".to_string(),
            label: "Start next set".to_string(),
            enabled: state.next_exercise.is_some(),
        },
        TrayItem {
            id: "pause".to_string(),
            label: pause_label.to_string(),
            enabled: true,
        },
        TrayItem {
            id: "open".to_string(),
            label: "Open Nabd".to_string(),
            enabled: true,
        },
        TrayItem {
            id: "quit".to_string(),
            label: "Quit".to_string(),
            enabled: true,
        },
    ]
}

/// Why a notification is being raised.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum NotifReason {
    Timer,
    Idle,
}

/// A built OS-notification payload.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct NotifPayload {
    pub title: String,
    pub body: String,
}

/// Build a notification payload for a due set. title = "Time to move"; body
/// mentions the exercise and the reason ("Interval's up" / "You've gone quiet").
pub fn notif_payload(reason: NotifReason, exercise: &str) -> NotifPayload {
    let suffix = match reason {
        NotifReason::Timer => "Interval's up",
        NotifReason::Idle => "You've gone quiet",
    };
    NotifPayload {
        title: "Time to move".to_string(),
        body: format!("{} \u{2014} {}", exercise, suffix),
    }
}

/// Decide whether autostart should be (un)registered: Some(true) to register,
/// Some(false) to unregister, None to do nothing.
pub fn autostart_action(desired: bool, currently: bool) -> Option<bool> {
    if desired && !currently {
        Some(true)
    } else if !desired && currently {
        Some(false)
    } else {
        None
    }
}
