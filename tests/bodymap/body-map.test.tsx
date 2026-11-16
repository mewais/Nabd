import { render, screen } from "@testing-library/react";
import { BodyMap, BodyMapPair } from "@nabd/bodymap";
import type { BodySide } from "@nabd/bodymap";
import type { Coverage, MapStyle } from "@nabd/domain";
import { coverageOf } from "./coverage";

function region(slug: string, coverage: Coverage, side: BodySide = "front", mapStyle?: MapStyle) {
  const { container } = render(<BodyMap side={side} coverage={coverage} mapStyle={mapStyle} />);
  const group = container.querySelector<SVGGElement>(`[data-region="${slug}"]`);
  if (group === null) throw new Error(`no region "${slug}" on the ${side}`);
  return group;
}

describe("BodyMap", () => {
  it.each(["front", "back"] as const)("draws the %s of the body as a labelled image", (side) => {
    render(<BodyMap side={side} coverage={coverageOf()} />);
    const map = screen.getByRole("img", { name: `Body, ${side}` });
    expect(map.querySelectorAll("path").length).toBeGreaterThan(20);
  });

  it("draws different regions on each side", () => {
    expect(region("chest", coverageOf(), "front")).toBeTruthy();
    expect(() => region("chest", coverageOf(), "back")).toThrow();
    expect(region("gluteal", coverageOf(), "back")).toBeTruthy();
  });

  it("leaves untrained regions neutral", () => {
    expect(region("chest", coverageOf()).style.fill).toBe("var(--map-muscle)");
  });

  it("fills a trained region with the accent, stronger the more it is covered", () => {
    const light = region("chest", coverageOf({ chest: 20 })).style;
    const heavy = region("chest", coverageOf({ chest: 90 })).style;
    expect(light.fill).toBe("var(--accent)");
    expect(Number(heavy.fillOpacity)).toBeGreaterThan(Number(light.fillOpacity));
    expect(Number(heavy.fillOpacity)).toBeLessThanOrEqual(1);
  });

  it("only strokes trained regions in the outline style", () => {
    const style = region("chest", coverageOf({ chest: 80 }), "front", "outline").style;
    expect(style.fill).toBe("var(--map-muscle)");
    expect(style.stroke).toBe("var(--accent)");
  });

  it("averages the muscles that share a region and names them in its tooltip", () => {
    const deltoids = region("deltoids", coverageOf({ front_delts: 90, side_delts: 30 }));
    expect(deltoids.querySelector("title")).toHaveTextContent(
      "Front Delts, Side Delts, Rear Delts · 40%",
    );
  });

  it("treats coverage beyond 0–100 as the nearest bound", () => {
    const over = region("chest", coverageOf({ chest: 250 }));
    expect(over.querySelector("title")).toHaveTextContent("Chest · 100%");
    expect(Number(over.style.fillOpacity)).toBe(1);
  });

  it("never tints regions that track no muscle", () => {
    const everything = coverageOf({ chest: 100, neck: 100, front_delts: 100 });
    const head = region("head", everything);
    expect(head.style.fill).toBe("var(--map-muscle)");
    expect(head.querySelector("title")).toBeNull();
  });
});

describe("BodyMapPair", () => {
  it("shows the front and the back, each under its label", () => {
    render(<BodyMapPair coverage={coverageOf()} />);
    expect(screen.getByText("front")).toBeInTheDocument();
    expect(screen.getByText("back")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it.each(["front", "back"] as const)("shows only the %s when asked", (side) => {
    render(<BodyMapPair coverage={coverageOf()} view={side} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(`Body, ${side}`);
  });

  it("passes the coverage and the style on to both maps", () => {
    const { container } = render(
      <BodyMapPair coverage={coverageOf({ chest: 80, glutes: 80 })} mapStyle="outline" />,
    );
    for (const slug of ["chest", "gluteal"]) {
      const group = container.querySelector<SVGGElement>(`[data-region="${slug}"]`);
      expect(group?.style.stroke, slug).toBe("var(--accent)");
    }
  });
});
