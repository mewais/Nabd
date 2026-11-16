//! System-wide idle time: how long since the user last touched the keyboard
//! or mouse anywhere, not just in this window.
//!
//! Each platform offers its backends behind [`IdleSource`]; [`IdleMonitor`]
//! holds the one that works in this session. "Unknown" is a first-class
//! answer (`None`), never reported as zero: the frontend then falls back to
//! activity it can see itself.

use std::time::{Duration, Instant};

#[cfg(target_os = "linux")]
mod dbus;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
mod wayland;
#[cfg(windows)]
mod windows;
#[cfg(target_os = "linux")]
mod x11;

#[cfg(target_os = "linux")]
use linux as platform;
#[cfg(windows)]
use windows as platform;

/// One way of asking the OS for the idle time. Implementations keep their
/// connection open: they are sampled once a second.
pub trait IdleSource: Send {
    /// Time since the last input, or None if the backend stopped answering.
    fn idle(&mut self) -> Option<Duration>;
}

/// How long to wait before looking for a backend again after losing one (the
/// session bus restarting, a compositor reload). Probing costs a few
/// connection attempts, so not every tick.
const RECONNECT_AFTER: Duration = Duration::from_secs(60);

/// The idle backend in use, re-established when it fails.
pub struct IdleMonitor {
    source: Option<Box<dyn IdleSource>>,
    reconnect_at: Instant,
}

impl IdleMonitor {
    /// Find the backend that works in this session, if any.
    pub fn connect() -> Self {
        Self {
            source: platform::connect(),
            reconnect_at: Instant::now() + RECONNECT_AFTER,
        }
    }

    pub fn is_available(&self) -> bool {
        self.source.is_some()
    }

    /// Whole seconds since the last input; None while no backend answers.
    pub fn idle_seconds(&mut self) -> Option<u64> {
        self.reconnect_if_due();
        let idle = self.source.as_mut()?.idle();
        if idle.is_none() {
            // A backend that failed once is not trusted again until re-probed.
            self.source = None;
            self.reconnect_at = Instant::now() + RECONNECT_AFTER;
        }
        idle.map(|time| time.as_secs())
    }

    fn reconnect_if_due(&mut self) {
        if self.source.is_none() && Instant::now() >= self.reconnect_at {
            *self = Self::connect();
        }
    }
}
