//! The main window: creating it, bringing it forward, showing it discreetly,
//! and what closing it means.
//!
//! Window calls can only fail once the window or the event loop is gone (the
//! app is shutting down), so their results are deliberately dropped.

use nabd_native::{Capabilities, CloseAction, Platform};
use tauri::window::Color;
use tauri::{
    AppHandle, Manager, RunEvent, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window,
    WindowEvent,
};

use crate::error::AppResult;

/// The label the capability file grants the app's commands to.
const MAIN_WINDOW: &str = "main";
/// The page's own `<title>` (see build.rs).
const TITLE: &str = env!("NABD_WINDOW_TITLE");
const SIZE: (f64, f64) = (1280.0, 820.0);
const MIN_SIZE: (f64, f64) = (980.0, 640.0);
/// What an opaque window shows until the page has painted: the dark theme's
/// background (`--bg` in the design system's theme.ts, here as the sRGB the
/// window API takes), so a launch does not flash white.
const BACKGROUND: Color = Color(0x15, 0x18, 0x1f, 0xff);

/// Create the main window, hidden: the launch decides whether it is shown.
/// It is transparent only where a glass effect can go behind it; elsewhere
/// it is opaque.
pub fn create<R: Runtime>(app: &AppHandle<R>, platform: Platform) -> AppResult<()> {
    let translucent = platform.glass_effect().is_some();
    let mut window = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::default())
        .title(TITLE)
        .inner_size(SIZE.0, SIZE.1)
        .min_inner_size(MIN_SIZE.0, MIN_SIZE.1)
        .visible(false)
        .transparent(translucent);
    if !translucent {
        window = window.background_color(BACKGROUND);
    }
    window.build()?;
    Ok(())
}

pub fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(MAIN_WINDOW)
}

/// Bring the window to the user: shown, restored and focused. Wayland
/// compositors and Windows' foreground lock may decline to raise a window the
/// user did not just interact with; it is then shown and flagged for attention
/// instead, and there is nothing more an app is allowed to do.
pub fn reveal<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = main_window(app) else {
        return;
    };
    #[cfg(target_os = "linux")]
    set_focus_on_map(&window, true);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

/// Un-hide a window that is hidden to the tray, without taking the keyboard
/// from whatever the user is typing in. A visible or minimized window is left
/// exactly as it is.
pub fn reveal_quietly<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = main_window(app) else {
        return;
    };
    if !window.is_visible().unwrap_or(true) {
        show_without_focus(&window);
    }
}

/// GTK decides about focus when the window is mapped, from this flag.
#[cfg(target_os = "linux")]
fn set_focus_on_map<R: Runtime>(window: &WebviewWindow<R>, focus: bool) {
    use gtk::prelude::GtkWindowExt;

    let target = window.clone();
    // GTK objects may only be touched on the main thread; this runs before a
    // `show()` issued after it, which is queued to the same thread.
    let _ = window.run_on_main_thread(move || {
        if let Ok(gtk_window) = target.gtk_window() {
            gtk_window.set_focus_on_map(focus);
        }
    });
}

#[cfg(target_os = "linux")]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    set_focus_on_map(window, false);
    let _ = window.show();
}

/// Tauri's `show()` is `SW_SHOW`, which activates the window.
#[cfg(windows)]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOWNOACTIVATE};

    if let Ok(hwnd) = window.hwnd() {
        // SAFETY: `hwnd` is the handle of this live window, and ShowWindow may
        // be called for it from any thread.
        unsafe { ShowWindow(hwnd.0, SW_SHOWNOACTIVATE) };
    }
}

/// Tao's `show()` orders the window to the front without activating the app
/// (activating is what `set_focus()` adds), so the keyboard stays where it was.
#[cfg(target_os = "macos")]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    let _ = window.show();
}

/// Closing the window hides it while there is a tray to live in; otherwise the
/// close goes through, and Tauri exits the app with its last window.
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    let tray = window.state::<Capabilities>().tray;
    if CloseAction::for_tray(tray) == CloseAction::HideToTray {
        api.prevent_close();
        let _ = window.hide();
    }
}

/// Clicking the Dock icon (or launching the app again from Finder) while the
/// window is hidden brings it back: macOS apps are expected to. Only macOS
/// reports that event, so elsewhere nothing here applies.
#[cfg_attr(not(target_os = "macos"), allow(unused_variables))]
pub fn on_run_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    #[cfg(target_os = "macos")]
    if let RunEvent::Reopen {
        has_visible_windows: false,
        ..
    } = event
    {
        reveal(app);
    }
}
