import { fireEvent, render, screen } from "@testing-library/react";
import { Stepper, TextInput, Toggle } from "@nabd/design-system";
import { click } from "./render";

describe("Stepper", () => {
  it("shows the value between a decrease and an increase button", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<Stepper value="50 min" onDec={onDec} onInc={onInc} />);

    expect(screen.getByText("50 min")).toBeInTheDocument();
    click("decrease");
    expect(onDec).toHaveBeenCalledTimes(1);
    expect(onInc).not.toHaveBeenCalled();
    click("increase");
    expect(onInc).toHaveBeenCalledTimes(1);
  });

  it("names the group after what it steps", () => {
    render(<Stepper value="90s" onDec={vi.fn()} onInc={vi.fn()} size="mini" ariaLabel="Rest" />);
    expect(screen.getByRole("group", { name: "Rest" })).toHaveTextContent("90s");
  });

  it("offers no input unless the value can be typed", () => {
    render(<Stepper value={8} onDec={vi.fn()} onInc={vi.fn()} />);
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  describe("with a typed value", () => {
    const setup = (): ReturnType<typeof vi.fn> => {
      const onSet = vi.fn();
      render(<Stepper value={27.5} onDec={vi.fn()} onInc={vi.fn()} onSet={onSet} ariaLabel="lb" />);
      return onSet;
    };

    it("shows the value in an input named after what it steps", () => {
      setup();
      expect(screen.getByLabelText("lb")).toHaveValue(27.5);
    });

    it("reports a typed number", () => {
      const onSet = setup();
      fireEvent.change(screen.getByLabelText("lb"), { target: { value: "30" } });
      expect(onSet).toHaveBeenCalledWith(30);
    });

    it("ignores input that is not a number", () => {
      const onSet = setup();
      fireEvent.change(screen.getByLabelText("lb"), { target: { value: "" } });
      expect(onSet).not.toHaveBeenCalled();
    });

    it("only allows onSet together with a numeric value", () => {
      // @ts-expect-error a typed stepper needs a number to put in its input
      const invalid = <Stepper value="8–12" onDec={vi.fn()} onInc={vi.fn()} onSet={vi.fn()} />;
      expect(invalid).toBeTruthy();
    });
  });
});

describe("Toggle", () => {
  it("is a switch that reports its state", () => {
    render(<Toggle on onChange={vi.fn()} ariaLabel="Open at startup" />);
    expect(screen.getByRole("switch", { name: "Open at startup" })).toBeChecked();
  });

  it.each([
    [true, false],
    [false, true],
  ])("asks to flip when clicked (on: %s → %s)", (on, next) => {
    const onChange = vi.fn();
    render(<Toggle on={on} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(next);
  });

  it("can be reached and operated from the keyboard", () => {
    render(<Toggle on={false} onChange={vi.fn()} />);
    const toggle = screen.getByRole("switch");
    toggle.focus();
    expect(toggle).toHaveFocus();
    expect(toggle.tagName).toBe("BUTTON");
  });
});

describe("TextInput", () => {
  it("shows its value and placeholder and reports what is typed", () => {
    const onChange = vi.fn();
    render(<TextInput value="Curl" onChange={onChange} placeholder="Exercise name" />);
    const input = screen.getByPlaceholderText("Exercise name");
    expect(input).toHaveValue("Curl");
    fireEvent.change(input, { target: { value: "Curls" } });
    expect(onChange).toHaveBeenCalledWith("Curls");
  });

  it("becomes a search box on request", () => {
    render(<TextInput type="search" value="" onChange={vi.fn()} ariaLabel="Search exercises" />);
    expect(screen.getByRole("searchbox", { name: "Search exercises" })).toBeInTheDocument();
  });
});
