//! Notifications.

use nabd_native::{test_notification, NotifPayload};

#[test]
fn a_notification_arrives_from_the_frontend_as_a_title_and_a_body() {
    let payload: NotifPayload =
        serde_json::from_str(r#"{"title": "Time to move", "body": "Squat — Interval's up"}"#)
            .unwrap();
    assert_eq!(payload.title, "Time to move");
    assert_eq!(payload.body, "Squat — Interval's up");
}

#[test]
fn the_test_notification_is_recognisably_a_test() {
    let payload = test_notification();
    assert_eq!(payload.title, "Nabd");
    assert!(payload.body.starts_with("Notifications are working"));
}
