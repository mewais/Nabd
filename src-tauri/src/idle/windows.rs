//! Windows: the time of the last input event in this session.

use std::time::Duration;

use windows_sys::Win32::System::SystemInformation::GetTickCount;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

use super::IdleSource;

pub fn connect() -> Option<Box<dyn IdleSource>> {
    Some(Box::new(LastInputIdle))
}

struct LastInputIdle;

impl IdleSource for LastInputIdle {
    fn idle(&mut self) -> Option<Duration> {
        let mut last_input = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        // SAFETY: `last_input` is a valid, exclusively borrowed LASTINPUTINFO
        // whose `cbSize` is set, which is all GetLastInputInfo requires.
        if unsafe { GetLastInputInfo(&mut last_input) } == 0 {
            return None;
        }
        // SAFETY: GetTickCount takes no arguments and cannot fail.
        let now = unsafe { GetTickCount() };
        // Both values are on the same wrapping 32-bit tick counter.
        Some(Duration::from_millis(nabd_native::millis_since(
            now,
            last_input.dwTime,
        )))
    }
}
