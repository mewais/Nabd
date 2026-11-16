/**
 * B22 · @nabd/modals — SettingsModal: shows the current settings and reports
 * each change as a patch.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { Settings } from "@nabd/domain";
import { SettingsModal } from "@nabd/modals";
import type { SettingsModalProps } from "@nabd/modals";

function setup(settings: Partial<Settings> = {}, over: Partial<SettingsModalProps> = {}) {
  const props: SettingsModalProps = {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    notice: null,
    onChange: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  const view = render(<SettingsModal {...props} />);
  /** The row of the setting titled `title` (its label, hint and control). */
  const setting = (title: string) => {
    const row = view.container.querySelector<HTMLElement>(`[data-setting="${title}"]`);
    if (!row) throw new Error(`no setting row "${title}"`);
    return within(row);
  };
  const step = (title: string, direction: "increase" | "decrease") =>
    fireEvent.click(setting(title).getByRole("button", { name: direction }));
  return { props, setting, step, ...view };
}

describe("SettingsModal", () => {
  it("shows the current values in readable units", () => {
    const { setting } = setup();
    expect(setting("Starts").getByText("09:00")).toBeInTheDocument();
    expect(setting("Ends").getByText("18:00")).toBeInTheDocument();
    expect(setting("Interval").getByText("50 min")).toBeInTheDocument();
    expect(setting("Minimum gap").getByText("15 min")).toBeInTheDocument();
    expect(setting("Idle moment").getByText("30 sec")).toBeInTheDocument();
    expect(setting("Weight increment").getByText("2.5 kg")).toBeInTheDocument();
  });

  it("moves the workday bounds in half-hour steps", () => {
    const { props, step } = setup();
    step("Starts", "increase");
    expect(props.onChange).toHaveBeenLastCalledWith({ workStart: 9 * 60 + 30 });
    step("Starts", "decrease");
    expect(props.onChange).toHaveBeenLastCalledWith({ workStart: 8 * 60 + 30 });
    step("Ends", "decrease");
    expect(props.onChange).toHaveBeenLastCalledWith({ workEnd: 17 * 60 + 30 });
  });

  it("moves the nudge timings in steps of five", () => {
    const { props, step } = setup();
    step("Interval", "increase");
    expect(props.onChange).toHaveBeenLastCalledWith({ interval: 55 });
    step("Minimum gap", "decrease");
    expect(props.onChange).toHaveBeenLastCalledWith({ minGap: 10 });
    step("Idle moment", "decrease");
    expect(props.onChange).toHaveBeenLastCalledWith({ idleNudge: 25 });
  });

  it("each change is a patch of just that setting", () => {
    const { props, step } = setup();
    step("Interval", "increase");
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(Object.keys(vi.mocked(props.onChange).mock.calls[0]![0])).toEqual(["interval"]);
  });

  it("switches the weight unit, and shows the increment in the active unit", () => {
    const kg = setup();
    expect(kg.setting("Weight unit").getByRole("button", { name: "kg" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(kg.setting("Weight unit").getByRole("button", { name: "lb" }));
    expect(kg.props.onChange).toHaveBeenLastCalledWith({ weightUnit: "lb" });
    kg.unmount();

    const lb = setup({ weightUnit: "lb", weightIncrement: 5 });
    expect(lb.setting("Weight increment").getByText("5 lb")).toBeInTheDocument();
  });

  it("steps the weight increment by a half, without floating-point dust", () => {
    const { props, step } = setup({ weightIncrement: 2.5 });
    step("Weight increment", "increase");
    expect(props.onChange).toHaveBeenLastCalledWith({ weightIncrement: 3 });
    step("Weight increment", "decrease");
    expect(props.onChange).toHaveBeenLastCalledWith({ weightIncrement: 2 });
  });

  it("marks owned equipment and removes a piece when its chip is clicked", () => {
    const { props } = setup({ equipment: ["bodyweight", "dumbbell", "barbell"] });
    expect(screen.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Kettlebell" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Dumbbells" }));
    expect(props.onChange).toHaveBeenLastCalledWith({ equipment: ["bodyweight", "barbell"] });
  });

  it("adds a piece of equipment that was not owned", () => {
    const { props } = setup({ equipment: ["bodyweight"] });
    fireEvent.click(screen.getByRole("button", { name: "Kettlebell" }));
    expect(props.onChange).toHaveBeenLastCalledWith({ equipment: ["bodyweight", "kettlebell"] });
  });

  it("switches the theme", () => {
    const { props, setting } = setup({ theme: "dark" });
    expect(setting("Theme").getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(setting("Theme").getByRole("button", { name: "Light" }));
    expect(props.onChange).toHaveBeenLastCalledWith({ theme: "light" });
  });

  it("the translucency switch flips glass; opacity is only offered while it is on", () => {
    const off = setup({ glass: false });
    expect(off.setting("Translucent window").getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(off.container.querySelector('[data-setting="Background opacity"]')).toBeNull();
    fireEvent.click(off.setting("Translucent window").getByRole("switch"));
    expect(off.props.onChange).toHaveBeenLastCalledWith({ glass: true });
    off.unmount();

    const on = setup({ glass: true, opacity: 0.7 });
    expect(on.setting("Background opacity").getByText("70%")).toBeInTheDocument();
    on.step("Background opacity", "increase");
    expect(on.props.onChange).toHaveBeenLastCalledWith({ opacity: 0.75 });
    on.step("Background opacity", "decrease");
    expect(on.props.onChange).toHaveBeenLastCalledWith({ opacity: 0.65 });
    fireEvent.click(on.setting("Translucent window").getByRole("switch"));
    expect(on.props.onChange).toHaveBeenLastCalledWith({ glass: false });
  });

  it("flips the startup switches", () => {
    const { props, setting } = setup({ openAtStartup: true, minimizedByDefault: false });
    fireEvent.click(setting("Open at startup").getByRole("switch"));
    expect(props.onChange).toHaveBeenLastCalledWith({ openAtStartup: false });
    fireEvent.click(setting("Start minimized").getByRole("switch"));
    expect(props.onChange).toHaveBeenLastCalledWith({ minimizedByDefault: true });
  });

  it("Export and Import call their own handlers and change no setting", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Export data" }));
    expect(props.onExport).toHaveBeenCalledTimes(1);
    expect(props.onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    expect(props.onImport).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("shows the outcome of the last import/export only when there is one", () => {
    const quiet = setup();
    expect(screen.queryByRole("status")).toBeNull();
    quiet.unmount();

    setup({}, { notice: { kind: "error", text: "Import failed: not a Nabd file" } });
    expect(screen.getByRole("status")).toHaveTextContent("Import failed: not a Nabd file");
  });

  it("the ✕ closes settings without changing anything", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
