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
  it("shows the greeting, date, clock and where nudging stands", () => {
    renderShell();
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    expect(screen.getByText("MONDAY · Nov 16")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("Next nudge at 11:20, sooner if you go idle")).toBeInTheDocument();
  });

  it("says in its status region, in words, when a set is due", () => {
    const waiting = renderShell();
    expect(screen.getByRole("status")).toHaveTextContent("10:30");
    expect(screen.getByRole("status")).not.toHaveTextContent("Interval's up");
    waiting.unmount();

    renderShell({ nudge: { state: "due", reason: "timer" } });
    expect(screen.getByRole("status")).toHaveTextContent("Interval's up");
  });

  describe("the nudge menu", () => {
    const pick = (menuButton: string, item: string): void => {
      fireEvent.click(button(menuButton));
      fireEvent.click(screen.getByRole("menuitem", { name: item }));
    };

    it("says Pause while nudges run, and pauses them from its menu", () => {
      const { actions } = renderShell({ paused: false });
      expect(button("Pause")).toHaveAttribute("aria-haspopup", "menu");
      expect(screen.queryByRole("menu")).toBeNull();
      pick("Pause", "Pause nudges");
      expect(actions.togglePause).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("says Paused while they are paused, and resumes them", () => {
      const { actions } = renderShell({ paused: true, nudge: { state: "paused" } });
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
      pick("Paused", "Resume nudges");
      expect(actions.togglePause).toHaveBeenCalledTimes(1);
    });

    it("skips a workday, or nudges a quiet day, and is the top bar's only control for either", () => {
      const workday = renderShell({ today: "skip" });
      expect(screen.queryByRole("button", { name: "Skip today" })).toBeNull();
      pick("Pause", "Skip today");
      expect(workday.actions.toggleSkipToday).toHaveBeenCalledTimes(1);
      workday.unmount();

      const quiet = renderShell({ today: "nudge" });
      pick("Pause", "Nudge me today");
      expect(quiet.actions.toggleNudgeToday).toHaveBeenCalledTimes(1);
      expect(quiet.actions.toggleSkipToday).not.toHaveBeenCalled();
    });
  });

  it("marks the active theme and reports the one that is picked", () => {
    const { actions } = renderShell();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(actions.setTheme).toHaveBeenLastCalledWith("light");
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(actions.setTheme).toHaveBeenLastCalledWith("dark");
  });

  it("offers no Glass button where the window cannot be translucent", () => {
    renderShell({ capabilities: { glass: false } });
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
    expect(screen.getByText("Imported").closest("[role]")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
