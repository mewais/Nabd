//! macOS: CoreGraphics' time since the last input event of any kind in the
//! login session.

use std::time::Duration;

use objc2_core_graphics::{CGEventSource, CGEventSourceStateID, CGEventType};

use super::IdleSource;

/// `kCGAnyInputEventType`, a constant CoreGraphics defines as `~0` and the
/// bindings do not name: the query then covers keyboard, mouse and trackpad.
const ANY_INPUT_EVENT: CGEventType = CGEventType(u32::MAX);

pub fn connect() -> Option<Box<dyn IdleSource>> {
    Some(Box::new(EventSourceIdle))
}

struct EventSourceIdle;

impl IdleSource for EventSourceIdle {
    fn idle(&mut self) -> Option<Duration> {
        let seconds = CGEventSource::seconds_since_last_event_type(
            CGEventSourceStateID::CombinedSessionState,
            ANY_INPUT_EVENT,
        );
        // Never negative or NaN from a working session; if it is, say "unknown".
        Duration::try_from_secs_f64(seconds).ok()
    }
}
