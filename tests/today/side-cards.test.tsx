/**
 * @nabd/today — the right-hand column: muscle coverage, the volume
 * insight and the stat tiles.
 */

import { fireEvent, screen, within } from "@testing-library/react";
import { EMPTY_PROGRAM } from "@nabd/domain";
import { nov } from "../support/builders";
import { did, pushDay } from "../support/programs";
import { todayVM } from "./fixtures";
import type { TodayOptions } from "./fixtures";
import { renderToday } from "./render";

/** Twelve chest sets last Friday: chest is well covered, the rest of the plan lags. */
const benchWeek = () =>
  Array.from({ length: 12 }, (unused, i) => did(null, "bench", 8, 60, { at: nov(13, 12, i) }));

const chestDay = (options: TodayOptions = {}) =>
  renderToday(todayVM({ program: pushDay(), history: benchWeek() }, options));

describe("Today · muscle coverage", () => {
  it("draws both sides of the body by default", () => {
    chestDay();
    expect(screen.getByRole("img", { name: "Body, front" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Body, back" })).toBeInTheDocument();
  });

  it.each([
    ["front", "back"],
    ["back", "front"],
  ] as const)("in '%s' view the %s map is not drawn", (view, hidden) => {
    chestDay({ mapView: view });
    expect(screen.getByRole("img", { name: `Body, ${view}` })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: `Body, ${hidden}` })).toBeNull();
  });

  it("marks the current view and style, and reports a new choice", () => {
    const { actions } = chestDay();
    const pressed = (name: string) => screen.getByRole("button", { name });
    expect(pressed("Both")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Heat")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(pressed("Back"));
    expect(actions.setMapView).toHaveBeenCalledWith("back");
    fireEvent.click(pressed("Outline"));
    expect(actions.setMapStyle).toHaveBeenCalledWith("outline");
  });

  it("lists every tracked muscle with its coverage, tagged when it is due a rest or a push", () => {
    chestDay();
    const meter = (muscle: string) => screen.getByRole("meter", { name: muscle });
    expect(screen.getAllByRole("meter")).toHaveLength(23);
    expect(meter("Chest")).toHaveAttribute("aria-valuetext", "75%");
    expect(within(screen.getByRole("group", { name: "Chest" })).getByText("Rest")).toBeTruthy();
    expect(meter("Quads")).toHaveAttribute("aria-valuetext", "0%");
  });
});

describe("Today · volume insight", () => {
  it("says there is nothing to report until something stands out", () => {
    const { container } = renderToday(todayVM({ program: EMPTY_PROGRAM }));
    expect(screen.getByText(/Nothing stands out yet/)).toBeInTheDocument();
    expect(container.textContent).not.toContain("Rest these");
    expect(container.textContent).not.toContain("Push these");
  });

  it("names the muscles to rest and the ones to push", () => {
    const { container } = chestDay();
    expect(container).toHaveTextContent("Rest these — Chest are well-trained this week.");
    expect(container).toHaveTextContent("Push these — Rhomboids, Lats, Abs are lagging.");
    expect(screen.queryByText(/Nothing stands out yet/)).toBeNull();
  });

  it("shows only the line it has muscles for", () => {
    const { container } = renderToday(todayVM({ program: EMPTY_PROGRAM, history: benchWeek() }));
    expect(container).toHaveTextContent("Rest these — Chest");
    expect(container.textContent).not.toContain("Push these");
  });
});

describe("Today · stats", () => {
  it("shows the streak, the week's sets and today's volume in the user's unit", () => {
    const history = [
      did(null, "bench", 8, 60, { at: nov(15, 12, 0) }),
      did("p-bench", "bench", 10, 40, { setType: "warmup" }),
      did("p-bench", "bench", 9, 60),
    ];
    renderToday(todayVM({ program: pushDay(), history }, { unit: "lb" }));
    const tile = (label: string) => screen.getByRole("region", { name: label });

    expect(tile("Streak")).toHaveTextContent("2days");
    expect(tile("This week")).toHaveTextContent("2sets");
    expect(tile("Lifted today")).toHaveTextContent("1,190lb");
  });
});
