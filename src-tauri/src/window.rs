//! The main window: bringing it forward, showing it discreetly, and what
//! closing it means.
//!
//! Window calls can only fail once the window or the event loop is gone (the
//! app is shutting down), so their results are deliberately dropped.

use nabd_native::{close_action, Capabilities, CloseAction};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow, Window, WindowEvent};

const MAIN_WINDOW: &str = "main";

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

/// macOS (not a supported target yet): plain `show()`, which does not
/// activate the app.
#[cfg(not(any(target_os = "linux", windows)))]
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
    if close_action(tray) == CloseAction::HideToTray {
        api.prevent_close();
        let _ = window.hide();
    }
}
