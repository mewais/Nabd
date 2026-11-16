import { render, screen } from "@testing-library/react";
import { MuscleBar } from "@nabd/bodymap";

describe("MuscleBar", () => {
  it("shows the muscle's name and its coverage as a meter", () => {
    render(<MuscleBar muscle="front_delts" pct={46.6} recommendation="none" />);
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
    expect(screen.getByText("47%")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Front Delts" })).toHaveAttribute(
      "aria-valuenow",
      "47",
    );
  });

  it.each([
    ["rest", "Rest"],
    ["push", "Push"],
  ] as const)("tags a muscle the engine says to %s", (recommendation, tag) => {
    render(<MuscleBar muscle="lats" pct={50} recommendation={recommendation} />);
    expect(screen.getByText(tag)).toBeInTheDocument();
  });

  it("shows no tag when nothing is recommended, whatever the coverage", () => {
    render(<MuscleBar muscle="lats" pct={5} recommendation="none" />);
    expect(screen.queryByText("Push")).toBeNull();
    expect(screen.queryByText("Rest")).toBeNull();
  });
});
