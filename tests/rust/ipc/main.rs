//! nabd-ipc — the command core, driven through its JSON-in/JSON-out API
//! against an in-memory database.

#[path = "../common/mod.rs"]
mod common;
mod support;

mod export;
mod import;
mod load_all;
mod save_singletons;
mod sets;
mod starts_minimized;
