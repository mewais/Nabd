import { render, screen } from "@testing-library/react";
import { Button, EmptyNote, RowButton, Segmented, THEME_OPTIONS } from "@nabd/design-system";
import { choose, click } from "./render";

describe("RowButton", () => {
  it("is a button named by its content that calls onClick when any part is pressed", () => {
    const onClick = vi.fn();
    render(
      <RowButton onClick={onClick}>
        <span>Pull-Up</span>
        <span>10 reps</span>
      </RowButton>,
    );
    click("Pull-Up 10 reps");
    screen.getByText("10 reps").click();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("takes an explicit accessible name", () => {
    render(
      <RowButton onClick={vi.fn()} ariaLabel="Open Pull-Up history">
        Pull-Up
      </RowButton>,
    );
    expect(screen.getByRole("button", { name: "Open Pull-Up history" })).toBeInTheDocument();
  });

  it("marks the row that is selected in its list", () => {
    render(
      <>
        <RowButton onClick={vi.fn()} selected>
          Bench Press
        </RowButton>
        <RowButton onClick={vi.fn()}>Plank</RowButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Bench Press", current: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plank", current: false })).toBeInTheDocument();
  });
});

describe("RowButton as a destination of the navigation", () => {
  it("is a button named by its label that calls onClick", () => {
    const onClick = vi.fn();
    render(
      <RowButton variant="nav" selected={false} onClick={onClick}>
        Plan
      </RowButton>,
    );
    click("Plan");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks only the selected destination as the current page", () => {
    render(
      <>
        <RowButton variant="nav" selected onClick={vi.fn()}>
          Today
        </RowButton>
        <RowButton variant="nav" selected={false} onClick={vi.fn()}>
          Plan
        </RowButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Plan" })).not.toHaveAttribute("aria-current");
  });
});

describe("Button as a mode switch", () => {
  it("reports whether its mode is on", () => {
    const { rerender } = render(<Button on={false}>Glass</Button>);
    expect(screen.getByRole("button", { name: "Glass" })).toHaveAttribute("aria-pressed", "false");
    rerender(<Button on>Glass</Button>);
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
    choose("Light");
    expect(onChange).toHaveBeenCalledWith("light");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });
});

describe("EmptyNote", () => {
  it("shows its sentence as a paragraph", () => {
    render(<EmptyNote>No sets logged yet.</EmptyNote>);
    expect(screen.getByText("No sets logged yet.").tagName).toBe("P");
  });
});
