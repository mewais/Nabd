//! nabd-persistence — behaviour tests, against an in-memory database or,
//! where a test has to prepare or inspect the file behind the store's back, a
//! temporary one.

#[path = "../common/mod.rs"]
mod common;
mod support;

mod history;
mod logged_set;
mod migration;
mod replace_all;
mod schema;
mod singletons;
