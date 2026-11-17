//! The key-value singletons.

use serde_json::{json, Value};

use crate::common::fresh_store;

#[test]
fn get_kv_returns_none_for_a_missing_key() {
    let c = fresh_store();
    assert_eq!(c.get_kv("settings").unwrap(), None);
}

#[test]
fn set_kv_then_get_kv_round_trips_the_exact_string() {
    let c = fresh_store();
    c.set_kv("settings", r#"{"intervalMin": 45}"#).unwrap();
    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"intervalMin": 45}"#)
    );
}

#[test]
fn set_kv_overwrites_an_existing_value() {
    let c = fresh_store();
    c.set_kv("settings", r#"{"a":1}"#).unwrap();
    c.set_kv("settings", r#"{"a":2}"#).unwrap();
    assert_eq!(c.get_kv("settings").unwrap().as_deref(), Some(r#"{"a":2}"#));
}

#[test]
fn kv_keys_are_independent() {
    let c = fresh_store();
    c.set_kv("program", "1").unwrap();
    c.set_kv("dayLog", "2").unwrap();
    assert_eq!(c.get_kv("program").unwrap().as_deref(), Some("1"));
    assert_eq!(c.get_kv("dayLog").unwrap().as_deref(), Some("2"));
}

#[test]
fn get_json_parses_the_stored_value() {
    let c = fresh_store();
    c.set_kv("settings", r#"{"intervalMin": 45}"#).unwrap();
    assert_eq!(c.get_json("settings").unwrap(), json!({"intervalMin": 45}));
}

#[test]
fn get_json_is_null_for_a_missing_key() {
    assert_eq!(fresh_store().get_json("settings").unwrap(), Value::Null);
}
