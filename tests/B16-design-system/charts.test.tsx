import { render, screen } from "@testing-library/react";
import { BarChart, LiveDot, MeterBar, Sparkline, polylinePoints } from "@nabd/design-system";
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
  const fill = (item: HTMLElement | undefined): HTMLElement =>
    item?.querySelector("div") as HTMLElement;

  it("draws one captioned bar per datum, under the chart's name", () => {
    const items = setup();
    expect(screen.getByRole("list", { name: "Sets per day" })).toBeInTheDocument();
    expect(items.map((item) => item.textContent)).toEqual(["12Mon", "6Tue", "Wed"]);
  });

  it("makes each bar as tall as its share", () => {
    const items = setup();
    expect(items.map((item) => fill(item).style.height)).toEqual(["100%", "50%", "0%"]);
  });

  it("marks the highlighted bar and paints it differently", () => {
    const [plain, highlighted] = setup();
    expect(highlighted).toHaveAttribute("aria-current", "true");
    expect(plain).not.toHaveAttribute("aria-current");
    expect(fill(highlighted).style.background).not.toBe(fill(plain).style.background);
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

describe("polylinePoints", () => {
  it("spreads the series across the box, highest value at the top", () => {
    expect(polylinePoints([0, 5, 10], 100, 50, 10)).toBe("10.0,40.0 50.0,25.0 90.0,10.0");
  });

  it("draws a flat series along the middle", () => {
    expect(polylinePoints([7, 7], 100, 50, 10)).toBe("10.0,25.0 90.0,25.0");
  });

  it("places a single value at the left edge", () => {
    expect(polylinePoints([3], 100, 50, 10)).toBe("10.0,25.0");
  });
});

describe("Sparkline", () => {
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
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("47%");
  });

  it.each([
    [140, "100%"],
    [-5, "0%"],
  ])("clamps a %s%% reading to the bar (%s)", (pct, width) => {
    expect((meter(pct).firstElementChild as HTMLElement).style.width).toBe(width);
  });

  it("renders what it is given after the figure", () => {
    render(<MeterBar label="Quads" pct={10} value="2 sets" trailing={<b>Push</b>} />);
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "2 sets");
  });
});

describe("LiveDot", () => {
  it("pulses only while active", () => {
    const idle = renderRoot(<LiveDot active={false} />);
    expect(idle).toHaveAttribute("data-active", "false");
    expect(idle.style.animation).toBe("");

    const live = renderRoot(<LiveDot active />);
    expect(live).toHaveAttribute("data-active", "true");
    expect(live.style.animation).not.toBe("");
  });
});
