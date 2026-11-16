//! Keeping the login entry in line with the setting.

use nabd_native::AutostartChange;

const RELEASE: bool = false;
const DEBUG: bool = true;

#[test]
fn a_wanted_entry_is_written_when_missing() {
    assert_eq!(
        AutostartChange::decide(true, false, RELEASE),
        AutostartChange::Register
    );
}

#[test]
fn a_wanted_entry_is_rewritten_even_when_present_so_a_moved_app_is_repaired() {
    assert_eq!(
        AutostartChange::decide(true, true, RELEASE),
        AutostartChange::Register
    );
}

#[test]
fn an_unwanted_entry_is_removed_only_if_it_exists() {
    assert_eq!(
        AutostartChange::decide(false, true, RELEASE),
        AutostartChange::Unregister
    );
    assert_eq!(
        AutostartChange::decide(false, false, RELEASE),
        AutostartChange::Leave
    );
}

#[test]
fn a_debug_build_never_touches_the_entry() {
    for wanted in [true, false] {
        for registered in [true, false] {
            assert_eq!(
                AutostartChange::decide(wanted, registered, DEBUG),
                AutostartChange::Leave
            );
        }
    }
}
