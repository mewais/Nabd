//! Keeping the OS login entry in line with the "Open at startup" setting.

/// What to do to the login entry.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum AutostartChange {
    /// (Re)write the entry.
    Register,
    Unregister,
    Leave,
}

impl AutostartChange {
    /// A wanted entry is rewritten every time: the write is idempotent, and it
    /// repairs an entry that points at a path the app has since moved from. A
    /// debug build never touches the entry — it would register (or remove the
    /// installed app's entry in favour of) a build-directory binary.
    pub fn decide(wanted: bool, registered: bool, debug_build: bool) -> Self {
        match (debug_build, wanted, registered) {
            (true, _, _) => Self::Leave,
            (false, true, _) => Self::Register,
            (false, false, true) => Self::Unregister,
            (false, false, false) => Self::Leave,
        }
    }
}
