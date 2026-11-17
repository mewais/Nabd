//! Keeping the login entry in line with the setting.

use nabd_native::AutostartChange::{self, Leave, Register, Unregister};

const RELEASE: bool = false;
const DEBUG: bool = true;

/// A wanted entry is written even when one is there, so a moved app is
/// repaired; an unwanted one is removed only if it exists; and a debug build
/// never touches the entry at all.
#[test]
fn the_entry_is_rewritten_while_wanted_and_a_debug_build_never_touches_it() {
    for (wanted, registered, release, debug) in [
        (true, false, Register, Leave),
        (true, true, Register, Leave),
        (false, true, Unregister, Leave),
        (false, false, Leave, Leave),
    ] {
        assert_eq!(
            AutostartChange::decide(wanted, registered, RELEASE),
            release
        );
        assert_eq!(AutostartChange::decide(wanted, registered, DEBUG), debug);
    }
}
