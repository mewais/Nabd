import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Chip, ChipGroup, Dropdown, MenuButton, Segmented } from "@nabd/design-system";
import type { Option } from "@nabd/design-system";
import { choose, click, press } from "./render";

type Unit = "kg" | "lb";
const UNITS: Option<Unit>[] = [
  { value: "kg", label: "Kilograms" },
  { value: "lb", label: "Pounds" },
];

describe("Segmented", () => {
  it("is a radio group that offers every option and marks the chosen one", () => {
    render(<Segmented options={UNITS} value="lb" onChange={vi.fn()} ariaLabel="Weight unit" />);
    const group = screen.getByRole("radiogroup", { name: "Weight unit" });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Pounds" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Kilograms" })).not.toBeChecked();
  });

  it("reports the option that was clicked", () => {
    const onChange = vi.fn();
    render(<Segmented options={UNITS} value="kg" onChange={onChange} />);
    choose("Pounds");
    expect(onChange).toHaveBeenCalledWith("lb");
  });

  describe("from the keyboard", () => {
    const DAYS: Option[] = ["Mon", "Tue", "Wed", "Thu"].map((day) => ({ value: day, label: day }));
    /** A group over a value its owner keeps, with "Wed" disabled. */
    function Owned(): JSX.Element {
      const [value, setValue] = useState("Tue");
      const options = DAYS.map((day) => ({ ...day, disabled: day.value === "Wed" }));
      return <Segmented options={options} value={value} onChange={setValue} ariaLabel="Day" />;
    }
    const radio = (name: string): HTMLElement => screen.getByRole("radio", { name });
    const key = (name: string, keyName: string): boolean =>
      fireEvent.keyDown(radio(name), { key: keyName });

    it("is one tab stop: the chosen option", () => {
      render(<Owned />);
      expect(DAYS.map(({ value }) => radio(value).tabIndex)).toEqual([-1, 0, -1, -1]);
    });

    it("chooses with the arrows, skipping a disabled option and wrapping round", () => {
      render(<Owned />);
      key("Tue", "ArrowRight");
      expect(radio("Thu")).toBeChecked();
      expect(radio("Thu")).toHaveFocus();
      key("Thu", "ArrowDown");
      expect(radio("Mon")).toBeChecked();
      key("Mon", "ArrowLeft");
      expect(radio("Thu")).toBeChecked();
      key("Thu", "ArrowUp");
      expect(radio("Tue")).toBeChecked();
    });

    it("goes to either end with Home and End, and ignores other keys", () => {
      render(<Owned />);
      key("Tue", "End");
      expect(radio("Thu")).toBeChecked();
      key("Thu", "Home");
      expect(radio("Mon")).toBeChecked();
      key("Mon", "x");
      expect(radio("Mon")).toBeChecked();
    });
  });

  it("types its keys from the options", () => {
    const seen: Unit[] = [];
    render(<Segmented options={UNITS} value="kg" onChange={(unit) => seen.push(unit)} />);
    // @ts-expect-error "stone" is not one of the option keys
    const invalid = <Segmented<Unit> options={UNITS} value="stone" onChange={vi.fn()} />;
    expect(invalid).toBeTruthy();
    expect(seen).toEqual([]);
  });
});

