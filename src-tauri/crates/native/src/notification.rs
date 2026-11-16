//! OS notifications: their shape, and the text of the ones the backend raises itself.

use serde::Deserialize;

/// An OS notification. A nudge's text comes from the frontend, which words
/// the same nudge inside the window.
#[derive(Clone, PartialEq, Debug, Deserialize)]
pub struct NotifPayload {
    pub title: String,
    pub body: String,
}

/// The notification behind Settings → "Send test notification".
pub fn test_notification() -> NotifPayload {
    NotifPayload {
        title: "Nabd".to_string(),
        body: "Notifications are working. This is how a due set will look.".to_string(),
    }
}
