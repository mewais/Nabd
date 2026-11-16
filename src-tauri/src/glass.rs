//! The translucent ("Glass") window: one native backdrop effect per OS build,
//! chosen in `nabd-native`, applied through Tauri's window-effects API. The
//! tint and its opacity are painted by the frontend, so no colour is set here.

use nabd_native::{GlassEffect, Platform};
use tauri::window::{Effect, EffectsBuilder};
use tauri::{AppHandle, Manager, Runtime};

use crate::error::AppResult;
use crate::window;

/// Put the backdrop effect on the main window, or take it off again. Where
/// the platform has no effect this clears, which does nothing.
pub fn set<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> AppResult<()> {
    let Some(window) = window::main_window(app) else {
        return Ok(());
    };
    let effect = app.state::<Platform>().glass_effect().filter(|_| enabled);
    window
        .set_effects(effect.map(|effect| EffectsBuilder::new().effect(native(effect)).build()))?;
    Ok(())
}

fn native(effect: GlassEffect) -> Effect {
    match effect {
        GlassEffect::Mica => Effect::Mica,
        GlassEffect::Blur => Effect::Blur,
    }
}
