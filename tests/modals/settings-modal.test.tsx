/**
 * @nabd/modals — SettingsModal: shows the settings view-model and
 * reports each change as a patch.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { Settings } from "@nabd/domain";
import { SettingsModal, buildSettingsVM } from "@nabd/modals";
import type { SettingsActions } from "@nabd/modals";

type Input = Parameters<typeof buildSettingsVM>[0];

function setup(settings: Partial<Settings> = {}, over: Partial<Omit<Input, "settings">> = {}) {
  const vm = buildSettingsVM({
    settings: { ...DEFAULT_SETTINGS, ...settings },
    capabilities: { tray: true, glass: true, idle: true },
    notice: null,
    ...over,
  });
  const actions: SettingsActions = {
    change: vi.fn(),
    setBodyWeight: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    sendTestNotification: vi.fn(),
    quit: vi.fn(),
    close: vi.fn(),
  };
  const view = render(<SettingsModal vm={vm} actions={actions} />);
  /** The row of the setting titled `title` (its label, hint and control). */
  const setting = (title: string) => within(screen.getByRole("group", { name: title }));
  const step = (title: string, direction: "Increase" | "Decrease") =>
    fireEvent.click(
      setting(title).getByRole("button", { name: `${direction} ${title.toLowerCase()}` }),
    );
  return { actions, setting, step, ...view };
}

