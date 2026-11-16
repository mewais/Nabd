//! Notifications.

use nabd_native::DesktopNotification;

#[test]
fn a_notification_arrives_from_the_frontend_as_a_title_and_a_body() {
    let notification: DesktopNotification =
        serde_json::from_str(r#"{"title": "Time to move", "body": "Squat — Interval's up"}"#)
            .unwrap();
    assert_eq!(notification.title, "Time to move");
    assert_eq!(notification.body, "Squat — Interval's up");
}

#[test]
fn the_test_notification_is_recognisably_a_test() {
    let notification = DesktopNotification::test("Nabd");
    assert_eq!(notification.title, "Nabd");
    assert!(notification.body.starts_with("Notifications are working"));
}

#[test]
fn a_failed_start_is_reported_with_its_reason() {
    let notification = DesktopNotification::startup_failure("Nabd", &"the database is locked");
    assert_eq!(notification.title, "Nabd could not start");
    assert_eq!(notification.body, "the database is locked");
}
