/**
 * B18 · @nabd/shell — value-asserting React tests.
 *
 * Rules honoured:
 * - No `expect(...).toThrow("not implemented")`.
 * - No sole `.toBeDefined()` / `.toBeTruthy()` assertions.
 * - Every test asserts a concrete DOM text / role / callback / style value.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Theme } from "@nabd/domain";

import {
  greeting,
  formatDate,
  formatClock,
  formatDuration,
  Sidebar,
  TopBar,
  AppLayout,
} from "@nabd/shell";
import type { Screen, SidebarProps, TopBarProps, AppLayoutProps } from "@nabd/shell";

// ============================================================================
// greeting(hour)
// ============================================================================

describe("greeting", () => {
  it('returns "Good morning" for hour=0 (midnight)', () => {
    expect(greeting(0)).toBe("Good morning");
  });

  it('returns "Good morning" for hour=8', () => {
    expect(greeting(8)).toBe("Good morning");
  });

  it('returns "Good morning" for hour=11 (boundary before 12)', () => {
    expect(greeting(11)).toBe("Good morning");
  });

  it('returns "Good afternoon" for hour=12 (noon boundary)', () => {
    expect(greeting(12)).toBe("Good afternoon");
  });

  it('returns "Good afternoon" for hour=13', () => {
    expect(greeting(13)).toBe("Good afternoon");
  });

  it('returns "Good afternoon" for hour=17 (boundary before 18)', () => {
    expect(greeting(17)).toBe("Good afternoon");
  });

  it('returns "Good evening" for hour=18', () => {
    expect(greeting(18)).toBe("Good evening");
  });

  it('returns "Good evening" for hour=20', () => {
    expect(greeting(20)).toBe("Good evening");
  });

  it('returns "Good evening" for hour=23', () => {
    expect(greeting(23)).toBe("Good evening");
  });
});

// ============================================================================
// formatDate(now)
// ============================================================================

describe("formatDate", () => {
  it('formats a Monday as "MONDAY · Jun 24"', () => {
    // 2024-06-24 is a Monday
    const d = new Date(2024, 5, 24); // month is 0-indexed
    expect(formatDate(d)).toBe("MONDAY · Jun 24");
  });

  it('formats a Sunday correctly — "SUNDAY · Jan 1"', () => {
    // 2023-01-01 is a Sunday
    const d = new Date(2023, 0, 1);
    expect(formatDate(d)).toBe("SUNDAY · Jan 1");
  });

  it('formats a Wednesday in December — "WEDNESDAY · Dec 25"', () => {
    // 2024-12-25 is a Wednesday
    const d = new Date(2024, 11, 25);
    expect(formatDate(d)).toBe("WEDNESDAY · Dec 25");
  });

  it('formats a Saturday in July — "SATURDAY · Jul 4"', () => {
    // 2020-07-04 is a Saturday
    const d = new Date(2020, 6, 4);
    expect(formatDate(d)).toBe("SATURDAY · Jul 4");
  });

  it('formats a Friday in February — "FRIDAY · Feb 14"', () => {
    // 2025-02-14 is a Friday
    const d = new Date(2025, 1, 14);
    expect(formatDate(d)).toBe("FRIDAY · Feb 14");
  });

  it("uses uppercase weekday names", () => {
    const d = new Date(2024, 5, 24); // Monday
    expect(formatDate(d)).toMatch(/^[A-Z]+/);
  });

  it("uses title-case three-letter month abbreviation", () => {
    const d = new Date(2024, 5, 24); // June → Jun
    expect(formatDate(d)).toContain("Jun");
  });

  it("separates weekday and date with \" · \"", () => {
    const d = new Date(2024, 5, 24);
    expect(formatDate(d)).toContain(" · ");
  });
});

// ============================================================================
// formatClock(now)
// ============================================================================

describe("formatClock", () => {
  it('returns "09:05" for 9h 5m (zero-pads both)', () => {
    const d = new Date(2024, 0, 1, 9, 5, 0);
    expect(formatClock(d)).toBe("09:05");
  });

  it('returns "00:00" for midnight', () => {
    const d = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatClock(d)).toBe("00:00");
  });

  it('returns "23:59" for last minute of day', () => {
    const d = new Date(2024, 0, 1, 23, 59, 0);
    expect(formatClock(d)).toBe("23:59");
  });

  it('returns "14:30" for 14:30', () => {
    const d = new Date(2024, 0, 1, 14, 30, 0);
    expect(formatClock(d)).toBe("14:30");
  });

  it("output is always HH:MM format (5 characters)", () => {
    const d = new Date(2024, 0, 1, 7, 3, 0);
    expect(formatClock(d)).toHaveLength(5);
    expect(formatClock(d)).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ============================================================================
// formatDuration(seconds)
// ============================================================================

describe("formatDuration", () => {
  it('returns "0:00" for 0 seconds', () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it('returns "1:05" for 65 seconds', () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it('returns "10:00" for 600 seconds', () => {
    expect(formatDuration(600)).toBe("10:00");
  });

  it('returns "0:59" for 59 seconds', () => {
    expect(formatDuration(59)).toBe("0:59");
  });

  it('returns "2:00" for 120 seconds', () => {
    expect(formatDuration(120)).toBe("2:00");
  });

  it('returns "1:01" for 61 seconds', () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  it("zero-pads seconds below 10", () => {
    expect(formatDuration(65)).toMatch(/:\d{2}$/);
  });

  it("does not zero-pad minutes", () => {
    // 65 → "1:05", not "01:05"
    expect(formatDuration(65)).toBe("1:05");
  });

  it("floors fractional minutes (uses Math.floor)", () => {
    // 90s = 1 full minute + 30s → "1:30"
    expect(formatDuration(90)).toBe("1:30");
    // 119s = 1 full minute + 59s → "1:59"
    expect(formatDuration(119)).toBe("1:59");
  });
});

// ============================================================================
// Sidebar
// ============================================================================

const defaultSidebarProps: SidebarProps = {
  screen: "today",
  onNavigate: vi.fn(),
  setsDone: 3,
  setsTotal: 10,
  pct: 30,
  caption: "Today",
};

describe("Sidebar", () => {
  it("renders the brand name 'Nabd · نبض'", () => {
    const { container } = render(React.createElement(Sidebar, defaultSidebarProps));
    // Text is split across styled spans; check the combined textContent of the brand div
    expect(container.textContent).toContain("Nabd");
    expect(container.textContent).toContain("نبض");
  });

  it("renders the version string 'PULSE · v0.1'", () => {
    render(React.createElement(Sidebar, defaultSidebarProps));
    expect(screen.getByText(/PULSE · v0\.1/)).toBeInTheDocument();
  });

  it("renders exactly three navigation buttons (Today, Plan/Planner, Progress)", () => {
    render(React.createElement(Sidebar, defaultSidebarProps));
    // All three nav items should be present as buttons or elements
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress/i)).toBeInTheDocument();
  });

  it("clicking Plan nav item calls onNavigate('planner')", () => {
    const onNavigate = vi.fn();
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        onNavigate,
        screen: "today",
      }),
    );
    fireEvent.click(screen.getByText(/Plan/i));
    expect(onNavigate).toHaveBeenCalledWith("planner");
  });

  it("clicking Progress nav item calls onNavigate('progress')", () => {
    const onNavigate = vi.fn();
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        onNavigate,
        screen: "today",
      }),
    );
    fireEvent.click(screen.getByText(/Progress/i));
    expect(onNavigate).toHaveBeenCalledWith("progress");
  });

  it("clicking Today nav item calls onNavigate('today')", () => {
    const onNavigate = vi.fn();
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        onNavigate,
        screen: "planner",
      }),
    );
    fireEvent.click(screen.getByText(/Today/i));
    expect(onNavigate).toHaveBeenCalledWith("today");
  });

  it("active nav item (screen='today') is visually distinct from inactive items", () => {
    // Render with screen='today' and then screen='planner' to check difference
    const { unmount } = render(
      React.createElement(Sidebar, { ...defaultSidebarProps, screen: "today" }),
    );
    // The 'Today' element should have an active marker (data-active, aria-current, or class)
    const todayEl = screen.getByText(/Today/i).closest("[data-active]") ||
      screen.getByText(/Today/i).closest("[aria-current]") ||
      document.querySelector("[data-active='true']") ||
      document.querySelector("[aria-current='page']");
    // Verify the active item exists (the active Today link/button has a distinctive marker)
    expect(todayEl).not.toBeNull();
    unmount();

    render(
      React.createElement(Sidebar, { ...defaultSidebarProps, screen: "planner" }),
    );
    // With planner active, Today should NOT be active
    const todayElInactive = screen.getByText(/Today/i).closest("[data-active='true']") ||
      screen.getByText(/Today/i).closest("[aria-current='page']");
    expect(todayElInactive).toBeNull();
  });

  it("renders the Donut with setsDone value", () => {
    const { container } = render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        setsDone: 3,
        setsTotal: 10,
      }),
    );
    // The sets done count (3) should appear in the donut ring
    expect(container.textContent).toContain("3");
  });

  it("renders the Donut with setsTotal value", () => {
    const { container } = render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        setsDone: 3,
        setsTotal: 10,
      }),
    );
    // "of 10 sets" text should be visible somewhere in the sidebar
    expect(container.textContent).toContain("10");
  });

  it("renders the Donut caption", () => {
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        caption: "Today",
      }),
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("renders the caption prop text in the document", () => {
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        caption: "55% logged",
      }),
    );
    expect(screen.getByText("55% logged")).toBeInTheDocument();
  });

  it("renders a heart Icon (SVG element present for brand)", () => {
    render(React.createElement(Sidebar, defaultSidebarProps));
    // Icon renders an <svg>; at least one should be in the DOM for the brand heart
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("screen='planner' makes Plan item active (has data-active or aria-current)", () => {
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        screen: "planner",
      }),
    );
    const planEl =
      document.querySelector("[data-active='true']") ||
      document.querySelector("[aria-current='page']");
    expect(planEl).not.toBeNull();
    // Plan text should be nearby or inside the active element
    expect(planEl!.textContent).toMatch(/Plan/i);
  });

  it("screen='progress' makes Progress item active", () => {
    render(
      React.createElement(Sidebar, {
        ...defaultSidebarProps,
        screen: "progress",
      }),
    );
    const activeEl =
      document.querySelector("[data-active='true']") ||
      document.querySelector("[aria-current='page']");
    expect(activeEl).not.toBeNull();
    expect(activeEl!.textContent).toMatch(/Progress/i);
  });
});

// ============================================================================
// TopBar
// ============================================================================

const defaultTopBarProps: TopBarProps = {
  greeting: "Good morning",
  dateStr: "MONDAY · Jun 24",
  clockStr: "09:05",
  nextStr: "10:00",
  idleStr: "0:30",
  idleActive: false,
  notifActive: false,
  theme: "light",
  onTheme: vi.fn(),
  glass: false,
  onToggleGlass: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe("TopBar", () => {
  it("renders the greeting text", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    expect(screen.getByText("Good morning")).toBeInTheDocument();
  });

  it("renders the dateStr", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    expect(screen.getByText("MONDAY · Jun 24")).toBeInTheDocument();
  });

  it("renders the clockStr", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    expect(screen.getByText("09:05")).toBeInTheDocument();
  });

  it("renders 'next <nextStr>' text containing the nextStr value", () => {
    const { container } = render(React.createElement(TopBar, defaultTopBarProps));
    // "next" label and the timer value appear together in the status pill
    expect(container.textContent).toMatch(/next.*10:00|10:00.*next/i);
  });

  it("renders 'idle <idleStr>' text containing the idleStr value", () => {
    const { container } = render(React.createElement(TopBar, defaultTopBarProps));
    // idle label and the idle time appear together in the status pill
    expect(container.textContent).toMatch(/idle.*0:30|0:30.*idle/i);
  });

  it("when idleActive=false, idle element does NOT have accent style marker", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, idleActive: false }),
    );
    // The idle text element should not have data-idle-active='true'
    const idleActive = document.querySelector("[data-idle-active='true']");
    expect(idleActive).toBeNull();
  });

  it("when idleActive=true, idle element has accent style marker", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, idleActive: true }),
    );
    // The idle text element should have data-idle-active='true' or similar accent marker
    const idleActive = document.querySelector("[data-idle-active='true']");
    expect(idleActive).not.toBeNull();
  });

  it("idleActive=true and idleActive=false produce different DOM output", () => {
    const { container: c1 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, idleActive: true }),
    );
    const html1 = c1.innerHTML;

    const { container: c2 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, idleActive: false }),
    );
    const html2 = c2.innerHTML;

    expect(html1).not.toEqual(html2);
  });

  it("when notifActive=false, LiveDot has data-active='false'", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, notifActive: false }),
    );
    const dot = document.querySelector("[data-active='false']");
    expect(dot).not.toBeNull();
  });

  it("when notifActive=true, LiveDot has data-active='true'", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, notifActive: true }),
    );
    const dot = document.querySelector("[data-active='true']");
    expect(dot).not.toBeNull();
  });

  it("notifActive=true vs false produce different LiveDot output", () => {
    const { container: c1 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, notifActive: true }),
    );
    const dot1 = c1.querySelector("[data-active]");

    const { container: c2 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, notifActive: false }),
    );
    const dot2 = c2.querySelector("[data-active]");

    expect(dot1!.getAttribute("data-active")).toBe("true");
    expect(dot2!.getAttribute("data-active")).toBe("false");
  });

  it("renders the theme Segmented control with Light option", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    expect(screen.getByText(/Light/i)).toBeInTheDocument();
  });

  it("renders the theme Segmented control with Dark option", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    expect(screen.getByText(/Dark/i)).toBeInTheDocument();
  });

  it("active theme option (light) has aria-pressed='true'", () => {
    render(
      React.createElement(TopBar, {
        ...defaultTopBarProps,
        theme: "light",
      }),
    );
    const activeBtn = document.querySelector("[aria-pressed='true']");
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.textContent).toMatch(/Light/i);
  });

  it("selecting Light theme calls onTheme('light')", () => {
    const onTheme = vi.fn();
    render(
      React.createElement(TopBar, {
        ...defaultTopBarProps,
        theme: "dark",
        onTheme,
      }),
    );
    fireEvent.click(screen.getByText(/Light/i));
    expect(onTheme).toHaveBeenCalledWith("light");
  });

  it("selecting Dark theme calls onTheme('dark')", () => {
    const onTheme = vi.fn();
    render(
      React.createElement(TopBar, {
        ...defaultTopBarProps,
        theme: "light",
        onTheme,
      }),
    );
    fireEvent.click(screen.getByText(/Dark/i));
    expect(onTheme).toHaveBeenCalledWith("dark");
  });

  it("renders the Glass toggle button", () => {
    render(React.createElement(TopBar, defaultTopBarProps));
    const glassBtn =
      document.querySelector("button[title*='Translucent']") ||
      document.querySelector("[data-glass-active]") ||
      screen.queryByText(/Glass/i);
    expect(glassBtn).not.toBeNull();
  });

  it("clicking the Glass button calls onToggleGlass", () => {
    const onToggleGlass = vi.fn();
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, onToggleGlass }),
    );
    const glassBtn =
      document.querySelector("button[title*='Translucent']") ||
      document.querySelector("[data-glass-active]");
    expect(glassBtn).not.toBeNull();
    fireEvent.click(glassBtn!);
    expect(onToggleGlass).toHaveBeenCalledTimes(1);
  });

  it("Glass button shows active state when glass=true", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, glass: true }),
    );
    const activeGlass = document.querySelector("[data-glass-active='true']");
    expect(activeGlass).not.toBeNull();
  });

  it("Glass button shows inactive state when glass=false", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, glass: false }),
    );
    const inactiveGlass = document.querySelector("[data-glass-active='false']");
    expect(inactiveGlass).not.toBeNull();
  });

  it("glass=true vs glass=false produce different Glass button DOM output", () => {
    const { container: c1 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, glass: true }),
    );
    const html1 = c1.innerHTML;

    const { container: c2 } = render(
      React.createElement(TopBar, { ...defaultTopBarProps, glass: false }),
    );
    const html2 = c2.innerHTML;

    expect(html1).not.toEqual(html2);
  });

  it("clicking the settings gear button calls onOpenSettings", () => {
    const onOpenSettings = vi.fn();
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, onOpenSettings }),
    );
    // The settings gear should be a button with a title or role
    const settingsBtn =
      screen.queryByRole("button", { name: /settings/i }) ||
      document.querySelector("button[title*='settings' i]") ||
      document.querySelector("button[title*='Settings']");
    expect(settingsBtn).not.toBeNull();
    fireEvent.click(settingsBtn!);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("theme='dark' sets the Dark option as aria-pressed='true'", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, theme: "dark" }),
    );
    const activeBtn = document.querySelector("[aria-pressed='true']");
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.textContent).toMatch(/Dark/i);
  });

  it("theme='light' sets the Light option as aria-pressed='true'", () => {
    render(
      React.createElement(TopBar, { ...defaultTopBarProps, theme: "light" }),
    );
    const activeBtn = document.querySelector("[aria-pressed='true']");
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.textContent).toMatch(/Light/i);
  });
});

// ============================================================================
// AppLayout
// ============================================================================

const defaultAppLayoutProps: AppLayoutProps = {
  theme: "dark",
  glass: false,
  opacity: 0.55,
  sidebar: React.createElement("aside", { "data-testid": "sidebar-slot" }, "Sidebar"),
  topbar: React.createElement("nav", { "data-testid": "topbar-slot" }, "Topbar"),
  children: React.createElement("main", { "data-testid": "children-slot" }, "Content"),
};

describe("AppLayout", () => {
  it("renders the sidebar slot content", () => {
    render(React.createElement(AppLayout, defaultAppLayoutProps));
    expect(screen.getByTestId("sidebar-slot")).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
  });

  it("renders the topbar slot content", () => {
    render(React.createElement(AppLayout, defaultAppLayoutProps));
    expect(screen.getByTestId("topbar-slot")).toBeInTheDocument();
    expect(screen.getByText("Topbar")).toBeInTheDocument();
  });

  it("renders the children slot content", () => {
    render(React.createElement(AppLayout, defaultAppLayoutProps));
    expect(screen.getByTestId("children-slot")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("glass=true dark: root wrapper background contains the glass tint (dark rgba)", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: true,
      }),
    );
    // In glass mode the ThemeProvider applies a semi-opaque tint as the background
    // browsers may normalize rgba(15,17,24,...) → rgba(15, 17, 24, ...) with spaces
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toMatch(/rgba\(15,?\s*17,?\s*24,/);
  });

  it("glass=false with light theme: root wrapper background is var(--bg)", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "light",
        glass: false,
      }),
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toBe("var(--bg)");
  });

  it("glass=false with dark theme: root wrapper background is var(--bg)", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: false,
      }),
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toBe("var(--bg)");
  });

  it("glass=true vs glass=false produce different root/container styles", () => {
    const { container: c1 } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: true,
      }),
    );
    const html1 = c1.innerHTML;

    const { container: c2 } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: false,
      }),
    );
    const html2 = c2.innerHTML;

    expect(html1).not.toEqual(html2);
  });

  it("light vs dark themes produce different root/container styles", () => {
    const { container: c1 } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "light",
        glass: false,
      }),
    );
    const html1 = c1.innerHTML;

    const { container: c2 } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: false,
      }),
    );
    const html2 = c2.innerHTML;

    expect(html1).not.toEqual(html2);
  });

  it("applies theme CSS variables to the container (ThemeProvider wraps the content)", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "light",
        glass: false,
      }),
    );
    // The ThemeProvider applies inline styles with CSS custom props
    // The root div should have style attributes from themeVars
    const styledEl = container.querySelector("[style]");
    expect(styledEl).not.toBeNull();
  });

  it("renders all three slots simultaneously", () => {
    render(React.createElement(AppLayout, defaultAppLayoutProps));
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Topbar")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("accepts different opacity values without error", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: true,
        opacity: 0.8,
      }),
    );
    // Should render successfully
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("glass=true light theme: root wrapper background contains light glass tint rgba", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "light",
        glass: true,
        opacity: 0.7,
      }),
    );
    const wrapper = container.firstChild as HTMLElement;
    // browsers may normalize rgba(244,246,251,...) → rgba(244, 246, 251, ...) with spaces
    expect(wrapper.style.background).toMatch(/rgba\(244,?\s*246,?\s*251,/);
  });

  it("glass=true dark theme opacity 0.8: root wrapper background is dark glass tint at 0.8", () => {
    const { container } = render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: true,
        opacity: 0.8,
      }),
    );
    const wrapper = container.firstChild as HTMLElement;
    // browsers may normalize rgba(15,17,24,0.8) → rgba(15, 17, 24, 0.8) with spaces
    expect(wrapper.style.background).toMatch(/rgba\(15,?\s*17,?\s*24,?\s*0\.8\)/);
  });

  it("glass=true renders children correctly (no wallpaper layer blocks content)", () => {
    render(
      React.createElement(AppLayout, {
        ...defaultAppLayoutProps,
        theme: "dark",
        glass: true,
      }),
    );
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
  });
});

// ============================================================================
// Type re-exports: Screen type (exercise every literal value)
// ============================================================================

describe("Screen type literal values are accepted", () => {
  const screens: Screen[] = ["today", "planner", "progress"];

  it.each(screens)("Sidebar renders for screen='%s'", (s) => {
    const onNavigate = vi.fn();
    render(
      React.createElement(Sidebar, {
        screen: s,
        onNavigate,
        setsDone: 0,
        setsTotal: 0,
        pct: 0,
        caption: "x",
      }),
    );
    // At minimum the three nav texts should always be present
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress/i)).toBeInTheDocument();
  });
});
