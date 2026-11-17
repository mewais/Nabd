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
use crate::{glass, tray};

/// The label the capability file grants the app's commands to.
const MAIN_WINDOW: &str = "main";
/// The page's own `<title>` (see build.rs).
const TITLE: &str = env!("NABD_WINDOW_TITLE");
const SIZE: (f64, f64) = (1280.0, 820.0);
const MIN_SIZE: (f64, f64) = (980.0, 640.0);
/// What an opaque window shows until the page has painted: the dark theme's
/// background, read from the design system's prepaint.json by build.rs, so a
/// launch does not flash white (or, where the window is see-through, the
/// desktop: see `glass::starts_opaque`).
pub const BACKGROUND: Color = include!(concat!(env!("OUT_DIR"), "/background.rs"));

/// Create the main window, hidden: the launch decides whether it is shown.
/// It is transparent only where it can have glass; elsewhere it is opaque.
/// A transparent window's page is transparent too (the window's background
/// colour does not reach it), so the page paints the tint or its theme.
pub fn create<R: Runtime>(app: &AppHandle<R>, platform: Platform) -> AppResult<()> {
    let effect = platform.glass_effect();
    let mut window = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::default())
        .title(TITLE)
        .inner_size(SIZE.0, SIZE.1)
        .min_inner_size(MIN_SIZE.0, MIN_SIZE.1)
        .visible(false)
        .transparent(effect.is_some());
    if glass::starts_opaque(effect) {
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

/// GTK tells an X window manager "not asked for by the user" (a user time of
/// 0) for a window that must not take the focus — but only the first time the
/// window is mapped. Mapped again, it carries the time of the last key or
/// click it had, and the window manager may then hand it the focus as though
/// the user had just asked for it. So the time is reset as well, and the
/// window shown, in one go on the main thread (where GTK may be touched).
#[cfg(target_os = "linux")]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    use gtk::glib::Cast;
    use gtk::prelude::{GtkWindowExt, WidgetExt};

    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(gtk_window) = target.gtk_window() else {
            return;
        };
        gtk_window.set_focus_on_map(false);
        // Only an X11 window has a user time; on Wayland the compositor decides.
        if let Some(x11) = gtk_window
            .window()
            .and_then(|w| w.downcast::<gdkx11::X11Window>().ok())
        {
            x11.set_user_time(0);
        }
        // What Tauri's `show()` does on GTK, here so that it comes after the above.
        gtk_window.show_all();
    });
}

/// Tauri's `show()` is `SW_SHOW`, which activates the window, so it is shown
/// here by the window manager directly — behind the back of Tauri's window
/// library, which goes on believing the window hidden (see `hide`).
#[cfg(windows)]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNOACTIVATE;

    if let Ok(hwnd) = window.hwnd() {
        show_window(hwnd.0, SW_SHOWNOACTIVATE);
    }
}

/// Tao's `show()` orders the window to the front without activating the app
/// (activating is what `set_focus()` adds), so the keyboard stays where it was.
#[cfg(target_os = "macos")]
fn show_without_focus<R: Runtime>(window: &WebviewWindow<R>) {
    let _ = window.show();
}

/// Hide the window to the tray.
#[cfg(not(windows))]
fn hide<R: Runtime>(window: &Window<R>) {
    let _ = window.hide();
}

/// Hide the window to the tray. Tauri's window library (tao) remembers
/// whether it last showed or hid the window and skips a `hide()` of a window
/// it believes hidden — as it does one that `show_without_focus` brought back
/// for a nudge. So the window manager is told directly as well; hiding a
/// hidden window does nothing, and both end up agreeing that it is hidden.
#[cfg(windows)]
fn hide<R: Runtime>(window: &Window<R>) {
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_HIDE;

    let _ = window.hide();
    if let Ok(hwnd) = window.hwnd() {
        show_window(hwnd.0, SW_HIDE);
    }
}

/// `ShowWindow`, for the handle of the main window.
#[cfg(windows)]
fn show_window(
    hwnd: windows_sys::Win32::Foundation::HWND,
    command: windows_sys::Win32::UI::WindowsAndMessaging::SHOW_WINDOW_CMD,
) {
    use windows_sys::Win32::UI::WindowsAndMessaging::ShowWindow;

    // SAFETY: `hwnd` is the handle of this live window, and ShowWindow may be
    // called for it from any thread.
    unsafe { ShowWindow(hwnd, command) };
}

/// Closing the window hides it while there is a tray to live in. Otherwise
/// closing it is quitting, and quitting goes the way the tray's Quit does: the
/// window stays until the frontend has saved what is pending and asked to
/// exit, or the grace period runs out (see `tray::quit`).
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    api.prevent_close();
    let close = CloseAction::for_tray(window.state::<Capabilities>().tray);
    match close {
        CloseAction::Quit => tray::quit(window.app_handle()),
        CloseAction::HideToTray => hide(window),
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
