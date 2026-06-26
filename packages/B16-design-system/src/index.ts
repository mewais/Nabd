// @nabd/design-system — theme provider + presentational primitives.
// All token-driven (CSS vars from @nabd/domain THEMES); no app logic.

import React from "react";
import type { ReactNode, CSSProperties } from "react";
import type { Theme, Wallpaper } from "@nabd/domain";
import { THEMES, WALLPAPERS, GLASS_FROST, materialKey, glassTint } from "@nabd/domain";

/** CSS custom-property style object for a theme + glass flag (the active material). */
export function themeVars(_theme: Theme, _glass: boolean): CSSProperties {
  return THEMES[materialKey(_theme, _glass)] as CSSProperties;
}

/** Root background: solid `var(--bg)`, or the floor-clamped glass tint + frost. */
export function rootBackgroundStyle(_theme: Theme, _glass: boolean, _opacity: number): CSSProperties {
  if (_glass) {
    return {
      background: glassTint(_theme, _opacity),
      backdropFilter: GLASS_FROST,
      WebkitBackdropFilter: GLASS_FROST,
    };
  }
  return { background: "var(--bg)" };
}

/** Fixed full-bleed wallpaper layer (only shown under glass). */
export function wallpaperStyle(_theme: Theme, _glass: boolean, _wallpaper: Wallpaper): CSSProperties {
  if (_glass) {
    return {
      position: "fixed",
      inset: 0,
      zIndex: 0,
      background: WALLPAPERS[_wallpaper],
      backgroundSize: "cover",
      display: "block",
    };
  }
  return { display: "none" };
}

export interface ThemeProviderProps {
  theme: Theme;
  glass: boolean;
  opacity: number;
  children?: ReactNode;
}
/**
 * Applies the active material's CSS vars + background. In glass mode the root is
 * a semi-opaque tint (no opaque wallpaper) so the **real OS desktop** shows
 * through the transparent window (frosted by native vibrancy); in solid mode it
 * paints `var(--bg)`.
 */
export function ThemeProvider(_p: ThemeProviderProps): JSX.Element {
  const vars = themeVars(_p.theme, _p.glass);
  const bg = rootBackgroundStyle(_p.theme, _p.glass, _p.opacity);
  return React.createElement(
    "div",
    {
      "data-theme": _p.theme,
      "data-glass": _p.glass ? "on" : "off",
      style: {
        ...vars,
        ...bg,
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        color: "var(--text)",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      },
    },
    _p.children,
  );
}

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "filled" | "outline" | "ghost";
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}
export function Button(_p: ButtonProps): JSX.Element {
  const { children, onClick, variant = "filled", disabled, title, style } = _p;

  let baseStyle: CSSProperties;
  if (variant === "filled") {
    baseStyle = {
      background: "var(--accent)",
      color: "#fff",
      border: "none",
    };
  } else if (variant === "outline") {
    baseStyle = {
      background: "transparent",
      border: "1px solid var(--accent)",
    };
  } else {
    baseStyle = {
      background: "transparent",
      border: "none",
    };
  }

  return React.createElement(
    "button",
    {
      style: { ...baseStyle, ...style },
      onClick: disabled ? undefined : onClick,
      disabled,
      title,
    },
    children,
  );
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
  const { options, value, onChange, small } = _p;
  // Match the design: a surface2 container with a 1px line border; the active
  // option is filled accent (white text), inactive is transparent (text2).
  const padding = small ? "5px 9px" : "6px 12px";

  const buttons = options.map((opt) => {
    const isActive = opt.k === value;
    return React.createElement(
      "button",
      {
        key: opt.k,
        "aria-pressed": isActive,
        "data-active": isActive ? "true" : undefined,
        onClick: () => onChange(opt.k),
        style: {
          padding,
          borderRadius: small ? 7 : 8,
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: small ? "11.5px" : "12.5px",
          fontWeight: 600,
          background: isActive ? "var(--accent)" : "transparent",
          color: isActive ? "#fff" : "var(--text2)",
        },
      },
      opt.label,
    );
  });

  return React.createElement(
    "div",
    {
      "data-segmented": "true",
      style: {
        display: "inline-flex",
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: small ? 9 : 10,
        padding: 3,
        gap: 2,
      },
    },
    ...buttons,
  );
}

export interface StepperProps {
  label?: ReactNode;
  value: ReactNode;
  onDec: () => void;
  onInc: () => void;
}
/** Large +/- stepper (modals/settings). */
export function Stepper(_p: StepperProps): JSX.Element {
  const { label, value, onDec, onInc } = _p;

  const children: ReactNode[] = [];
  if (label !== undefined) {
    children.push(React.createElement("div", { key: "label" }, label));
  }
  children.push(
    React.createElement(
      "div",
      { key: "controls", style: { display: "flex", alignItems: "center", gap: 8 } },
      React.createElement("button", { key: "dec", onClick: onDec }, "−"),
      React.createElement("span", { key: "val" }, value),
      React.createElement("button", { key: "inc", onClick: onInc }, "+"),
    ),
  );

  return React.createElement("div", null, ...children);
}

