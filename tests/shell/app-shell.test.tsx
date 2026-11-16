import { fireEvent, render, screen, within } from "@testing-library/react";
import { AppShell } from "@nabd/shell";
import type { ShellInput } from "@nabd/shell";
import { shellActions, shellVM } from "./fixtures";

function renderShell(overrides: Partial<ShellInput> = {}) {
  const actions = shellActions();
  const view = render(
    <AppShell vm={shellVM(overrides)} actions={actions}>
      <div>SCREEN</div>
    </AppShell>,
  );
  return { actions, ...view };
}

const button = (name: string): HTMLElement => screen.getByRole("button", { name });

describe("AppShell · layout", () => {
  it("renders the chrome around the screen it is given", () => {
    renderShell();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("SCREEN")).toBeInTheDocument();
  });

  it("tags the root with the theme and glass mode", () => {
    const { container } = renderShell({ settings: { theme: "light", glass: true, opacity: 0.7 } });
    const root = container.querySelector("[data-theme]");
    expect(root).toHaveAttribute("data-theme", "light");
    expect(root).toHaveAttribute("data-glass", "on");
  });
});

describe("AppShell · sidebar", () => {
  it("shows the brand, the version and today's set progress", () => {
    renderShell();
    const sidebar = within(screen.getByRole("complementary"));
    expect(sidebar.getByRole("img", { name: "Nabd" })).toBeInTheDocument();
    expect(sidebar.getByText("نبض")).toBeInTheDocument();
    expect(sidebar.getByText("PULSE · v0.1")).toBeInTheDocument();
    expect(sidebar.getByText("3")).toBeInTheDocument();
    expect(sidebar.getByText("of 12 sets")).toBeInTheDocument();
  });

  it("offers exactly the three screens, in order", () => {
    renderShell();
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
    const { actions } = renderShell();
    fireEvent.click(button(label));
    expect(actions.navigate).toHaveBeenCalledTimes(1);
    expect(actions.navigate).toHaveBeenCalledWith(target);
  });

  it.each([
    ["today", "Today"],
    ["planner", "Plan"],
    ["progress", "Progress"],
  ] as const)("on the '%s' screen only %s is marked as the current page", (current, label) => {
    renderShell({ screen: current });
    const marked = within(screen.getByRole("navigation"))
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "page");
    expect(marked.map((b) => b.textContent)).toEqual([label]);
  });
});

describe("AppShell · top bar", () => {
  /** The status dot that sits next to the clock. */
  const liveDot = (): Element | null => screen.getByText("10:30").querySelector("[data-active]");

  it("shows the greeting, date, clock and where nudging stands", () => {
    renderShell();
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    expect(screen.getByText("MONDAY · Nov 16")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("Next nudge at 11:20, sooner if you go idle")).toBeInTheDocument();
  });

  it("lights the live dot only while a set is due", () => {
    const waiting = renderShell();
    expect(liveDot()).toHaveAttribute("data-active", "false");
    waiting.unmount();

    renderShell({ nudge: { state: "due", reason: "timer" } });
    expect(liveDot()).toHaveAttribute("data-active", "true");
    expect(screen.getByText("Interval's up")).toBeInTheDocument();
  });

  it("offers Pause while nudges run, and toggles on click", () => {
    const { actions } = renderShell({ paused: false });
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    expect(button("Pause")).toHaveAttribute("title", "Pause nudges");
    fireEvent.click(button("Pause"));
    expect(actions.togglePause).toHaveBeenCalledTimes(1);
  });

  it("offers Resume while nudges are paused, and toggles on click", () => {
    const { actions } = renderShell({ paused: true, nudge: { state: "paused" } });
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(button("Resume")).toHaveAttribute("title", "Resume nudges");
    fireEvent.click(button("Resume"));
    expect(actions.togglePause).toHaveBeenCalledTimes(1);
  });

  it("marks the active theme and reports the one that is picked", () => {
    const { actions } = renderShell();
    expect(button("Dark")).toHaveAttribute("aria-pressed", "true");
    expect(button("Light")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button("Light"));
    expect(actions.setTheme).toHaveBeenLastCalledWith("light");
    fireEvent.click(button("Dark"));
    expect(actions.setTheme).toHaveBeenLastCalledWith("dark");
  });

  it("offers no Glass button where the window cannot be translucent", () => {
    renderShell({ glassSupported: false });
    expect(screen.queryByRole("button", { name: "Glass" })).not.toBeInTheDocument();
    expect(button("Pause")).toBeInTheDocument();
  });

  it("the Glass button turns translucency on while it is off", () => {
    const { actions } = renderShell();
    expect(button("Glass")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button("Glass"));
    expect(actions.setGlass).toHaveBeenCalledTimes(1);
    expect(actions.setGlass).toHaveBeenCalledWith(true);
  });

  it("the Glass button turns translucency off while it is on", () => {
    const { actions } = renderShell({ settings: { theme: "dark", glass: true, opacity: 0.7 } });
    expect(button("Glass")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button("Glass"));
    expect(actions.setGlass).toHaveBeenCalledWith(false);
  });

  it("the gear opens settings and nothing else", () => {
    const { actions } = renderShell();
    fireEvent.click(button("Settings"));
    expect(actions.openSettings).toHaveBeenCalledTimes(1);
    expect(actions.togglePause).not.toHaveBeenCalled();
    expect(actions.setGlass).not.toHaveBeenCalled();
    expect(actions.setTheme).not.toHaveBeenCalled();
  });
});

describe("AppShell · notice banner", () => {
  it("shows no banner without a notice", () => {
    renderShell();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("announces an error and can be dismissed", () => {
    const { actions } = renderShell({ notice: { kind: "error", text: "Could not save" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    fireEvent.click(button("Dismiss"));
    expect(actions.dismissNotice).toHaveBeenCalledTimes(1);
  });

  it("shows plain information as a status, not an alert", () => {
    renderShell({ notice: { kind: "info", text: "Imported" } });
    expect(screen.getByText("Imported").parentElement).toHaveAttribute("role", "status");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
