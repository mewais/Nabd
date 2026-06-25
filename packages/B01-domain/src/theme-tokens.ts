import type { Theme, Wallpaper } from "./settings";

/** CSS custom-property values per theme (verbatim from the design handoff). */
export const THEMES: Record<Theme, Record<string, string>> = {
  translucent: {
    "--bg": "rgba(22,24,32,0.55)",
    "--surface": "rgba(255,255,255,0.07)",
    "--surface2": "rgba(255,255,255,0.13)",
    "--line": "rgba(255,255,255,0.16)",
    "--text": "rgba(255,255,255,0.96)",
    "--text2": "rgba(255,255,255,0.72)",
    "--text3": "rgba(255,255,255,0.5)",
    "--accent": "oklch(0.74 0.16 48)",
    "--accent2": "oklch(0.76 0.13 158)",
    "--accent3": "oklch(0.74 0.12 252)",
    "--map-muscle": "rgba(255,255,255,0.18)",
  },
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
  },
};

/** Wallpaper CSS backgrounds (verbatim from the design handoff). */
export const WALLPAPERS: Record<Wallpaper, string> = {
  aurora:
    "radial-gradient(120% 120% at 18% 8%, #1d4e6b 0%, #16324a 36%, #0d1b2e 70%, #07101f 100%), radial-gradient(80% 90% at 88% 22%, rgba(86,180,160,0.55), transparent 60%)",
  dusk: "radial-gradient(120% 120% at 80% 10%, #6a3a6e 0%, #3f2a55 42%, #221a36 78%, #140f22 100%), radial-gradient(70% 80% at 12% 86%, rgba(214,119,87,0.5), transparent 60%)",
  mesh: "radial-gradient(60% 70% at 20% 20%, #2b5e8c, transparent 60%), radial-gradient(55% 65% at 82% 18%, #6b3f86, transparent 60%), radial-gradient(70% 70% at 70% 88%, #1f7a63, transparent 60%), linear-gradient(135deg, #0e1626, #161226)",
  slate: "linear-gradient(140deg, #20242e 0%, #161922 55%, #0e1016 100%)",
};

export const TRANSLUCENT_FROST = "blur(36px) saturate(1.5)";
