import { render, screen } from "@testing-library/react";
import { BarChart, LiveDot, MeterBar, Sparkline } from "@nabd/design-system";
import { renderRoot } from "./render";

describe("BarChart", () => {
  const BARS = [
    { label: "Mon", heightPct: 100, value: "12" },
    { label: "Tue", heightPct: 50, value: "6", highlight: true },
    { label: "Wed", heightPct: 0 },
  ];
  const setup = (): HTMLElement[] => {
    render(<BarChart bars={BARS} height={160} ariaLabel="Sets per day" />);
    return screen.getAllByRole("listitem");
  };
  it("draws one captioned bar per datum, under the chart's name", () => {
    const items = setup();
    expect(screen.getByRole("list", { name: "Sets per day" })).toBeInTheDocument();
    expect(items.map((item) => item.textContent)).toEqual(["12Mon", "6Tue", "Wed"]);
  });

  it("makes each bar as tall as its share", () => {
    const items = setup();
    expect(items.map((item) => item.dataset.heightPct)).toEqual(["100", "50", "0"]);
  });

  it("marks the highlighted bar", () => {
    const [plain, highlighted] = setup();
    expect(highlighted).toHaveAttribute("aria-current", "true");
    expect(plain).not.toHaveAttribute("aria-current");
  });

  it("keeps a bar whose caption is blank", () => {
    render(
      <BarChart
        bars={[
          { label: "9a", heightPct: 40 },
          { label: "", heightPct: 80 },
        ]}
        height={124}
        ariaLabel="Sets by hour"
      />,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["9a", ""]);
  });

  it("accepts bars that share a caption", () => {
    render(
      <BarChart
        bars={[
          { label: "T", heightPct: 10 },
          { label: "T", heightPct: 20 },
        ]}
        height={88}
        ariaLabel="Week"
      />,
    );
    expect(screen.getAllByText("T")).toHaveLength(2);
  });
});

describe("Sparkline", () => {
  const pointsOf = (series: number[]): string | null | undefined => {
    const { container } = render(<Sparkline series={series} />);
    return container.querySelector("polyline")?.getAttribute("points");
  };

  it("spreads the series across its box, highest value at the top", () => {
    expect(pointsOf([0, 5, 10])).toBe("5.0,29.0 60.0,17.0 115.0,5.0");
  });

  it("draws a flat series along the middle", () => {
    expect(pointsOf([7, 7])).toBe("5.0,17.0 115.0,17.0");
  });

  it("places a single value at the left edge", () => {
    expect(pointsOf([3])).toBe("5.0,17.0");
  });

  it("draws one point per value, as a labelled image", () => {
    render(<Sparkline series={[60, 62.5, 65, 65]} ariaLabel="Bench press trend" />);
    const points = screen
      .getByRole("img", { name: "Bench press trend" })
      .querySelector("polyline")
      ?.getAttribute("points");
    expect(points?.split(" ")).toHaveLength(4);
  });
});

describe("MeterBar", () => {
  const meter = (pct: number): HTMLElement => {
    render(<MeterBar label="Lats" pct={pct} value={`${pct}%`} />);
    return screen.getByRole("meter", { name: "Lats" });
  };

  it("shows the label and the figure, and fills the bar to the percentage", () => {
    const bar = meter(47);
    expect(screen.getByText("Lats")).toBeInTheDocument();
    expect(screen.getByText("47%")).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "47");
  });

  it.each([
    [140, "100"],
    [-5, "0"],
  ])("clamps a %s%% reading to the bar (%s)", (pct, filled) => {
    expect(meter(pct)).toHaveAttribute("aria-valuenow", filled);
  });

  it("renders what it is given after the figure", () => {
    render(<MeterBar label="Quads" pct={10} value="2 sets" trailing={<b>Push</b>} />);
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "2 sets");
  });
});

describe("LiveDot", () => {
  it("says whether it is active", () => {
    expect(renderRoot(<LiveDot active={false} />)).toHaveAttribute("data-active", "false");
    expect(renderRoot(<LiveDot active />)).toHaveAttribute("data-active", "true");
  });
});