describe("Dropdown", () => {
  const setup = (): ReturnType<typeof vi.fn> => {
    const onChange = vi.fn();
    render(<Dropdown options={UNITS} value="kg" onChange={onChange} ariaLabel="Unit" />);
    return onChange;
  };
  const trigger = (): HTMLElement => screen.getByRole("button", { name: "Unit" });

  it("shows the chosen option's label, closed", () => {
    setup();
    expect(trigger()).toHaveTextContent("Kilograms");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens a list of the options, with the chosen one selected", () => {
    setup();
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Kilograms" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("reports a picked option and closes", () => {
    const onChange = setup();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Pounds" }));
    expect(onChange).toHaveBeenCalledWith("lb");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on Escape without choosing, and gives focus back to the trigger", () => {
    const onChange = setup();
    fireEvent.click(trigger());
    press("Escape");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  describe("from the keyboard", () => {
    const UNITS_AND_STONE: Option[] = [...UNITS, { value: "st", label: "Stone" }];
    const option = (name: string): HTMLElement => screen.getByRole("option", { name });
    const key = (keyName: string): boolean =>
      fireEvent.keyDown(document.activeElement as Element, { key: keyName });
    const open = (onChange = vi.fn()): ReturnType<typeof vi.fn> => {
      render(
        <Dropdown options={UNITS_AND_STONE} value="lb" onChange={onChange} ariaLabel="Unit" />,
      );
      trigger().focus();
      key("ArrowDown");
      return onChange;
    };

    it("opens on ↓ with focus on the chosen option, the list's one tab stop", () => {
      open();
      expect(screen.getByRole("listbox", { name: "Unit" })).toBeInTheDocument();
      expect(option("Pounds")).toHaveFocus();
      expect(
        [option("Kilograms"), option("Pounds"), option("Stone")].map((o) => o.tabIndex),
      ).toEqual([-1, 0, -1]);
    });

    it("moves with the arrows, Home and End, and to an option by its first letter", () => {
      open();
      key("ArrowDown");
      expect(option("Stone")).toHaveFocus();
      key("ArrowUp");
      key("ArrowUp");
      expect(option("Kilograms")).toHaveFocus();
      key("End");
      expect(option("Stone")).toHaveFocus();
      key("Home");
      expect(option("Kilograms")).toHaveFocus();
      key("p");
      expect(option("Pounds")).toHaveFocus();
    });

    it("picks the focused option with Enter, closes, and gives focus back to the trigger", () => {
      const onChange = open();
      key("ArrowDown");
      fireEvent.click(document.activeElement as Element);
      expect(onChange).toHaveBeenCalledWith("st");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(trigger()).toHaveFocus();
    });
  });

  it("closes on a click outside without choosing", () => {
    const onChange = setup();
    fireEvent.click(trigger());
    fireEvent.click(document.querySelector("[data-dropdown-backdrop]") as Element);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when the trigger is clicked again", () => {
    setup();
    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("types its keys from the options", () => {
    const seen: Unit[] = [];
    render(<Dropdown options={UNITS} value="kg" onChange={(unit) => seen.push(unit)} />);
    // @ts-expect-error "stone" is not one of the option keys
    const invalid = <Dropdown<Unit> options={UNITS} value="stone" onChange={vi.fn()} />;
    expect(invalid).toBeTruthy();
  });
});

describe("MenuButton", () => {
  type Action = "pause" | "skip" | "stop";
  const ACTIONS: Option<Action>[] = [
    { value: "pause", label: "Pause nudges" },
    { value: "skip", label: "Skip today" },
    { value: "stop", label: "Stop nudging today" },
  ];
  const setup = (): ReturnType<typeof vi.fn> => {
    const onPick = vi.fn();
    render(<MenuButton label="Pause" items={ACTIONS} onPick={onPick} />);
    return onPick;
  };
  const trigger = (): HTMLElement => screen.getByRole("button", { name: "Pause" });
  const item = (name: string): HTMLElement => screen.getByRole("menuitem", { name });
  const key = (keyName: string): boolean =>
    fireEvent.keyDown(document.activeElement as Element, { key: keyName });

  it("is a button that says its label and opens a menu, closed until clicked", () => {
    setup();
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens a menu of its actions, none of them selected, focus on the first", () => {
    setup();
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Pause nudges",
      "Skip today",
      "Stop nudging today",
    ]);
    expect(screen.queryByRole("option")).toBeNull();
    expect(item("Skip today")).not.toHaveAttribute("aria-selected");
    expect(item("Pause nudges")).toHaveFocus();
  });

  it("runs the picked action, closes, and gives focus back to the button", () => {
    const onPick = setup();
    fireEvent.click(trigger());
    fireEvent.click(item("Skip today"));
    expect(onPick.mock.calls).toEqual([["skip"]]);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("opens on ↓ from the keyboard, moves with the arrows and letters, and picks with Enter", () => {
    const onPick = setup();
    trigger().focus();
    key("ArrowDown");
    expect(item("Pause nudges")).toHaveFocus();
    key("ArrowDown");
    expect(item("Skip today")).toHaveFocus();
    key("ArrowUp");
    key("ArrowUp");
    expect(item("Stop nudging today")).toHaveFocus();
    key("p");
    expect(item("Pause nudges")).toHaveFocus();
    key("End");
    // Enter on a focused button is its click.
    fireEvent.click(document.activeElement as Element);
    expect(onPick.mock.calls).toEqual([["stop"]]);
  });

  it("closes on Escape without acting, and gives focus back to the button", () => {
    const onPick = setup();
    fireEvent.click(trigger());
    press("Escape");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside, or on the button again, without acting", () => {
    const onPick = setup();
    fireEvent.click(trigger());
    fireEvent.click(document.querySelector("[data-dropdown-backdrop]") as Element);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("Chip", () => {
  it("is a static label, not a control", () => {
    render(<Chip>Front Delts</Chip>);
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders as a tag too", () => {
    render(
      <Chip variant="tag" tone="accent">
        CUSTOM
      </Chip>,
    );
    expect(screen.getByText("CUSTOM")).toBeInTheDocument();
  });
});

describe("ChipGroup", () => {
  it("renders a chip per option, pressed for the selected keys", () => {
    render(<ChipGroup options={UNITS} selected={["lb"]} onToggle={vi.fn()} ariaLabel="Units" />);
    const group = screen.getByRole("group", { name: "Units" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Pounds" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Kilograms" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the option of the chip that was clicked, typed from the options", () => {
    const toggled: Unit[] = [];
    render(
      <ChipGroup options={UNITS} selected={[]} onToggle={({ value }) => toggled.push(value)} />,
    );
    click("Kilograms");
    expect(toggled).toEqual(["kg"]);
  });

  it("hands back an option with whatever its view-model gave it", () => {
    const options = UNITS.map((option) => ({ ...option, patch: { unit: option.value } }));
    const onToggle = vi.fn();
    render(<ChipGroup options={options} selected={[]} onToggle={onToggle} />);
    click("Pounds");
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ patch: { unit: "lb" } }));
  });
});
