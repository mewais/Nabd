import { render, screen } from "@testing-library/react";
import { LineChart } from "@nabd/design-system";

describe("LineChart", () => {
  const gridLabels = (): (string | null)[] =>
    [...screen.getByRole("img").querySelectorAll("text")].map((label) => label.textContent);

  it("is named for assistive tech", () => {
    render(<LineChart series={[40, 50, 60]} ariaLabel="Bench press history" />);
    expect(screen.getByRole("img", { name: "Bench press history" })).toBeInTheDocument();
  });

  it("labels the high, middle and low of the series with at most one decimal", () => {
    render(<LineChart series={[40, 47.25, 61.04]} ariaLabel="History" />);
    expect(gridLabels()).toEqual(["61", "50.5", "40"]);
  });

  it("draws one point per value, left edge to right edge, highest value on top", () => {
    render(<LineChart series={[40, 60, 50]} ariaLabel="History" />);
    const line = screen.getByRole("img").querySelector("polyline");
    expect(line?.getAttribute("points")).toBe("30.0,210.0 340.0,30.0 650.0,120.0");
  });

  it("closes the filled area down to the baseline at both ends", () => {
    render(<LineChart series={[40, 60]} ariaLabel="History" />);
    const area = screen.getByRole("img").querySelector("polygon");
    expect(area?.getAttribute("points")).toBe("30,210 30.0,210.0 650.0,30.0 650,210");
  });

  it("keeps a flat series on the middle line", () => {
    render(<LineChart series={[12, 12]} ariaLabel="History" />);
    const line = screen.getByRole("img").querySelector("polyline");
    expect(line?.getAttribute("points")).toBe("30.0,120.0 650.0,120.0");
  });
});
