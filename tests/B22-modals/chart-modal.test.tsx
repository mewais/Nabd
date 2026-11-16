/**
 * B22 · @nabd/modals — the full-history chart: buildChartVM from a real
 * exercise trend, and the modal that draws it.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { dateKey } from "@nabd/domain";
import type { LoggedSet } from "@nabd/domain";
import { exerciseTrends } from "@nabd/progression";
import type { ExerciseTrend } from "@nabd/progression";
import { FullHistoryChartModal, buildChartVM } from "@nabd/modals";
import { LIBRARY, did } from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";

function trendOf(history: LoggedSet[], exId: string, unit: "kg" | "lb" = "kg"): ExerciseTrend {
  const trend = exerciseTrends(history, unit, (id) => LIBRARY.byId(id)?.tracking).find(
    (t) => t.exId === exId,
  );
  if (!trend) throw new Error(`no trend for "${exId}"`);
  return trend;
}

/** Three bench sessions; each session's best set is an e1RM of 76 → 78 → 79.2 kg. */
const benchHistory = (): LoggedSet[] => [
  did(null, "bench", 8, 60, { at: nov(2) }),
  did(null, "bench", 6, 60, { at: nov(2) }),
  did(null, "bench", 9, 60, { at: nov(9) }),
  did(null, "bench", 8, 62.5, { at: nov(16) }),
];

const coordinates = (points: string): [number, number][] =>
  points.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return [x ?? NaN, y ?? NaN];
  });

describe("buildChartVM", () => {
  it("summarises the trend: since when, how many sessions, best, current and gain", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));

    expect(vm.exercise).toBe("Bench Press");
    expect(vm.startLabel).toBe(dateKey(nov(2)));
    expect(vm.nowLabel).toBe("Now");
    expect(vm.sessions).toBe(3);
    expect(vm.pr).toBe("79.2 kg e1RM");
    expect(vm.current).toBe("79.2 kg e1RM");
    expect(vm.gainAll).toBe("+3.2 kg e1RM");
  });

  it("plots one point per session, left to right, the best at the top", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));
    const points = coordinates(vm.points);

    expect(vm.viewBox).toBe("0 0 680 240");
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual([30, 210]); // first session: lowest value, bottom-left
    expect(points[2]).toEqual([650, 30]); // latest session: the best, top-right
    expect(points[1]![0]).toBe(340);
    expect(points[1]![1]).toBeGreaterThan(30);
    expect(points[1]![1]).toBeLessThan(210);
  });

  it("closes the shaded area down to the baseline at both ends", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));
    expect(vm.areaPoints).toBe(`30,210 ${vm.points} 650,210`);
  });

  it("labels gridlines at the best, the midpoint and the lowest value", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));
    expect(vm.gridY).toEqual([
      { y: "30.0", label: "79.2" },
      { y: "120.0", label: "77.6" },
      { y: "210.0", label: "76" },
    ]);
  });

  it("measures an unloaded exercise in reps and shows a loss as negative", () => {
    const history = [
      did(null, "pushup", 15, null, { at: nov(2) }),
      did(null, "pushup", 18, null, { at: nov(9) }),
      did(null, "pushup", 14, null, { at: nov(16) }),
    ];
    const vm = buildChartVM("Push-Up", trendOf(history, "pushup"));

    expect(vm.pr).toBe("18 reps");
    expect(vm.current).toBe("14 reps");
    expect(vm.gainAll).toBe("-1 reps");
  });

  it("measures a timed hold in seconds", () => {
    const history = [
      did(null, "plank", 30, null, { at: nov(9) }),
      did(null, "plank", 45, null, { at: nov(16) }),
    ];
    const vm = buildChartVM("Plank", trendOf(history, "plank"));

    expect(vm.pr).toBe("45 s");
    expect(vm.gainAll).toBe("+15 s");
  });

  it("reports loaded trends in pounds for lb users", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench", "lb"));
    expect(vm.pr).toBe("174.5 lb e1RM");
    expect(vm.gainAll).toBe("+6.9 lb e1RM");
  });

  it("draws a single session as one centred point (no NaN coordinates)", () => {
    const vm = buildChartVM(
      "Bench Press",
      trendOf([did(null, "bench", 8, 60, { at: nov(16) })], "bench"),
    );

    expect(vm.sessions).toBe(1);
    expect(vm.gainAll).toBe("0 kg e1RM");
    expect(coordinates(vm.points)).toEqual([[30, 120]]);
    expect(vm.gridY.every((g) => g.y === "120.0")).toBe(true);
    expect(`${vm.points} ${vm.areaPoints}`).not.toContain("NaN");
  });
});

describe("FullHistoryChartModal", () => {
  const setup = () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));
    const onClose = vi.fn();
    const view = render(<FullHistoryChartModal vm={vm} onClose={onClose} />);
    return { vm, onClose, ...view };
  };

  it("titles the chart and shows the headline numbers", () => {
    const { vm } = setup();
    const tile = (label: string) => screen.getByText(label).parentElement;

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText(`Since ${vm.startLabel} · 3 sessions`)).toBeInTheDocument();
    expect(tile("PERSONAL BEST")).toHaveTextContent("79.2 kg e1RM");
    expect(tile("CURRENT")).toHaveTextContent("79.2 kg e1RM");
    expect(tile("ALL-TIME GAIN")).toHaveTextContent("+3.2 kg e1RM");
  });

  it("draws the trend line, its shaded area and the labelled gridlines", () => {
    const { vm, container } = setup();

    expect(container.querySelector("polyline")).toHaveAttribute("points", vm.points);
    expect(container.querySelector("polygon")).toHaveAttribute("points", vm.areaPoints);
    const labels = Array.from(container.querySelectorAll("svg text")).map((t) => t.textContent);
    expect(labels).toEqual(["79.2", "77.6", "76"]);
    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("closes from the ✕ and from the backdrop", () => {
    const { onClose, container } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector("[data-modal-backdrop]")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
