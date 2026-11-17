//! The translucent ("Glass") window: one backdrop effect per platform, chosen
//! in `nabd-native`. Windows' and macOS's are applied through Tauri's
//! window-effects API, which has nothing for Linux: there the window itself
//! turns see-through, and KWin is asked for its blur. The tint and its opacity
//! are painted by the frontend, so no colour of it is set here.

use nabd_native::{GlassEffect, Platform};
use tauri::window::{Effect, EffectsBuilder};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

use crate::error::AppResult;
use crate::window;

#[cfg(target_os = "linux")]
mod kwin;

/// How an effect gets onto the window.
enum Route {
    /// A material the OS draws behind the window, through Tauri.
    WindowEffect(Effect),
    /// The window's own background is dropped so the desktop shows through;
    /// with `kwin_blur`, KWin is also asked to blur it.
    SeeThrough { kwin_blur: bool },
}

impl From<GlassEffect> for Route {
    fn from(effect: GlassEffect) -> Self {
        match effect {
            GlassEffect::Acrylic => Self::WindowEffect(Effect::Acrylic),
            GlassEffect::Blur => Self::WindowEffect(Effect::Blur),
            GlassEffect::Vibrancy => Self::WindowEffect(Effect::UnderWindowBackground),
            GlassEffect::KWinBlur => Self::SeeThrough { kwin_blur: true },
            GlassEffect::Transparent => Self::SeeThrough { kwin_blur: false },
        }
    }
}

/// Whether the window is created with an opaque background (`window::BACKGROUND`):
/// for good where it has no glass, and until Glass is turned on where it goes
/// see-through by itself, so that a launch never flashes the desktop through
/// a page that has not painted yet.
pub fn starts_opaque(effect: Option<GlassEffect>) -> bool {
    !matches!(effect.map(Route::from), Some(Route::WindowEffect(_)))
}

/// Put the backdrop effect on the main window, or take it off again. Where
/// the platform has no effect this does nothing.
pub fn set<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> AppResult<()> {
    let Some(window) = window::main_window(app) else {
        return Ok(());
    };
    let Some(effect) = app.state::<Platform>().glass_effect() else {
        return Ok(());
    };
    match Route::from(effect) {
        Route::WindowEffect(effect) => {
            window.set_effects(enabled.then(|| EffectsBuilder::new().effect(effect).build()))?;
        }
        Route::SeeThrough { kwin_blur } => see_through(&window, enabled, kwin_blur)?,
    }
    Ok(())
}

/// The page is transparent (see `window::create`) and paints the tint, or its
/// opaque theme, so what the desktop needs to show through is the window's
/// own background gone. Only the window layer's is set: setting the webview
/// window's would make the page opaque as well.
#[cfg_attr(not(target_os = "linux"), allow(unused_variables))]
fn see_through<R: Runtime>(
    window: &WebviewWindow<R>,
    enabled: bool,
    kwin_blur: bool,
) -> AppResult<()> {
    let background = (!enabled).then_some(window::BACKGROUND);
    window.as_ref().window().set_background_color(background)?;
    #[cfg(target_os = "linux")]
    if kwin_blur {
        kwin::set_blur_behind(window, enabled);
    }
    Ok(())
}
