//! KWin's blur behind an X11 window: KWin blurs what is behind a window that
//! carries the `_KDE_NET_WM_BLUR_BEHIND_REGION` property — a list of
//! rectangles (x, y, width, height), the whole window when the list is empty
//! — and stops once the property is gone. Other window managers ignore it.

use gtk::gdk::{self, Atom, ChangeData, PropMode};
use gtk::glib::object::ObjectExt;
use gtk::prelude::WidgetExt;
use tauri::{Runtime, WebviewWindow};

const BLUR_REGION: &str = "_KDE_NET_WM_BLUR_BEHIND_REGION";
const CARDINAL: &str = "CARDINAL";
/// The property holds 32-bit numbers.
const FORMAT: i32 = 32;
/// No rectangles: blur behind the whole window.
const WHOLE_WINDOW: &[std::os::raw::c_ulong] = &[];

/// Ask KWin to blur behind the window, or to stop. GDK may only be touched on
/// the main thread, so this is queued there. A window that is not an X11 one
/// (`Compositor::KWinX11` is only decided for those) is left alone.
pub fn set_blur_behind<R: Runtime>(window: &WebviewWindow<R>, blur: bool) {
    let target = window.clone();
    // Fails only once the event loop is gone, when there is no window to blur.
    let _ = window.run_on_main_thread(move || {
        let Some(x11) = target
            .gtk_window()
            .ok()
            .and_then(|gtk_window| gtk_window.window())
            .filter(|w| w.is::<gdkx11::X11Window>())
        else {
            return;
        };
        let property = Atom::intern(BLUR_REGION);
        if blur {
            gdk::property_change(
                &x11,
                &property,
                &Atom::intern(CARDINAL),
                FORMAT,
                PropMode::Replace,
                ChangeData::ULongs(WHOLE_WINDOW),
            );
        } else {
            gdk::property_delete(&x11, &property);
        }
    });
}
