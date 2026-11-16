//! macOS: the menu bar and vibrancy are always there.

use nabd_native::Platform;

pub fn detect(_at_login: bool) -> Platform {
    Platform::MacOs
}
