//! OS notifications: their shape, and the text of the ones the backend raises itself.

use serde::Deserialize;

/// An OS notification. A nudge's text comes from the frontend, which words
/// the same nudge inside the window.
#[derive(Clone, PartialEq, Debug, Deserialize)]
pub struct DesktopNotification {
    pub title: String,
    pub body: String,
}

impl DesktopNotification {
    /// The notification behind Settings → "Send test notification", titled
    /// with the product name (`app_name`).
    pub fn test(app_name: &str) -> Self {
        Self {
            title: app_name.to_string(),
            body: "Notifications are working. This is how a due set will look.".to_string(),
        }
    }

    /// The notification that stands in for the window when a launch fails
    /// before there is one.
    pub fn startup_failure(app_name: &str, reason: &impl std::fmt::Display) -> Self {
        Self {
            title: format!("{app_name} could not start"),
            body: reason.to_string(),
        }
    }
}
