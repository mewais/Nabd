import { render, screen } from "@testing-library/react";
import { Card } from "@nabd/design-system";

describe("Card", () => {
  it("shows a header with title, subtitle and action when given", () => {
    render(
      <Card title="Consistency" subtitle="Last 8 weeks" action={<button>Weekly</button>}>
        body
      </Card>,
    );
    expect(screen.getByText("Consistency")).toBeInTheDocument();
    expect(screen.getByText("Last 8 weeks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("is a region named by its title, or by its label when it has none", () => {
    render(<Card title="Coverage">body</Card>);
    render(<Card ariaLabel="Up next">body</Card>);
    expect(screen.getByRole("region", { name: "Coverage" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Up next" })).toBeInTheDocument();
  });

  it("is a plain box when nothing names it", () => {
    render(<Card>body</Card>);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("takes a header of its own making in place of the title row", () => {
    render(<Card header={<h3>Custom</h3>}>body</Card>);
    expect(screen.getByRole("heading", { name: "Custom" })).toBeInTheDocument();
  });
});
