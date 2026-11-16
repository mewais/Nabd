import { fireEvent, render, screen } from "@testing-library/react";
import { Chip, ChipGroup, ChipToggle, Dropdown, Segmented } from "@nabd/design-system";
import type { Option } from "@nabd/design-system";
import { click, press } from "./render";

type Unit = "kg" | "lb";
const UNITS: Option<Unit>[] = [
  { value: "kg", label: "Kilograms" },
  { value: "lb", label: "Pounds" },
];

describe("Segmented", () => {
  it("offers every option and marks the chosen one", () => {
    render(<Segmented options={UNITS} value="lb" onChange={vi.fn()} ariaLabel="Weight unit" />);
    const group = screen.getByRole("group", { name: "Weight unit" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Pounds" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Kilograms" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the option that was clicked", () => {
    const onChange = vi.fn();
    render(<Segmented options={UNITS} value="kg" onChange={onChange} />);
    click("Pounds");
    expect(onChange).toHaveBeenCalledWith("lb");
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

  it("closes on Escape without choosing", () => {
    const onChange = setup();
    fireEvent.click(trigger());
    press("Escape");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
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

describe("ChipToggle", () => {
  it.each([true, false])("reports whether it is on (%s) and asks to toggle on click", (active) => {
    const onToggle = vi.fn();
    render(
      <ChipToggle active={active} onToggle={onToggle}>
        Dumbbells
      </ChipToggle>,
    );
    expect(screen.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      String(active),
    );
    click("Dumbbells");
    expect(onToggle).toHaveBeenCalledTimes(1);
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

  it("reports the key of the chip that was clicked, typed from the options", () => {
    const toggled: Unit[] = [];
    render(<ChipGroup options={UNITS} selected={[]} onToggle={(unit) => toggled.push(unit)} />);
    click("Kilograms");
    expect(toggled).toEqual(["kg"]);
  });
});
