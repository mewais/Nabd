//! The set history.

use nabd_persistence::{History, LoggedSetRow};

use crate::common::fresh_store;
use crate::support::{history_ids, set_row, TempDb};

#[test]
fn history_is_empty_on_a_fresh_store() {
    let c = fresh_store();
    assert_eq!(c.all_history().unwrap(), History::default());
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
    assert_eq!(c.all_history().unwrap().sets, [row]);
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

#[test]
fn a_row_that_cannot_be_read_is_skipped_and_counted_not_fatal() {
    let db = TempDb::new();
    let store = db.store().unwrap();
    store
        .append_history(&set_row("good", "2025-03-01T10:00:00.000Z"))
        .unwrap();
    store
        .append_history(&set_row("bad-muscles", "2025-03-01T11:00:00.000Z"))
        .unwrap();
    store
        .append_history(&set_row("bad-value", "2025-03-01T12:00:00.000Z"))
        .unwrap();
    db.damage_set("bad-muscles");
    db.raw()
        .execute(
            "UPDATE history SET value = 'twelve' WHERE id = 'bad-value'",
            [],
        )
        .unwrap();

    let history = store.all_history().unwrap();
    assert_eq!(history.unreadable, 2);
    assert_eq!(history_ids(&store), ["good"]);
}
