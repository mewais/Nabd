//! The set history.

use nabd_persistence::LoggedSetRow;

use crate::common::fresh_store;
use crate::support::{history_ids, set_row};

#[test]
fn history_is_empty_on_a_fresh_store() {
    let c = fresh_store();
    assert!(c.all_history().unwrap().is_empty());
}

#[test]
fn appended_row_round_trips_every_field() {
    let c = fresh_store();
    let row = LoggedSetRow {
        weight: Some(22.5),
        value: 7.5,
        plan_item_id: Some("item-3".to_string()),
        set_type: "drop".to_string(),
        ..set_row("a", "2025-03-01T10:00:00.000Z")
    };
    c.append_history(&row).unwrap();
    assert_eq!(c.all_history().unwrap(), [row]);
}

#[test]
fn all_history_is_ordered_by_timestamp_not_insertion() {
    let c = fresh_store();
    c.append_history(&set_row("late", "2025-03-02T08:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("early", "2025-03-01T08:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("middle", "2025-03-01T20:00:00.000Z"))
        .unwrap();
    assert_eq!(history_ids(&c), ["early", "middle", "late"]);
}

#[test]
fn appending_a_duplicate_id_is_an_error() {
    let c = fresh_store();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    assert!(c
        .append_history(&set_row("a", "2025-03-01T11:00:00.000Z"))
        .is_err());
    assert_eq!(history_ids(&c), ["a"]);
}

#[test]
fn delete_history_removes_only_the_given_row() {
    let c = fresh_store();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    c.append_history(&set_row("b", "2025-03-01T11:00:00.000Z"))
        .unwrap();
    c.delete_history("a").unwrap();
    assert_eq!(history_ids(&c), ["b"]);
}

#[test]
fn delete_history_of_an_unknown_id_is_a_no_op() {
    let c = fresh_store();
    c.append_history(&set_row("a", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    c.delete_history("nope").unwrap();
    assert_eq!(history_ids(&c), ["a"]);
}
