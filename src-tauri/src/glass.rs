//! The translucent ("Glass") window: one native backdrop effect per OS build,
//! chosen in `nabd-native`, applied through Tauri's window-effects API. The
//! tint and its opacity are painted by the frontend, so no colour is set here.

use nabd_native::{glass_effect, GlassEffect};
use tauri::window::{Effect, EffectsBuilder};
use tauri::{AppHandle, Runtime};

use crate::{platform, window};

/// Put the backdrop effect on the main window, or take it off again. Where
/// the platform has no effect this clears, which does nothing.
pub fn set<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> tauri::Result<()> {
    let Some(window) = window::main_window(app) else {
        return Ok(());
    };
    let effect = glass_effect(platform::current()).filter(|_| enabled);
    window.set_effects(effect.map(|effect| EffectsBuilder::new().effect(native(effect)).build()))
}

fn native(effect: GlassEffect) -> Effect {
    match effect {
        GlassEffect::Mica => Effect::Mica,
        GlassEffect::Blur => Effect::Blur,
    }
}
