//! nabd-persistence — the SQLite store.
//!
//! Singletons (program, settings, …) are opaque JSON blobs in a key-value
//! table: the TypeScript domain layer owns their structure. Logged sets live in
//! a queryable `history` table. A [`Store`] owns the connection; it opens a
//! file, or an in-memory database for tests.

mod error;
mod logged_set;
mod schema;
mod store;

pub use error::{Error, Result};
pub use logged_set::LoggedSetRow;
pub use schema::SCHEMA_VERSION;
pub use store::{Store, KV_KEYS};
