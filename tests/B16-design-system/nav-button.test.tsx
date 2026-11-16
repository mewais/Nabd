import { render, screen } from "@testing-library/react";
import { Button, NavButton, Segmented, THEME_OPTIONS } from "@nabd/design-system";
import { click } from "./render";

describe("NavButton", () => {
  it("is a button named by its label that calls onClick", () => {
    const onClick = vi.fn();
    render(<NavButton icon="plan" label="Plan" active={false} onClick={onClick} />);
    click("Plan");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks only the active destination as the current page", () => {
    render(
      <>
        <NavButton icon="today" label="Today" active onClick={vi.fn()} />
        <NavButton icon="plan" label="Plan" active={false} onClick={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Plan" })).not.toHaveAttribute("aria-current");
  });
});

describe("Button as a mode switch", () => {
  it("reports whether its mode is on", () => {
    const { rerender } = render(<Button pressed={false}>Glass</Button>);
    expect(screen.getByRole("button", { name: "Glass" })).toHaveAttribute("aria-pressed", "false");
    rerender(<Button pressed>Glass</Button>);
    expect(screen.getByRole("button", { name: "Glass" })).toHaveAttribute("aria-pressed", "true");
  });

  it("is a plain button when it switches nothing", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-pressed");
  });
});

describe("THEME_OPTIONS", () => {
  it("offers the light and dark themes to a segmented switch", () => {
    const onChange = vi.fn();
    render(<Segmented options={THEME_OPTIONS} value="dark" onChange={onChange} />);
    click("Light");
    expect(onChange).toHaveBeenCalledWith("light");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  });
});
