//! How a launch starts and what closing the window does.

use crate::TrayCommand;

/// The argument the autostart entry launches the app with.
pub const AUTOSTART_ARG: &str = "--autostart";

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

impl Launch {
    /// Whether these process arguments are the login autostart launch.
    pub fn is_autostart<S: AsRef<str>>(args: &[S]) -> bool {
        args.iter().any(|arg| arg.as_ref() == AUTOSTART_ARG)
    }

    /// A login launch always starts in the tray (nobody asked for a window),
    /// and a manual one does when "Start minimized" is on — but never without
    /// a tray, where a hidden window could not be reached again.
    pub fn starts_hidden(self) -> bool {
        self.tray && (self.autostart || self.start_minimized)
    }
}

/// What closing the main window does.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum CloseAction {
    HideToTray,
    Quit,
}

impl CloseAction {
    /// With a tray the app keeps running there so nudges keep coming; without
    /// one a hidden window would leave a process the user can neither see nor
    /// quit.
    pub fn for_tray(tray: bool) -> Self {
        if tray {
            Self::HideToTray
        } else {
            Self::Quit
        }
    }

    /// The command a close is carried out as, instead of letting the window
    /// go at once: quitting is the tray's Quit, which the window carries out
    /// so that what is still waiting to be saved is saved first. Hiding is
    /// no command.
    pub fn command(self) -> Option<TrayCommand> {
        match self {
            Self::HideToTray => None,
            Self::Quit => Some(TrayCommand::Quit),
        }
    }
}
