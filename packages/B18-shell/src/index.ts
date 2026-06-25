// @nabd/shell — app chrome: sidebar, top bar, layout. Props-driven (the app
// wires store state/actions to these). Small pure helpers for greeting/clock.

import React from "react";
import type { ReactNode } from "react";
import type { Theme, Wallpaper } from "@nabd/domain";
import {
  Button,
  Segmented,
  Donut,
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
  const { screen, onNavigate, setsDone, setsTotal, pct } = p;

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
          gap: 8,
          width: "100%",
          padding: "10px 16px",
          background: isActive ? "var(--surface2)" : "transparent",
          border: "none",
          fontWeight: isActive ? "bold" : "normal",
          color: isActive ? "var(--accent)" : "var(--text)",
          cursor: "pointer",
          borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
        },
      },
      React.createElement(Icon, { name: item.icon, size: 18 }),
      item.label,
    );
  });

  return React.createElement(
    "div",
    {
      style: {
        width: 250,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface)",
      },
    },
    // Brand lockup
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "20px 16px 12px",
        },
      },
      React.createElement(Icon, { name: "heart", size: 20, stroke: "var(--accent)" }),
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { style: { fontWeight: "bold", color: "var(--text)" } },
          "Nabd · نبض",
        ),
        React.createElement(
          "div",
          { style: { fontSize: "0.7rem", color: "var(--text3)" } },
          "PULSE · v0.1",
        ),
      ),
    ),
    // Nav buttons
    React.createElement("nav", { style: { flex: 1 } }, ...navButtons),
    // Donut at bottom
    React.createElement(
      "div",
      {
        style: {
          padding: "16px",
          display: "flex",
          justifyContent: "center",
        },
      },
      React.createElement(Donut, {
        pct,
        done: setsDone,
        total: setsTotal,
      }),
    ),
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
  onOpenSettings: () => void;
}

const THEME_OPTIONS = [
  { k: "translucent", label: "Translucent" },
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
    onOpenSettings,
  } = p;

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 56,
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
      },
    },
    // Left: greeting + date
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { color: "var(--text)", fontWeight: "bold" } },
        greetingText,
      ),
      React.createElement(
        "div",
        { style: { color: "var(--text2)", fontSize: "0.8rem" } },
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
          gap: 8,
          padding: "4px 12px",
          background: "var(--surface2)",
          borderRadius: 999,
        },
      },
      React.createElement(LiveDot, { active: notifActive }),
      React.createElement("span", { style: { color: "var(--text)" } }, clockStr),
      React.createElement(
        "span",
        { style: { color: "var(--text2)" } },
        `next ${nextStr}`,
      ),
      React.createElement(
        "span",
        {
          "data-idle-active": idleActive ? "true" : undefined,
          style: {
            color: idleActive ? "var(--accent)" : "var(--text2)",
          },
        },
        `idle ${idleStr}`,
      ),
    ),
    // Right: theme segmented + settings button
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8 } },
      React.createElement(Segmented, {
        options: THEME_OPTIONS,
        value: theme,
        onChange: (k) => onTheme(k as Theme),
        small: true,
      }),
      React.createElement(
        Button,
        {
          variant: "ghost",
          title: "Settings",
          onClick: onOpenSettings,
        },
        React.createElement(Icon, { name: "settings", size: 18 }),
      ),
    ),
  );
}

export interface AppLayoutProps {
  theme: Theme;
  opacity: number;
  wallpaper: Wallpaper;
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

/** Full-window layout: wallpaper + frosted root, sidebar (250px) + main column. */
export function AppLayout(p: AppLayoutProps): JSX.Element {
  const { theme, opacity, wallpaper, sidebar, topbar, children } = p;

  return React.createElement(
    ThemeProvider,
    { theme, opacity, wallpaper },
    React.createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          height: "100vh",
          width: "100%",
          zIndex: 1,
        },
      },
      // Sidebar (250px)
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
      // Main column
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
        topbar,
        React.createElement(
          "div",
          {
            style: {
              flex: 1,
              overflowY: "auto",
            },
          },
          children,
        ),
      ),
    ),
  );
}
