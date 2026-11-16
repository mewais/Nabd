//! The text of OS notifications.

use serde::{Deserialize, Serialize};

/// Why a set became due.
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
pub fn nudge_notification(reason: NotifReason, exercise: &str) -> NotifPayload {
    let why = match reason {
        NotifReason::Timer => "Interval's up",
        NotifReason::Idle => "You've gone quiet",
    };
    NotifPayload {
        title: "Time to move".to_string(),
        body: format!("{exercise} \u{2014} {why}"),
    }
}

/// The notification behind Settings → "Send test notification".
pub fn test_notification() -> NotifPayload {
    NotifPayload {
        title: "Nabd".to_string(),
        body: "Notifications are working. This is how a due set will look.".to_string(),
    }
}
