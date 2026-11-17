import { render, screen } from "@testing-library/react";
import { BodyMapPair } from "@nabd/bodymap";
import type { Coverage } from "@nabd/domain";
import type { MapStyle } from "@nabd/view";
import { coverageOf } from "../support/builders";

type Side = "front" | "back";

/** One side of the body map alone. */
const BodyMap = (props: { side: Side; coverage: Coverage; mapStyle?: MapStyle }) => (
  <BodyMapPair view={props.side} coverage={props.coverage} mapStyle={props.mapStyle} />
);

function region(slug: string, coverage: Coverage, side: Side = "front", mapStyle?: MapStyle) {
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

  it("marks each region that tracks a muscle with how covered it is", () => {
    expect(region("chest", coverageOf()).dataset.coverage).toBe("0");
    expect(region("chest", coverageOf({ chest: 20 })).dataset.coverage).toBe("20");
    expect(region("chest", coverageOf({ chest: 90 })).dataset.coverage).toBe("90");
  });

  it("is drawn in the heat style unless asked for outlines", () => {
    const styleOf = (mapStyle?: MapStyle) =>
      region("chest", coverageOf({ chest: 80 }), "front", mapStyle).closest("svg")?.dataset
        .mapStyle;
    expect(styleOf()).toBe("heat");
    expect(styleOf("outline")).toBe("outline");
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
    expect(over.dataset.coverage).toBe("100");
  });

  it("never tints regions that track no muscle", () => {
    const everything = coverageOf({ chest: 100, neck: 100, front_delts: 100 });
    const head = region("head", everything);
    expect(head.dataset.coverage).toBeUndefined();
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
      <BodyMapPair coverage={coverageOf({ chest: 80, lower_back: 80 })} mapStyle="outline" />,
    );
    for (const slug of ["chest", "lower-back"]) {
      const group = container.querySelector<SVGGElement>(`[data-region="${slug}"]`);
      expect(group?.dataset.coverage, slug).toBe("80");
      expect(group?.closest("svg")?.dataset.mapStyle, slug).toBe("outline");
    }
  });
});
