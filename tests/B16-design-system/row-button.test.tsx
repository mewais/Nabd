import { render, screen } from "@testing-library/react";
import { EmptyNote, RowButton, shade } from "@nabd/design-system";
import { click } from "./render";

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
});

describe("EmptyNote", () => {
  it("shows its sentence as a paragraph", () => {
    render(<EmptyNote>No sets logged yet.</EmptyNote>);
    expect(screen.getByText("No sets logged yet.").tagName).toBe("P");
  });
});

describe("shade", () => {
  it("mixes a share of a colour into the quiet fill", () => {
    expect(shade("var(--accent)", 30)).toBe(
      "color-mix(in oklch, var(--accent) 30%, var(--surface2))",
    );
  });
});
