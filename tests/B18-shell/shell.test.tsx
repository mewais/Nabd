/**
 * B18 · @nabd/shell — app chrome: greeting/date helpers, Sidebar, TopBar, AppLayout.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AppLayout, NoticeBanner, Sidebar, TopBar, formatDate, greeting } from "@nabd/shell";
import type { SidebarProps, TopBarProps } from "@nabd/shell";

describe("greeting", () => {
  it.each([
    [0, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [17, "Good afternoon"],
    [18, "Good evening"],
    [23, "Good evening"],
  ])("hour %i → %s", (hour, expected) => {
    expect(greeting(hour)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("is the upper-case weekday, then the short month and day of the local date", () => {
    expect(formatDate(new Date(2026, 10, 16, 10, 30))).toBe("MONDAY · Nov 16");
    expect(formatDate(new Date(2023, 0, 1, 0, 0))).toBe("SUNDAY · Jan 1");
    expect(formatDate(new Date(2026, 6, 4, 23, 59))).toBe("SATURDAY · Jul 4");
  });
});

describe("Sidebar", () => {
  const props = (over: Partial<SidebarProps> = {}): SidebarProps => ({
    screen: "today",
    onNavigate: vi.fn(),
    setsDone: 3,
    setsTotal: 12,
    pct: 25,
    ...over,
  });

  it("shows the brand and today's set progress", () => {
    const { container } = render(<Sidebar {...props()} />);
    expect(container).toHaveTextContent("Nabd");
    expect(container).toHaveTextContent("نبض");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("of 12 sets")).toBeInTheDocument();
  });

  it("offers exactly the three screens, in order", () => {
    render(<Sidebar {...props()} />);
    const nav = within(screen.getByRole("navigation"));
    expect(nav.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Today",
      "Plan",
      "Progress",
    ]);
  });

  it.each([
    ["Today", "today"],
    ["Plan", "planner"],
    ["Progress", "progress"],
  ] as const)("clicking %s navigates to '%s'", (label, target) => {
    const onNavigate = vi.fn();
    render(<Sidebar {...props({ onNavigate })} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(target);
  });

  it.each([
    ["today", "Today"],
    ["planner", "Plan"],
    ["progress", "Progress"],
  ] as const)("on the '%s' screen only %s is marked as the current page", (current, label) => {
    render(<Sidebar {...props({ screen: current })} />);
    const marked = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "page");
    expect(marked.map((b) => b.textContent)).toEqual([label]);
  });
});

describe("TopBar", () => {
  const props = (over: Partial<TopBarProps> = {}): TopBarProps => ({
    greeting: "Good morning",
    dateStr: "MONDAY · Nov 16",
    clockStr: "10:30",
    nudgeLine: "Next nudge at 11:20, sooner if you go idle",
    due: false,
    paused: false,
    onTogglePause: vi.fn(),
    theme: "dark",
    onTheme: vi.fn(),
    glassAvailable: true,
    glass: false,
    onToggleGlass: vi.fn(),
    onOpenSettings: vi.fn(),
    ...over,
  });
  /** The status dot that sits next to the clock. */
  const liveDot = (): Element | null => screen.getByText("10:30").querySelector("[data-active]");

  it("shows the greeting, date, clock and where nudging stands", () => {
    render(<TopBar {...props()} />);
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    expect(screen.getByText("MONDAY · Nov 16")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("Next nudge at 11:20, sooner if you go idle")).toBeInTheDocument();
  });

  it("lights the live dot only while a set is due", () => {
    const waiting = render(<TopBar {...props({ due: false })} />);
    expect(liveDot()).toHaveAttribute("data-active", "false");
    waiting.unmount();

    render(<TopBar {...props({ due: true, nudgeLine: "Interval's up" })} />);
    expect(liveDot()).toHaveAttribute("data-active", "true");
    expect(screen.getByText("Interval's up")).toBeInTheDocument();
  });

  it("offers Pause while nudges run, and toggles on click", () => {
    const onTogglePause = vi.fn();
    render(<TopBar {...props({ paused: false, onTogglePause })} />);
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    const pause = screen.getByRole("button", { name: "Pause" });
    expect(pause).toHaveAttribute("title", "Pause nudges");
    fireEvent.click(pause);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("offers Resume while nudges are paused, and toggles on click", () => {
    const onTogglePause = vi.fn();
    render(<TopBar {...props({ paused: true, onTogglePause })} />);
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    const resume = screen.getByRole("button", { name: "Resume" });
    expect(resume).toHaveAttribute("title", "Resume nudges");
    fireEvent.click(resume);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("marks the active theme and reports the one that is picked", () => {
    const onTheme = vi.fn();
    render(<TopBar {...props({ theme: "dark", onTheme })} />);
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(onTheme).toHaveBeenLastCalledWith("light");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(onTheme).toHaveBeenLastCalledWith("dark");
  });

  it("offers no Glass button where the window cannot be translucent", () => {
    render(<TopBar {...props({ glassAvailable: false })} />);
    expect(screen.queryByRole("button", { name: "Glass" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("the Glass button reflects the translucency mode and toggles it", () => {
    const onToggleGlass = vi.fn();
    const { rerender } = render(<TopBar {...props({ glass: false, onToggleGlass })} />);
    const glass = screen.getByRole("button", { name: "Glass" });
    expect(glass).toHaveAttribute("data-glass-active", "false");
    fireEvent.click(glass);
    expect(onToggleGlass).toHaveBeenCalledTimes(1);

    rerender(<TopBar {...props({ glass: true, onToggleGlass })} />);
    expect(screen.getByRole("button", { name: "Glass" })).toHaveAttribute(
      "data-glass-active",
      "true",
    );
  });

  it("the gear opens settings and nothing else", () => {
    const p = props();
    render(<TopBar {...p} />);
    fireEvent.click(screen.getByTitle("Settings"));
    expect(p.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(p.onTogglePause).not.toHaveBeenCalled();
    expect(p.onToggleGlass).not.toHaveBeenCalled();
    expect(p.onTheme).not.toHaveBeenCalled();
  });
});

describe("NoticeBanner", () => {
  it("announces an error and can be dismissed", () => {
    const onDismiss = vi.fn();
    render(
      <NoticeBanner notice={{ kind: "error", text: "Could not save" }} onDismiss={onDismiss} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows plain information as a status, not an alert", () => {
    render(<NoticeBanner notice={{ kind: "info", text: "Imported" }} onDismiss={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Imported");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("AppLayout", () => {
  const layout = (glass: boolean, theme: "light" | "dark" = "dark", opacity = 0.7) =>
    render(
      <AppLayout
        theme={theme}
        glass={glass}
        opacity={opacity}
        sidebar={<div>SIDEBAR</div>}
        topbar={<div>TOPBAR</div>}
      >
        <div>CONTENT</div>
      </AppLayout>,
    );

  it("renders the sidebar, top bar and screen content together", () => {
    layout(false);
    expect(screen.getByText("SIDEBAR")).toBeInTheDocument();
    expect(screen.getByText("TOPBAR")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });

  it("tags the root with the active theme and glass mode", () => {
    const { container } = layout(true, "light");
    const root = container.querySelector("[data-theme]");
    expect(root).toHaveAttribute("data-theme", "light");
    expect(root).toHaveAttribute("data-glass", "on");
  });

  it("paints a solid background normally and the see-through tint in glass mode", () => {
    const solid = layout(false, "dark");
    const solidRoot = solid.container.querySelector<HTMLElement>("[data-theme]");
    expect(solidRoot?.style.background).toBe("var(--bg)");
    solid.unmount();

    const glass = layout(true, "dark", 0.8);
    const glassRoot = glass.container.querySelector<HTMLElement>("[data-theme]");
    expect(glassRoot?.style.background.replace(/\s/g, "")).toBe("rgba(15,17,24,0.8)");
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });
});