export interface MiniStepperProps {
  onDec: () => void;
  onInc: () => void;
  value: ReactNode;
}
/** Compact inline +/- used in the planner set table. */
export function MiniStepper(_p: MiniStepperProps): JSX.Element {
  const { value, onDec, onInc } = _p;
  return React.createElement(
    "div",
    { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
    React.createElement("button", { onClick: onDec }, "−"),
    React.createElement("span", null, value),
    React.createElement("button", { onClick: onInc }, "+"),
  );
}

export interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}
export function Toggle(_p: ToggleProps): JSX.Element {
  const { on, onChange } = _p;
  return React.createElement(
    "button",
    {
      role: "switch",
      "aria-checked": on,
      "data-on": on ? "true" : "false",
      onClick: () => onChange(!on),
      style: {
        position: "relative",
        width: 40,
        height: 24,
        borderRadius: 12,
        background: on ? "var(--accent)" : "var(--surface2)",
        border: "none",
        cursor: "pointer",
        padding: 0,
      },
    },
    React.createElement("span", {
      style: {
        position: "absolute",
        top: 2,
        left: on ? 18 : 2,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
      },
    }),
  );
}

export interface PillProps {
  children: ReactNode;
  tone?: "default" | "accent" | "accent2" | "accent3";
  style?: CSSProperties;
}
export function Pill(_p: PillProps): JSX.Element {
  const { children, tone = "default", style } = _p;

  let color: string;
  if (tone === "accent") {
    color = "var(--accent)";
  } else if (tone === "accent2") {
    color = "var(--accent2)";
  } else if (tone === "accent3") {
    color = "var(--accent3)";
  } else {
    color = "var(--text2)";
  }

  return React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        background: color,
        ...style,
      },
    },
    children,
  );
}

export interface CardProps {
  children?: ReactNode;
  style?: CSSProperties;
}
export function Card(_p: CardProps): JSX.Element {
  const { children, style } = _p;
  return React.createElement(
    "div",
    {
      style: {
        background: "var(--surface)",
        borderRadius: 12,
        padding: 16,
        ...style,
      },
    },
    children,
  );
}

export interface BadgeProps {
  children: ReactNode;
  tone?: "accent" | "accent2" | "accent3" | "muted";
}
export function Badge(_p: BadgeProps): JSX.Element {
  const { children, tone } = _p;

  let color: string;
  if (tone === "accent") {
    color = "var(--accent)";
  } else if (tone === "accent2") {
    color = "var(--accent2)";
  } else if (tone === "accent3") {
    color = "var(--accent3)";
  } else if (tone === "muted") {
    color = "var(--text3)";
  } else {
    color = "var(--text2)";
  }

  return React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 4,
        background: color,
        fontSize: "0.75rem",
      },
    },
    children,
  );
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
  const { pct, done, total, caption } = _p;

  const children: ReactNode[] = [
    React.createElement("span", { key: "done" }, done),
    React.createElement("span", { key: "total" }, total),
  ];

  if (caption !== undefined) {
    children.push(React.createElement("span", { key: "caption" }, caption));
  }

  return React.createElement(
    "div",
    {
      style: {
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: `conic-gradient(var(--accent) ${pct}%, var(--surface2) ${pct}%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    ...children,
  );
}

/** Pulsing live status dot. */
export function LiveDot(_p: { active: boolean }): JSX.Element {
  const { active } = _p;
  return React.createElement("span", {
    "data-active": active ? "true" : "false",
    style: {
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: active ? "var(--accent)" : "var(--text3)",
      animation: active ? "pulse 1.5s ease-in-out infinite" : undefined,
    },
  });
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

const ICON_PATHS: Record<IconName, string> = {
  today:
    "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 13h4M8 17h8",
  plan: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2H9zM9 12h6M9 16h4",
  progress:
    "M3 3v18h18M7 16l4-4 4 4 4-8",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18M6 6l12 12",
  chevron: "M9 18l6-6-6-6",
  trophy:
    "M6 9H3l1 6h2m14-6h3l-1 6h-2M6 9V5h12v4M6 9a6 6 0 0 0 12 0M9 21h6M12 17v4",
  heart:
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
};

/** Feather-style stroke icons + the Nabd heart logo. */
export function Icon(_p: IconProps): JSX.Element {
  const { name, size = 24, stroke = "currentColor" } = _p;
  const d = ICON_PATHS[name];

  return React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke,
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    React.createElement("path", { d }),
  );
}
