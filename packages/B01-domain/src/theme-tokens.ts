import type { Theme, Wallpaper, Material } from "./settings";
import { GLASS_OPACITY } from "./settings";

/**
 * The four materials: two solid themes (light/dark) and their glass variants.
 * Glass materials re-specify tokens for legibility against the tint (NOT the
 * wallpaper). Their `--bg` here is the floor-opacity tint as a fallback; the live
 * tint is computed from the opacity setting via `glassTint()`. Verbatim from the
 * design handoff.
 */
export const THEMES: Record<Material, Record<string, string>> = {
  light: {
    "--bg": "oklch(0.97 0.003 250)",
    "--surface": "oklch(1 0 0)",
    "--surface2": "oklch(0.955 0.004 250)",
    "--line": "oklch(0.9 0.005 250)",
    "--text": "oklch(0.24 0.01 255)",
    "--text2": "oklch(0.5 0.012 255)",
    "--text3": "oklch(0.66 0.01 255)",
    "--accent": "oklch(0.6 0.16 45)",
    "--accent2": "oklch(0.62 0.13 155)",
    "--accent3": "oklch(0.58 0.12 255)",
    "--map-muscle": "oklch(0.86 0.006 250)",
    "--glow": "none",
    "--cardshadow": "0 1px 2px rgba(0,0,0,0.04)",
  },
  dark: {
    "--bg": "oklch(0.21 0.014 265)",
    "--surface": "oklch(0.25 0.016 265)",
    "--surface2": "oklch(0.295 0.018 265)",
    "--line": "oklch(0.36 0.018 265)",
    "--text": "oklch(0.96 0.01 265)",
    "--text2": "oklch(0.74 0.014 265)",
    "--text3": "oklch(0.58 0.014 265)",
    "--accent": "oklch(0.7 0.16 48)",
    "--accent2": "oklch(0.72 0.13 158)",
    "--accent3": "oklch(0.7 0.12 252)",
    "--map-muscle": "oklch(0.42 0.02 265)",
    "--glow": "none",
    "--cardshadow": "0 1px 2px rgba(0,0,0,0.2)",
  },
  lightGlass: {
    "--bg": "rgba(244,246,251,0.6)",
    "--surface": "rgba(255,255,255,0.62)",
    "--surface2": "rgba(24,28,40,0.06)",
    "--line": "rgba(20,24,35,0.16)",
    "--text": "oklch(0.2 0.012 260)",
    "--text2": "oklch(0.38 0.014 260)",
    "--text3": "oklch(0.5 0.014 260)",
    "--accent": "oklch(0.53 0.18 42)",
    "--accent2": "oklch(0.5 0.14 158)",
    "--accent3": "oklch(0.5 0.14 255)",
    "--map-muscle": "rgba(34,38,52,0.18)",
    "--glow": "inset 0 1px 0 rgba(255,255,255,0.55)",
    "--cardshadow": "0 6px 22px rgba(20,28,48,0.16)",
  },
  darkGlass: {
    "--bg": "rgba(15,17,24,0.5)",
    "--surface": "rgba(255,255,255,0.075)",
    "--surface2": "rgba(255,255,255,0.135)",
    "--line": "rgba(255,255,255,0.18)",
    "--text": "rgba(255,255,255,0.98)",
    "--text2": "rgba(255,255,255,0.78)",
    "--text3": "rgba(255,255,255,0.6)",
    "--accent": "oklch(0.72 0.17 48)",
    "--accent2": "oklch(0.76 0.14 158)",
    "--accent3": "oklch(0.74 0.14 252)",
    "--map-muscle": "rgba(255,255,255,0.2)",
    "--glow": "inset 0 1px 0 rgba(255,255,255,0.14)",
    "--cardshadow": "0 6px 22px rgba(0,0,0,0.28)",
  },
};

/** Glass tint base RGB per theme (alpha comes from the opacity slider). */
export const GLASS_TINT_RGB: Record<Theme, string> = {
  light: "244,246,251",
  dark: "15,17,24",
};

export const GLASS_FROST = "blur(34px) saturate(1.7)";

/** The live glass tint `rgba(...)` for a theme + requested opacity (floor-clamped). */
export function glassTint(theme: Theme, opacity: number): string {
  const { floor, max } = GLASS_OPACITY[theme];
  const op = Math.max(floor, Math.min(max, opacity));
  return `rgba(${GLASS_TINT_RGB[theme]},${op})`;
}

/** Preview wallpapers (verbatim from the design handoff). */
export const WALLPAPERS: Record<Wallpaper, string> = {
  aurora:
    "radial-gradient(120% 120% at 18% 8%, #1d4e6b 0%, #16324a 36%, #0d1b2e 70%, #07101f 100%), radial-gradient(80% 90% at 88% 22%, rgba(86,180,160,0.55), transparent 60%)",
  dusk: "radial-gradient(120% 120% at 80% 10%, #6a3a6e 0%, #3f2a55 42%, #221a36 78%, #140f22 100%), radial-gradient(70% 80% at 12% 86%, rgba(214,119,87,0.5), transparent 60%)",
  slate: "linear-gradient(140deg, #20242e 0%, #161922 55%, #0e1016 100%)",
  mesh: "radial-gradient(60% 70% at 20% 20%, #2b5e8c, transparent 60%), radial-gradient(55% 65% at 82% 18%, #6b3f86, transparent 60%), radial-gradient(70% 70% at 70% 88%, #1f7a63, transparent 60%), linear-gradient(135deg, #0e1626, #161226)",
  sand: "radial-gradient(120% 120% at 15% 12%, #fbe7cf 0%, #f3d3ad 40%, #e7b98a 72%, #d99a6c 100%), radial-gradient(70% 80% at 88% 20%, rgba(255,255,255,0.6), transparent 60%)",
  frost:
    "radial-gradient(120% 120% at 20% 10%, #eef3fb 0%, #d8e4f3 44%, #bfd0e8 74%, #a7bcde 100%), radial-gradient(65% 75% at 85% 85%, rgba(255,255,255,0.7), transparent 60%)",
  mixed: "linear-gradient(120deg, #0e1626 0%, #2b3a55 38%, #c9b89a 62%, #f1e4cf 100%)",
};

export const TRANSLUCENT_FROST = GLASS_FROST;
