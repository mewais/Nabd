//! Replacing singletons and history in one transaction.

use crate::common::fresh_store;
use crate::support::{history_ids, set_row};

#[test]
fn replace_all_replaces_given_singletons_and_the_whole_history() {
    let c = fresh_store();
    c.set_kv("program", r#""old program""#).unwrap();
    c.set_kv("dayLog", r#""untouched""#).unwrap();
    c.append_history(&set_row("old", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    let singletons = [
        ("program", r#""new program""#.to_string()),
        ("settings", r#"{"theme":"dark"}"#.to_string()),
    ];
    let history = [
        set_row("new-2", "2025-04-02T10:00:00.000Z"),
        set_row("new-1", "2025-04-01T10:00:00.000Z"),
    ];
    c.replace_all(&singletons, Some(&history)).unwrap();

    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#""new program""#)
    );
    assert_eq!(
        c.get_kv("settings").unwrap().as_deref(),
        Some(r#"{"theme":"dark"}"#)
    );
    assert_eq!(
        c.get_kv("dayLog").unwrap().as_deref(),
        Some(r#""untouched""#)
    );
    assert_eq!(history_ids(&c), ["new-1", "new-2"]);
}

#[test]
fn replace_all_without_history_leaves_history_untouched() {
    let c = fresh_store();
    c.append_history(&set_row("keep", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    c.replace_all(&[("program", "1".to_string())], None)
        .unwrap();

    assert_eq!(c.get_kv("program").unwrap().as_deref(), Some("1"));
    assert_eq!(history_ids(&c), ["keep"]);
}

#[test]
fn replace_all_with_empty_history_clears_history() {
    let c = fresh_store();
    c.append_history(&set_row("gone", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    c.replace_all(&[], Some(&[])).unwrap();

    assert!(c.all_history().unwrap().is_empty());
}

#[test]
fn replace_all_rolls_everything_back_when_a_history_row_fails() {
    let c = fresh_store();
    c.set_kv("program", r#""old program""#).unwrap();
    c.append_history(&set_row("old", "2025-03-01T10:00:00.000Z"))
        .unwrap();

    // Two rows with the same id: the second insert violates the primary key.
    let clashing = [
        set_row("dup", "2025-04-01T10:00:00.000Z"),
        set_row("dup", "2025-04-02T10:00:00.000Z"),
    ];
    let result = c.replace_all(
        &[("program", r#""new program""#.to_string())],
        Some(&clashing),
    );

    assert!(result.is_err());
    assert_eq!(
        c.get_kv("program").unwrap().as_deref(),
        Some(r#""old program""#)
    );
    assert_eq!(history_ids(&c), ["old"]);
}
