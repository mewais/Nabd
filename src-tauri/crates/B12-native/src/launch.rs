//! How a launch starts and what closing the window does.

/// The argument the autostart entry launches the app with.
pub const AUTOSTART_ARG: &str = "--autostart";

/// Whether these process arguments are the login autostart launch.
pub fn is_autostart_launch<S: AsRef<str>>(args: &[S]) -> bool {
    args.iter().any(|arg| arg.as_ref() == AUTOSTART_ARG)
}

/// The facts a launch decides its window visibility from.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Launch {
    /// Started by the login autostart entry rather than by the user.
    pub autostart: bool,
    /// The "Start minimized" setting.
    pub start_minimized: bool,
    /// A tray icon exists to bring the window back from.
    pub tray: bool,
}

/// A login launch always starts in the tray (nobody asked for a window), and a
/// manual one does when "Start minimized" is on — but never without a tray,
/// where a hidden window could not be reached again.
pub fn starts_hidden(launch: Launch) -> bool {
    launch.tray && (launch.autostart || launch.start_minimized)
}

/// What closing the main window does.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum CloseAction {
    HideToTray,
    Quit,
}

/// With a tray the app keeps running there so nudges keep coming; without one
/// a hidden window would leave a process the user can neither see nor quit.
pub fn close_action(tray: bool) -> CloseAction {
    if tray {
        CloseAction::HideToTray
    } else {
        CloseAction::Quit
    }
}
