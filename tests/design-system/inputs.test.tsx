import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberField, Stepper, TextInput, Toggle } from "@nabd/design-system";
import { click } from "./render";

describe("Stepper", () => {
  it("shows the value between a decrease and an increase button, named for what they step", () => {
    const onStep = vi.fn();
    render(<Stepper value="50 min" onStep={onStep} ariaLabel="Interval" />);

    expect(screen.getByText("50 min")).toBeInTheDocument();
    click("Decrease interval");
    expect(onStep.mock.calls).toEqual([[-1]]);
    click("Increase interval");
    expect(onStep.mock.calls).toEqual([[-1], [1]]);
  });

  it("names the group after what it steps", () => {
    render(<Stepper value="90s" onStep={vi.fn()} size="sm" ariaLabel="Rest" />);
    expect(screen.getByRole("group", { name: "Rest" })).toHaveTextContent("90s");
  });

  it("offers no input unless the value can be typed", () => {
    render(<Stepper value={8} onStep={vi.fn()} ariaLabel="Reps" />);
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  describe("with a typed value", () => {
    /** A stepper over a number its owner keeps — and may refuse to change (above `max`). */
    function Owned({ start, max = Infinity }: { start: number; max?: number }): JSX.Element {
      const [value, setValue] = useState(start);
      return (
        <Stepper
          value={value}
          onStep={(direction) => setValue(value + direction * 2.5)}
          onSet={(typed) => {
            if (typed <= max) setValue(typed);
          }}
          onEnter={() => onEnter(value)}
          ariaLabel="kg"
        />
      );
    }
    const onEnter = vi.fn();
    const field = (): HTMLElement => screen.getByRole("spinbutton", { name: "kg" });
    const type = (text: string): boolean => fireEvent.change(field(), { target: { value: text } });
    const press = (key: string): boolean => fireEvent.keyDown(field(), { key });

    beforeEach(() => onEnter.mockClear());

    it("shows the value in a field named after what it steps", () => {
      render(<Owned start={27.5} />);
      expect(field()).toHaveValue("27.5");
      expect(field()).toHaveAttribute("aria-valuenow", "27.5");
    });

    it("can be emptied and typed afresh, digit by digit", () => {
      render(<Owned start={100} />);
      type("10");
      type("1");
      type("");
      expect(field()).toHaveValue("");
      type("6");
      type("60");
      expect(field()).toHaveValue("60");
      press("Enter");
      expect(onEnter).toHaveBeenCalledWith(60);
    });

    it("keeps what is typed exactly as typed, a trailing point or zero included", () => {
      render(<Owned start={20} />);
      for (const text of ["2", "21", "21.", "21.2", "21.25"]) {
        type(text);
        expect(field()).toHaveValue(text);
      }
      type("21.50");
      expect(field()).toHaveValue("21.50");
      fireEvent.blur(field());
      expect(field()).toHaveValue("21.5");
    });

    it("reads a comma as the decimal point", () => {
      render(<Owned start={20} />);
      type("22,5");
      fireEvent.blur(field());
      expect(field()).toHaveValue("22.5");
    });

    it("left empty or with something that is no number, goes back to the last number on blur", () => {
      render(<Owned start={40} />);
      type("42");
      type("");
      fireEvent.blur(field());
      expect(field()).toHaveValue("42");
      type("4x");
      expect(field()).toHaveValue("4x");
      fireEvent.blur(field());
      expect(field()).toHaveValue("42");
    });

    it("shows what the owner kept when it would not take the number typed", () => {
      render(<Owned start={40} max={500} />);
      type("99999");
      expect(field()).toHaveValue("99999");
      fireEvent.blur(field());
      expect(field()).toHaveValue("40");
    });

    it("Enter does nothing while the field holds no number", () => {
      render(<Owned start={40} />);
      type("");
      press("Enter");
      expect(onEnter).not.toHaveBeenCalled();
      expect(field()).toHaveValue("");
    });

    it("↑ and ↓ step by the control's own step, like its buttons", () => {
      render(<Owned start={40} />);
      press("ArrowUp");
      expect(field()).toHaveValue("42.5");
      press("ArrowDown");
      press("ArrowDown");
      expect(field()).toHaveValue("37.5");
      // Stepping lets go of whatever was half typed.
      type("3");
      click("Increase kg");
      expect(field()).toHaveValue("5.5");
    });

    it("only allows onSet together with a numeric value", () => {
      // @ts-expect-error a typed stepper needs a number to put in its input
      const invalid = <Stepper value="8–12" onDec={vi.fn()} onInc={vi.fn()} onSet={vi.fn()} />;
      expect(invalid).toBeTruthy();
    });
  });
});

describe("NumberField", () => {
  /** A field over an optional number its owner keeps, taking only 20–400. */
  function Owned({ start }: { start: number | null }): JSX.Element {
    const [value, setValue] = useState(start);
    return (
      <NumberField
        value={value}
        onSet={(typed) => {
          if (typed >= 20 && typed <= 400) setValue(typed);
        }}
        onClear={() => setValue(null)}
        ariaLabel="Body weight"
        placeholder="kg"
      />
    );
  }
  const field = (): HTMLElement => screen.getByRole("textbox", { name: "Body weight" });
  const type = (text: string): boolean => fireEvent.change(field(), { target: { value: text } });

  it("is empty, showing its placeholder, while there is no number", () => {
    render(<Owned start={null} />);
    expect(field()).toHaveValue("");
    expect(field()).toHaveAttribute("placeholder", "kg");
  });

  it("takes a number typed digit by digit, though the first digits alone are refused", () => {
    render(<Owned start={null} />);
    type("8");
    type("81");
    type("81.5");
    fireEvent.blur(field());
    expect(field()).toHaveValue("81.5");
  });

  it("is cleared by emptying it", () => {
    render(<Owned start={80} />);
    type("");
    fireEvent.blur(field());
    expect(field()).toHaveValue("");
  });

  it("is a plain field, not a spin button, unless it can be stepped", () => {
    render(<Owned start={80} />);
    expect(screen.queryByRole("spinbutton")).toBeNull();
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

  it("disabled, it shows its state but cannot be flipped", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
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
