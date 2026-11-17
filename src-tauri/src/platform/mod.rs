//! The platform the app is running on, detected once at startup; `nabd-native`
//! turns it into what the app can offer.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

#[cfg(target_os = "linux")]
pub use linux::detect;
#[cfg(target_os = "macos")]
pub use macos::detect;
#[cfg(windows)]
pub use windows::detect;
