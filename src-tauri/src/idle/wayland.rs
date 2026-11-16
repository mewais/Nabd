//! Wayland: the `ext-idle-notify-v1` protocol (KDE, Sway, Hyprland, COSMIC…;
//! not GNOME, which is served by its D-Bus idle monitor instead).
//!
//! The protocol has no "how long has it been?" request. The compositor sends
//! `idled` once the seat has been quiet for a chosen time and `resumed` on the
//! next input, so a listener thread records when the idle spell began.

use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::thread;
use std::time::{Duration, Instant};

use wayland_client::globals::{registry_queue_init, GlobalListContents};
use wayland_client::protocol::wl_registry::{self, WlRegistry};
use wayland_client::protocol::wl_seat::WlSeat;
use wayland_client::{delegate_noop, Connection, Dispatch, EventQueue, Proxy, QueueHandle};
use wayland_protocols::ext::idle_notify::v1::client::ext_idle_notification_v1::{
    self, ExtIdleNotificationV1,
};
use wayland_protocols::ext::idle_notify::v1::client::ext_idle_notifier_v1::ExtIdleNotifierV1;

use super::IdleSource;

/// The quiet time after which the compositor reports "idle". Shorter spells
/// read as zero, which is fine at the one-second resolution we are sampled at.
const IDLE_AFTER: Duration = Duration::from_secs(1);

/// Notifier v2 can report input idleness regardless of idle inhibitors (a
/// playing video); that is the "no keyboard or mouse" the nudge is about.
const INPUT_IDLE_SINCE_VERSION: u32 = 2;

/// What the compositor last told us.
#[derive(Clone, Copy)]
enum Activity {
    Active,
    /// `idled` arrived at this instant.
    IdleSince(Instant),
    /// The connection is gone; nothing more will be learned.
    Disconnected,
}

type SharedActivity = Arc<Mutex<Activity>>;

/// The value is a plain enum that is only ever overwritten whole, so a
/// poisoned lock still holds a meaningful state.
fn lock(activity: &SharedActivity) -> MutexGuard<'_, Activity> {
    activity.lock().unwrap_or_else(PoisonError::into_inner)
}

pub struct WaylandIdle {
    activity: SharedActivity,
}

impl WaylandIdle {
    /// Connect to `$WAYLAND_DISPLAY` and start listening; None when there is
    /// no compositor or it lacks the protocol.
    pub fn connect() -> Option<Self> {
        let connection = Connection::connect_to_env().ok()?;
        let (globals, mut queue) = registry_queue_init::<Listener>(&connection).ok()?;
        let handle = queue.handle();
        let notifier: ExtIdleNotifierV1 = globals
            .bind(&handle, 1..=INPUT_IDLE_SINCE_VERSION, ())
            .ok()?;
        let seat: WlSeat = globals.bind(&handle, 1..=1, ()).ok()?;
        let timeout_ms = IDLE_AFTER.as_millis() as u32;
        let notification = if notifier.version() >= INPUT_IDLE_SINCE_VERSION {
            notifier.get_input_idle_notification(timeout_ms, &seat, &handle, ())
        } else {
            notifier.get_idle_notification(timeout_ms, &seat, &handle, ())
        };

        let mut listener = Listener {
            activity: Arc::new(Mutex::new(Activity::Active)),
            _notification: notification,
        };
        // Deliver the request before reporting success.
        queue.roundtrip(&mut listener).ok()?;
        let activity = Arc::clone(&listener.activity);
        thread::Builder::new()
            .name("nabd-wayland-idle".into())
            .spawn(move || listener.run(queue))
            .ok()?;
        Some(Self { activity })
    }
}

impl IdleSource for WaylandIdle {
    fn idle(&mut self) -> Option<Duration> {
        match *lock(&self.activity) {
            Activity::Active => Some(Duration::ZERO),
            Activity::IdleSince(since) => Some(IDLE_AFTER + since.elapsed()),
            Activity::Disconnected => None,
        }
    }
}

/// The event-queue side: owns the notification object and records its events.
struct Listener {
    activity: SharedActivity,
    /// Kept alive: destroying it would end the notifications.
    _notification: ExtIdleNotificationV1,
}

impl Listener {
    /// Dispatch events until the compositor goes away.
    fn run(mut self, mut queue: EventQueue<Self>) {
        while queue.blocking_dispatch(&mut self).is_ok() {}
        *lock(&self.activity) = Activity::Disconnected;
    }
}

impl Dispatch<ExtIdleNotificationV1, ()> for Listener {
    fn event(
        listener: &mut Self,
        _: &ExtIdleNotificationV1,
        event: ext_idle_notification_v1::Event,
        (): &(),
        _: &Connection,
        _: &QueueHandle<Self>,
    ) {
        let activity = match event {
            ext_idle_notification_v1::Event::Idled => Activity::IdleSince(Instant::now()),
            ext_idle_notification_v1::Event::Resumed => Activity::Active,
            _ => return,
        };
        *lock(&listener.activity) = activity;
    }
}

/// Globals coming and going do not matter once ours are bound.
impl Dispatch<WlRegistry, GlobalListContents> for Listener {
    fn event(
        _: &mut Self,
        _: &WlRegistry,
        _: wl_registry::Event,
        _: &GlobalListContents,
        _: &Connection,
        _: &QueueHandle<Self>,
    ) {
    }
}

delegate_noop!(Listener: ExtIdleNotifierV1);
delegate_noop!(Listener: ignore WlSeat);
