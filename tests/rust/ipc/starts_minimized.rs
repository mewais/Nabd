//! The "Start minimized" setting, read at launch.

use crate::support::fresh_db;

#[test]
fn starts_minimized_defaults_to_false_without_settings() {
    assert!(!fresh_db().starts_minimized().unwrap());
}

#[test]
fn starts_minimized_defaults_to_false_when_the_flag_is_absent() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"theme":"dark"}"#).unwrap();
    assert!(!c.starts_minimized().unwrap());
}

#[test]
fn starts_minimized_follows_the_stored_flag() {
    let c = fresh_db();

    c.save_singleton("settings", r#"{"minimizedByDefault":true}"#)
        .unwrap();
    assert!(c.starts_minimized().unwrap());

    c.save_singleton("settings", r#"{"minimizedByDefault":false}"#)
        .unwrap();
    assert!(!c.starts_minimized().unwrap());
}

#[test]
fn starts_minimized_is_false_when_the_flag_is_not_a_boolean() {
    let c = fresh_db();
    c.save_singleton("settings", r#"{"minimizedByDefault":"yes"}"#)
        .unwrap();
    assert!(!c.starts_minimized().unwrap());
}
