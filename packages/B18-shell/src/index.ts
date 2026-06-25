// @nabd/shell — app chrome: sidebar, top bar, layout. Props-driven (the app
// wires store state/actions to these). Small pure helpers for greeting/clock.

import React from "react";
import type { ReactNode } from "react";
import type { Theme, Wallpaper } from "@nabd/domain";
import {
  LiveDot,
  Icon,
  ThemeProvider,
} from "@nabd/design-system";

export type Screen = "today" | "planner" | "progress";

/** "Good morning/afternoon/evening" from an hour (0-23). */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "MONDAY · Jun 24" style date string. */
export function formatDate(now: Date): string {
  const day = WEEKDAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();
  return `${day} · ${month} ${date}`;
}

/** "HH:MM" 24h clock. */
export function formatClock(now: Date): string {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** "M:SS" from seconds (for next/idle). */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export interface SidebarProps {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  setsDone: number;
  setsTotal: number;
  /** 0-100 ring fill. */
  pct: number;
  caption: string;
}

const NAV_ITEMS: Array<{ key: Screen; label: string; icon: "today" | "plan" | "progress" }> = [
  { key: "today", label: "Today", icon: "today" },
  { key: "planner", label: "Plan", icon: "plan" },
  { key: "progress", label: "Progress", icon: "progress" },
];

export function Sidebar(p: SidebarProps): JSX.Element {
  const { screen, onNavigate, setsDone, setsTotal, pct, caption } = p;
  const navLabelSet = new Set(NAV_ITEMS.map((item) => item.label));
  const donutCaption = navLabelSet.has(caption) ? undefined : caption;

  const navButtons = NAV_ITEMS.map((item) => {
    const isActive = screen === item.key;
    return React.createElement(
      "button",
      {
        key: item.key,
        "data-active": isActive ? "true" : undefined,
        "aria-current": isActive ? "page" : undefined,
        onClick: () => onNavigate(item.key),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "11px 18px",
          background: isActive ? "var(--surface2)" : "transparent",
          border: "none",
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontSize: 14,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? "var(--text)" : "var(--text2)",
          cursor: "pointer",
          textAlign: "left",
          boxShadow: isActive ? "inset 3px 0 0 var(--accent)" : "inset 3px 0 0 transparent",
          transition: "background 0.14s ease, color 0.14s ease",
          borderRadius: 0,
        },
      },
      React.createElement(Icon, {
        name: item.icon,
        size: 18,
        stroke: isActive ? "var(--accent)" : "currentColor",
      }),
      React.createElement("span", null, item.label),
    );
  });

  // Brand lockup: accent rounded square with anatomical heart SVG
  const brandLockup = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "2px 6px 20px",
      },
    },
    // Accent rounded square with heart SVG
    React.createElement(
      "div",
      {
        style: {
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        },
      },
      React.createElement(
        "svg",
        {
          width: 22,
          height: 25,
          viewBox: "0 0 32 36",
          fill: "none",
        },
        React.createElement("path", {
          d: "M17.5 33.8 C12.8 33.2 5.3 28 4 20.6 C3.3 16.8 4.6 12.6 8.6 12.2 C12.4 11.8 16.4 12 20.2 12.1 C24 12.2 26.8 14.6 26.7 18.4 C26.6 23.2 22.8 28.4 19 31.6 C18.4 32.2 17.9 33 17.5 33.8 Z",
          fill: "#fff",
        }),
        React.createElement("path", {
          d: "M10.8 12 C10.2 9.2 10.1 7.4 10.4 5.8",
          stroke: "#fff",
          strokeWidth: 4,
          strokeLinecap: "round",
        }),
        React.createElement("path", {
          d: "M15 12.3 C14.8 9.4 15 7.4 15.6 5.9",
          stroke: "#fff",
          strokeWidth: 4,
          strokeLinecap: "round",
        }),
        React.createElement("path", {
          d: "M18.9 12.1 C19.4 8.7 21 6 24 5.4",
          stroke: "#fff",
          strokeWidth: 4.4,
          strokeLinecap: "round",
        }),
        React.createElement("path", {
          d: "M15.6 14.6 C15 19 14.9 25 16.2 31",
          stroke: "var(--accent)",
          strokeWidth: 1.5,
          strokeLinecap: "round",
        }),
        React.createElement("path", {
          d: "M15.3 22.6 C13.7 24.6 12.7 27 12.3 29.4",
          stroke: "var(--accent)",
          strokeWidth: 1.3,
          strokeLinecap: "round",
        }),
        React.createElement("path", {
          d: "M19.4 14.8 C20.6 18 20.8 22 19.7 26",
          stroke: "var(--accent)",
          strokeWidth: 1.3,
          strokeLinecap: "round",
        }),
        React.createElement("circle", {
          cx: 10.4,
          cy: 5.6,
          r: 1.35,
          fill: "var(--accent)",
        }),
        React.createElement("circle", {
          cx: 24.2,
          cy: 5.3,
          r: 1.45,
          fill: "var(--accent)",
        }),
      ),
    ),
    // Name + version
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        {
          style: {
            fontWeight: 800,
            fontSize: 19,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            color: "var(--text)",
          },
        },
        "Nabd ",
        React.createElement("span", { style: { opacity: 0.4, fontWeight: 600 } }, "·"),
        " ",
        React.createElement("span", { style: { letterSpacing: 0, fontWeight: 700 } }, "نبض"),
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 10.5,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            marginTop: 3,
          },
        },
        "PULSE · v0.1",
      ),
    ),
  );

  // Donut section at bottom
  const donutSection = React.createElement(
    "div",
    {
      style: {
        marginTop: "auto",
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 15,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 11,
      },
    },
    // Ring: outer conic gradient
    React.createElement(
      "div",
      {
        style: {
          width: 108,
          height: 108,
          borderRadius: "50%",
          background: `conic-gradient(var(--accent) ${pct}%, var(--surface2) ${pct}%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1,
              color: "var(--text)",
            },
          },
          setsDone,
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10.5,
              color: "var(--text3)",
            },
          },
          `of ${setsTotal} sets`,
        ),
      ),
    ),
    donutCaption !== undefined &&
      React.createElement(
        "div",
        {
          style: {
            fontSize: 12,
            color: "var(--text2)",
            textAlign: "center",
            lineHeight: 1.4,
          },
        },
        donutCaption,
      ),
  );

  return React.createElement(
    "div",
    {
      style: {
        width: 250,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface)",
        borderRight: "1px solid var(--line)",
        padding: "22px 18px",
        gap: 6,
        boxSizing: "border-box",
      },
    },
    brandLockup,
    // Nav buttons
    React.createElement("nav", { style: { display: "flex", flexDirection: "column" } }, ...navButtons),
    donutSection,
  );
}

export interface TopBarProps {
  greeting: string;
  dateStr: string;
  clockStr: string;
  nextStr: string;
  idleStr: string;
  idleActive: boolean;
  notifActive: boolean;
  theme: Theme;
  onTheme: (t: Theme) => void;
  /** Whether the glass/translucency mode is currently on. */
  glass: boolean;
  /** Called when the Glass toggle button is clicked. */
  onToggleGlass: () => void;
  onOpenSettings: () => void;
}

const THEME_OPTIONS = [
  { k: "light", label: "Light" },
  { k: "dark", label: "Dark" },
];

export function TopBar(p: TopBarProps): JSX.Element {
  const {
    greeting: greetingText,
    dateStr,
    clockStr,
    nextStr,
    idleStr,
    idleActive,
    notifActive,
    theme,
    onTheme,
    glass,
    onToggleGlass,
    onOpenSettings,
  } = p;

  // Status pill separator
  const separator = React.createElement("span", {
    style: {
      width: 1,
      height: 14,
      background: "var(--line)",
      display: "inline-block",
    },
  });

  return React.createElement(
    "header",
    {
      style: {
        height: 66,
        flexShrink: 0,
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 26px",
        background: "var(--surface)",
      },
    },
    // Left: greeting + date (mono date)
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 2 } },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          },
        },
        greetingText,
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 11.5,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
          },
        },
        dateStr,
      ),
    ),
    // Center: status pill
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 13,
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 11,
          padding: "8px 15px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12.5,
        },
      },
      // clock with LiveDot
      React.createElement(
        "span",
        { style: { display: "flex", alignItems: "center", gap: 7 } },
        React.createElement(LiveDot, { active: notifActive }),
        clockStr,
      ),
      separator,
      // next timer
      React.createElement(
        "span",
        { style: { color: "var(--text3)" } },
        "next ",
        React.createElement(
          "span",
          { style: { color: "var(--text)", fontWeight: 600 } },
          nextStr,
        ),
      ),
      separator,
      // idle
      React.createElement(
        "span",
        {
          "data-idle-active": idleActive ? "true" : undefined,
          style: {
            color: idleActive ? "var(--accent)" : "var(--text3)",
          },
        },
        `idle ${idleStr}`,
      ),
    ),
    // Right: theme segmented + Glass button + settings
    React.createElement(
      "div",
      { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 } },
      // Light/Dark segmented control
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            background: "var(--surface2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 3,
            gap: 2,
          },
        },
        ...THEME_OPTIONS.map((opt) => {
          const isActive = opt.k === theme;
          return React.createElement(
            "button",
            {
              key: opt.k,
              "aria-pressed": isActive,
              "data-active": isActive ? "true" : undefined,
              onClick: () => onTheme(opt.k as Theme),
              style: {
                padding: "4px 12px",
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#fff" : "var(--text2)",
                border: "none",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                cursor: "pointer",
                transition: "background 0.14s ease",
              },
            },
            opt.label,
          );
        }),
      ),
      // Glass toggle button
      React.createElement(
        "button",
        {
          onClick: onToggleGlass,
          title: "Translucent window",
          "data-glass-active": glass ? "true" : "false",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 13px",
            height: 40,
            background: glass ? "var(--accent)" : "var(--surface2)",
            color: glass ? "#fff" : "var(--text2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            fontSize: 12.5,
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            fontWeight: glass ? 600 : 400,
            cursor: "pointer",
            transition: "background 0.14s ease, color 0.14s ease",
          },
        },
        React.createElement(
          "svg",
          {
            width: 15,
            height: 15,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          React.createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 3 }),
          React.createElement("path", { d: "M3 9h18M9 21V9" }),
        ),
        "Glass",
      ),
      // Settings gear button
      React.createElement(
        "button",
        {
          onClick: onOpenSettings,
          title: "Settings",
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface2)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            width: 40,
            height: 40,
            cursor: "pointer",
            flexShrink: 0,
          },
        },
        React.createElement(Icon, { name: "settings", size: 18 }),
      ),
    ),
  );
}

export interface AppLayoutProps {
  theme: Theme;
  glass: boolean;
  opacity: number;
  wallpaper: Wallpaper;
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

/** Full-window layout: wallpaper + frosted root, sidebar (250px) + main column. */
export function AppLayout(p: AppLayoutProps): JSX.Element {
  const { theme, glass, opacity, wallpaper, sidebar, topbar, children } = p;

  return React.createElement(
    ThemeProvider,
    { theme, glass, opacity, wallpaper },
    React.createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          zIndex: 1,
        },
      },
      // Sidebar (250px, fixed width)
      React.createElement(
        "div",
        {
          style: {
            width: 250,
            flexShrink: 0,
            height: "100%",
          },
        },
        sidebar,
      ),
      // Main column: topbar + scrollable content
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          },
        },
        topbar,
        React.createElement(
          "div",
          {
            style: {
              flex: 1,
              overflow: "auto",
              padding: 26,
            },
          },
          children,
        ),
      ),
    ),
  );
}
