//! Export file names.

use chrono::NaiveDate;
use nabd_native::export_file_name;

fn at(y: i32, mo: u32, d: u32, h: u32, mi: u32, s: u32) -> chrono::NaiveDateTime {
    NaiveDate::from_ymd_opt(y, mo, d)
        .and_then(|date| date.and_hms_opt(h, mi, s))
        .expect("a valid date and time")
}

#[test]
fn the_name_carries_the_date_and_time_zero_padded() {
    assert_eq!(
        export_file_name(at(2026, 11, 16, 9, 5, 7)),
        "nabd-data-20261116-090507.json"
    );
    assert_eq!(
        export_file_name(at(2027, 1, 2, 23, 59, 59)),
        "nabd-data-20270102-235959.json"
    );
}

#[test]
fn exports_a_second_apart_get_different_names_that_sort_by_time() {
    let first = export_file_name(at(2026, 11, 16, 9, 59, 59));
    let second = export_file_name(at(2026, 11, 16, 10, 0, 0));
    assert!(first < second);
}
