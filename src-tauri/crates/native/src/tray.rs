//! The tray menu model: what it shows, and what each entry does.

use serde::Deserialize;

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

/// Tray menu entry ids (Start and Pause are also the action names sent to the frontend).
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

/// Where the day stands, in one line.
fn status_line(state: &TrayState) -> String {
    let progress = format!("{}/{} sets", state.done, state.total);
    match &state.next_exercise {
        Some(exercise) => format!("Next: {exercise} · {progress}"),
        None if state.total == 0 => "Nothing planned today".to_string(),
        None => format!("All done · {progress}"),
    }
}

/// The tray menu: status line, Start next set, Pause/Resume, Open, Quit.
pub fn tray_items(state: &TrayState) -> Vec<TrayItem> {
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
        item(TRAY_STATUS, &status_line(state), false),
        item(TRAY_START, "Start next set", state.next_exercise.is_some()),
        item(TRAY_PAUSE, pause, true),
        item(TRAY_OPEN, "Open Nabd", true),
        item(TRAY_QUIT, "Quit", true),
    ]
}

/// The text shown when the pointer rests on the tray icon.
pub fn tray_tooltip(state: &TrayState) -> String {
    let paused = if state.paused { " (paused)" } else { "" };
    format!("Nabd{paused} — {}", status_line(state))
}

/// What choosing a tray menu entry asks for.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum TrayCommand {
    Start,
    Pause,
    Open,
    Quit,
}

impl TrayCommand {
    /// The command behind a menu entry id; None for the status line or an unknown id.
    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            TRAY_START => Some(Self::Start),
            TRAY_PAUSE => Some(Self::Pause),
            TRAY_OPEN => Some(Self::Open),
            TRAY_QUIT => Some(Self::Quit),
            _ => None,
        }
    }

    /// Start opens the logger and Open is the window itself; pausing from the
    /// tray is meant to be done without the app coming forward.
    pub fn reveals_window(self) -> bool {
        matches!(self, Self::Start | Self::Open)
    }

    /// The action name the frontend handles, for the commands it owns (the
    /// workout state lives there).
    pub fn frontend_action(self) -> Option<&'static str> {
        match self {
            Self::Start => Some(TRAY_START),
            Self::Pause => Some(TRAY_PAUSE),
            Self::Open | Self::Quit => None,
        }
    }
}
