// Theme materials: the CSS custom properties every primitive paints with.

import type { CSSProperties } from "react";
import type { Theme } from "@nabd/domain";
import { COLOR } from "./tokens";
import prepaint from "../prepaint.json";

type ThemeToken =
  | "--bg"
  | "--surface"
  | "--surface2"
  | "--line"
  | "--text"
  | "--text2"
  | "--text3"
  | "--accent"
  | "--accent2"
  | "--accent3"
  | "--map-muscle"
  | "--cardshadow"
  | "--modal-bg";

type Material = Record<ThemeToken, string>;

/**
 * The dark theme's background: also what the window shows before the app has
 * painted, so a launch does not flash white. It is written in prepaint.json,
 * beside this package's manifest, which the build reads as well: for the
 * page's prepaint (packages/app/vite.config.ts) and the native window's
 * background (src-tauri/build.rs).
 */
const DARK_BACKGROUND = prepaint.background;

/**
 * Each theme comes as a solid material and a glass one. Glass re-specifies the
 * tokens for legibility over the translucent window tint, which it paints in
 * place of `--bg`: `glassTintRgb`, at the strength the opacity setting gives.
 */
const MATERIALS: Record<
  Theme,
  { solid: Material; glass: Omit<Material, "--bg">; glassTintRgb: string }
> = {
  light: {
    solid: {
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
      "--cardshadow": "0 1px 2px rgba(0,0,0,0.04)",
      "--modal-bg": "oklch(1 0 0)",
    },
    glass: {
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
      "--cardshadow": "0 6px 22px rgba(20,28,48,0.16)",
      "--modal-bg": "rgba(244,246,251,0.95)",
    },
    glassTintRgb: "244,246,251",
  },
  dark: {
    solid: {
      "--bg": DARK_BACKGROUND,
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
      "--cardshadow": "0 1px 2px rgba(0,0,0,0.2)",
      "--modal-bg": "oklch(0.25 0.016 265)",
    },
    glass: {
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
      "--cardshadow": "0 6px 22px rgba(0,0,0,0.28)",
      "--modal-bg": "rgba(22,24,32,0.94)",
    },
    glassTintRgb: "15,17,24",
  },
};

const GLASS_FROST = "blur(34px) saturate(1.7)";

/**
 * The root style for a theme: its material's CSS variables plus the window
 * background. Solid paints `--bg`; glass paints a frosted tint whose strength
 * is `opacity`, so the desktop behind the transparent window shows through.
 */
export function themeStyle(theme: Theme, glass: boolean, opacity: number): CSSProperties {
  const { solid, glass: glassMaterial, glassTintRgb } = MATERIALS[theme];
  if (!glass) return { ...solid, background: COLOR.bg };
  return {
    ...glassMaterial,
    background: `rgba(${glassTintRgb},${opacity})`,
    backdropFilter: GLASS_FROST,
    WebkitBackdropFilter: GLASS_FROST,
  };
}
