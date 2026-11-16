//! Windows: the OS build decides the glass effect.

use nabd_native::Platform;

/// A login launch is no different here: the tray is always there.
pub fn detect(_at_login: bool) -> Platform {
    Platform::Windows {
        build: windows_version::OsVersion::current().build,
    }
}