describe("SettingsModal", () => {
  it("groups the settings into named sections", () => {
    setup();
    const sections = screen.getAllByRole("region").map((s) => s.getAttribute("aria-label"));
    expect(sections).toEqual([
      "Workday",
      "Nudges",
      "Training",
      "Appearance",
      "Startup",
      "Notifications",
      "Data",
    ]);
  });

  it("shows each stepped setting's value and applies its patch", () => {
    const { actions, setting, step } = setup();
    expect(setting("Starts").getByText("09:00")).toBeInTheDocument();
    expect(setting("Interval").getByText("50 min")).toBeInTheDocument();

    step("Starts", "Increase");
    expect(actions.change).toHaveBeenLastCalledWith({ workStart: 9 * 60 + 30 });
    step("Interval", "Decrease");
    expect(actions.change).toHaveBeenLastCalledWith({ interval: 45 });
    step("Weight increment", "Increase");
    expect(actions.change).toHaveBeenLastCalledWith({ weightIncrement: 2.75 });
    expect(actions.change).toHaveBeenCalledTimes(3);
  });

  it("shows the weekdays worked, Monday first, and toggles one", () => {
    const { actions, setting } = setup({ workDays: [1, 2, 3, 4, 5] });
    const days = setting("Working days");
    const chips = days.getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(chips.map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
      "true",
      "true",
      "true",
      "true",
      "true",
      "false",
      "false",
    ]);

    fireEvent.click(days.getByRole("button", { name: "Sat" }));
    expect(actions.change).toHaveBeenLastCalledWith({ workDays: [1, 2, 3, 4, 5, 6] });
    fireEvent.click(days.getByRole("button", { name: "Mon" }));
    expect(actions.change).toHaveBeenLastCalledWith({ workDays: [2, 3, 4, 5] });
  });

  it("explains the idle moment where the system cannot report idle time", () => {
    setup({}, { capabilities: { tray: true, glass: true, idle: false } });
    expect(screen.getByRole("group", { name: "Idle moment" })).toHaveTextContent(
      "System idle detection is unavailable on this desktop",
    );
  });

  it("switches the weight unit", () => {
    const { actions, setting } = setup();
    const unit = setting("Weight unit");
    expect(unit.getByRole("radio", { name: "kg" })).toBeChecked();
    fireEvent.click(unit.getByRole("radio", { name: "lb" }));
    expect(actions.change).toHaveBeenLastCalledWith({ weightUnit: "lb" });
  });

  it("takes the body weight typed in the user's unit, and forgets it when emptied", () => {
    const { actions, setting } = setup({ weightUnit: "lb", bodyWeight: 80 });
    const field = setting("Body weight").getByRole("textbox", { name: "Body weight" });
    expect(field).toHaveValue("176.37");
    expect(setting("Body weight").getByText(/^In lb\./)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: "180" } });
    expect(actions.setBodyWeight).toHaveBeenLastCalledWith(180);
    fireEvent.change(field, { target: { value: "" } });
    expect(actions.setBodyWeight).toHaveBeenLastCalledWith(null);
  });

  it("shows an empty body weight until one is given", () => {
    const { setting } = setup();
    expect(setting("Body weight").getByRole("textbox")).toHaveValue("");
  });

  it("marks owned equipment and removes a piece when its chip is clicked", () => {
    const { actions, setting } = setup({ equipment: ["bodyweight", "dumbbell", "barbell"] });
    const equipment = setting("My equipment");
    expect(equipment.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(equipment.getByRole("button", { name: "Kettlebell" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(equipment.getByRole("button", { name: "Dumbbells" }));
    expect(actions.change).toHaveBeenLastCalledWith({ equipment: ["bodyweight", "barbell"] });
  });

  it("adds a piece of equipment that was not owned", () => {
    const { actions } = setup({ equipment: ["bodyweight"] });
    fireEvent.click(screen.getByRole("button", { name: "Kettlebell" }));
    expect(actions.change).toHaveBeenLastCalledWith({ equipment: ["bodyweight", "kettlebell"] });
  });

  it("switches the theme", () => {
    const { actions, setting } = setup({ theme: "dark" });
    expect(setting("Theme").getByRole("radio", { name: "Dark" })).toBeChecked();
    fireEvent.click(setting("Theme").getByRole("radio", { name: "Light" }));
    expect(actions.change).toHaveBeenLastCalledWith({ theme: "light" });
  });

  it("the translucency switch flips glass; opacity is only offered while it is on", () => {
    const off = setup({ glass: false });
    const offSwitch = off.setting("Translucent window").getByRole("switch");
    expect(offSwitch).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("group", { name: "Background opacity" })).toBeNull();
    fireEvent.click(offSwitch);
    expect(off.actions.change).toHaveBeenLastCalledWith({ glass: true });
    off.unmount();

    const on = setup({ glass: true, opacity: 0.7 });
    expect(on.setting("Background opacity").getByText("70%")).toBeInTheDocument();
    on.step("Background opacity", "Increase");
    expect(on.actions.change).toHaveBeenLastCalledWith({ opacity: 0.75 });
    fireEvent.click(on.setting("Translucent window").getByRole("switch"));
    expect(on.actions.change).toHaveBeenLastCalledWith({ glass: false });
  });

  it("hides the translucency rows where the window cannot be translucent", () => {
    setup({ glass: true }, { capabilities: { tray: true, glass: false, idle: true } });
    expect(screen.queryByRole("group", { name: "Translucent window" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Background opacity" })).toBeNull();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
  });

  it("flips the startup switches", () => {
    const { actions, setting } = setup({ openAtStartup: true, minimizedByDefault: false });
    fireEvent.click(setting("Open at startup").getByRole("switch"));
    expect(actions.change).toHaveBeenLastCalledWith({ openAtStartup: false });
    fireEvent.click(setting("Start minimized").getByRole("switch"));
    expect(actions.change).toHaveBeenLastCalledWith({ minimizedByDefault: true });
  });

  it("without a tray, Start minimized is switched off for good and explains itself", () => {
    const { actions, setting } = setup(
      {},
      { capabilities: { tray: false, glass: true, idle: true } },
    );
    const row = setting("Start minimized");
    expect(row.getByRole("switch")).toBeDisabled();
    expect(row.getByText(/shows no tray icons/)).toBeInTheDocument();
    fireEvent.click(row.getByRole("switch"));
    expect(actions.change).not.toHaveBeenCalled();
    expect(setting("Open at startup").getByRole("switch")).toBeEnabled();
  });

  it("Export and Import call their own actions and change no setting", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Export data" }));
    expect(actions.exportData).toHaveBeenCalledTimes(1);
    expect(actions.importData).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    expect(actions.importData).toHaveBeenCalledTimes(1);
    expect(actions.change).not.toHaveBeenCalled();
  });

  it("shows the outcome of the last import/export only when there is one", () => {
    const quiet = setup();
    expect(screen.queryByRole("status")).toBeNull();
    quiet.unmount();

    setup({}, { notice: { kind: "error", text: "Import failed: not a Nabd file" } });
    expect(screen.getByRole("status")).toHaveTextContent("Import failed: not a Nabd file");
  });

  it("the ✕ closes settings without changing anything", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect(actions.change).not.toHaveBeenCalled();
  });

  it("sends a test notification on request", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Send test notification" }));
    expect(actions.sendTestNotification).toHaveBeenCalledTimes(1);
  });

  it("quits from the bottom of the dialog", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Quit Nabd" }));
    expect(actions.quit).toHaveBeenCalledTimes(1);
  });
});
