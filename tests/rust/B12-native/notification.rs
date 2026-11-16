//! Notification text.

use nabd_native::{nudge_notification, test_notification, NotifReason};

// ── notifications ────────────────────────────────────────────────────────────

#[test]
fn timer_notification_says_the_interval_is_up() {
    let payload = nudge_notification(NotifReason::Timer, "Push-up");
    assert_eq!(payload.title, "Time to move");
    assert_eq!(payload.body, "Push-up — Interval's up");
}

#[test]
fn idle_notification_says_you_have_gone_quiet() {
    let payload = nudge_notification(NotifReason::Idle, "Wall sit");
    assert_eq!(payload.title, "Time to move");
    assert_eq!(payload.body, "Wall sit — You've gone quiet");
}

#[test]
fn notification_serialises_title_and_body() {
    let payload = nudge_notification(NotifReason::Timer, "Squat");
    assert_eq!(
        serde_json::to_value(&payload).unwrap(),
        serde_json::json!({"title": "Time to move", "body": "Squat — Interval's up"})
    );
}

#[test]
fn notif_reason_deserialises_from_lowercase_strings() {
    assert_eq!(
        serde_json::from_str::<NotifReason>(r#""timer""#).unwrap(),
        NotifReason::Timer
    );
    assert_eq!(
        serde_json::from_str::<NotifReason>(r#""idle""#).unwrap(),
        NotifReason::Idle
    );
}

#[test]
fn notif_reason_rejects_unknown_or_capitalised_values() {
    assert!(serde_json::from_str::<NotifReason>(r#""Timer""#).is_err());
    assert!(serde_json::from_str::<NotifReason>(r#""manual""#).is_err());
}

#[test]
fn the_test_notification_is_recognisably_a_test() {
    let payload = test_notification();
    assert_eq!(payload.title, "Nabd");
    assert!(payload.body.starts_with("Notifications are working"));
}
