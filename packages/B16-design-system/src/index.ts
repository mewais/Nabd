// @nabd/design-system — theme provider + presentational primitives.
// All token-driven (CSS vars from @nabd/domain THEMES); no app logic.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { ReactNode, CSSProperties } from "react";
import type { Theme, Wallpaper } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

/** Compute the CSS custom-property style object for a theme + opacity. */
export function themeVars(_theme: Theme, _opacity: number): CSSProperties {
  return NI();
}

/** Frosted/translucent root style additions for the translucent theme. */
export function rootBackgroundStyle(_theme: Theme, _opacity: number): CSSProperties {
  return NI();
}

/** Fixed full-bleed wallpaper layer style (translucent theme only). */
export function wallpaperStyle(_theme: Theme, _wallpaper: Wallpaper): CSSProperties {
  return NI();
}

export interface ThemeProviderProps {
  theme: Theme;
  opacity: number;
  wallpaper: Wallpaper;
  children: ReactNode;
}
/** Applies theme CSS vars to a wrapping element + renders the wallpaper layer. */
export function ThemeProvider(_p: ThemeProviderProps): JSX.Element {
  return NI();
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "filled" | "outline" | "ghost";
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}
export function Button(_p: ButtonProps): JSX.Element {
  return NI();
}

export interface SegOption {
  k: string;
  label: ReactNode;
}
export interface SegmentedProps {
  options: SegOption[];
  value: string;
  onChange: (k: string) => void;
  small?: boolean;
}
export function Segmented(_p: SegmentedProps): JSX.Element {
  return NI();
}

export interface StepperProps {
  label?: ReactNode;
  value: ReactNode;
  onDec: () => void;
  onInc: () => void;
}
/** Large +/- stepper (modals/settings). */
export function Stepper(_p: StepperProps): JSX.Element {
  return NI();
}

export interface MiniStepperProps {
  onDec: () => void;
  onInc: () => void;
  value: ReactNode;
}
/** Compact inline +/- used in the planner set table. */
export function MiniStepper(_p: MiniStepperProps): JSX.Element {
  return NI();
}

export interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}
export function Toggle(_p: ToggleProps): JSX.Element {
  return NI();
}

export interface PillProps {
  children: ReactNode;
  tone?: "default" | "accent" | "accent2" | "accent3";
  style?: CSSProperties;
}
export function Pill(_p: PillProps): JSX.Element {
  return NI();
}

export interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
}
export function Card(_p: CardProps): JSX.Element {
  return NI();
}

export interface BadgeProps {
  children: ReactNode;
  tone?: "accent" | "accent2" | "accent3" | "muted";
}
export function Badge(_p: BadgeProps): JSX.Element {
  return NI();
}

export interface DonutProps {
  /** 0–100 progress. */
  pct: number;
  done: number;
  total: number;
  caption?: ReactNode;
}
/** Conic-gradient progress ring (sidebar day donut). */
export function Donut(_p: DonutProps): JSX.Element {
  return NI();
}

/** Pulsing live status dot. */
export function LiveDot(_p: { active: boolean }): JSX.Element {
  return NI();
}

export type IconName =
  | "today"
  | "plan"
  | "progress"
  | "settings"
  | "bolt"
  | "check"
  | "close"
  | "chevron"
  | "trophy"
  | "heart"
  | "home"
  | "download"
  | "upload";
export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
}
/** Feather-style stroke icons + the Nabd heart logo. */
export function Icon(_p: IconProps): JSX.Element {
  return NI();
}
