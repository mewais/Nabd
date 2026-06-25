// Tests for @nabd/progression — all cases from AGENT.md.
// Against the skeleton every test is RED ("not implemented"), but every exported
// function is invoked so coverage of src/index.ts is 100%.

import { describe, it, expect } from "vitest";
import {
  suggest,
  personalBest,
  estimate1RM,
  trendPoints,
  gain,
  fullHistorySeries,
  formatGain,
} from "@nabd/progression";
import type { LoggedSet } from "@nabd/domain";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeSet(
  exId: string,
  date: string,
  value: number,
  weight: number | null,
  ts: string,
): LoggedSet {
  return {
    id: `${exId}-${ts}`,
    exId,
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["pectoralis_major_sternal"],
    value,
    weight,
    ts,
    date,
    trigger: "manual",
  };
}

// ---------------------------------------------------------------------------
// suggest
// ---------------------------------------------------------------------------

describe("suggest", () => {
  // --- no history (last === null) ------------------------------------------

  it("weighted track + no history → default with weight=20 and up=true", () => {
    const s = suggest("weight_reps", null);
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(10);
    expect(s.weight).toBe(20);
    expect(s.note).toBe("");
    expect(s.up).toBe(true);
  });

  it("weighted_bodyweight track + no history → default weight=20", () => {
    const s = suggest("weighted_bodyweight", null);
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(10);
    expect(s.weight).toBe(20);
    expect(s.note).toBe("");
    expect(s.up).toBe(true);
  });

  it("time track + no history → reps=30, weight=null", () => {
    const s = suggest("duration", null);
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(30);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("");
    expect(s.up).toBe(true);
  });

  it("bodyweight_reps track + no history → reps=10, weight=null", () => {
    const s = suggest("bodyweight_reps", null);
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(10);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("");
    expect(s.up).toBe(true);
  });

  it("reps_only track + no history → reps=10, weight=null", () => {
    const s = suggest("reps_only", null);
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(10);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("");
    expect(s.up).toBe(true);
  });

  // --- with history --------------------------------------------------------

  it("weighted track + last → +2.5 kg, note exact", () => {
    const s = suggest("weight_reps", { sets: 3, reps: 8, weight: 60 });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(8);
    expect(s.weight).toBe(62.5);
    expect(s.note).toBe("+2.5 kg over last session");
    expect(s.up).toBe(true);
  });

  it("weighted_bodyweight track + last → +2.5 kg", () => {
    const s = suggest("weighted_bodyweight", { sets: 3, reps: 6, weight: 10 });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(6);
    expect(s.weight).toBe(12.5);
    expect(s.note).toBe("+2.5 kg over last session");
    expect(s.up).toBe(true);
  });

  it("time track + last → +5 s, weight=null, note exact", () => {
    const s = suggest("duration", { sets: 3, reps: 30, weight: null });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(35);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("+5 s over last session");
    expect(s.up).toBe(true);
  });

  it("weight_duration track + last → treated as time: +5 s, weight preserved from last", () => {
    // weight_duration is both weighted AND time — based on AGENT.md "time track → {reps:last.reps+5, weight:null}"
    const s = suggest("weight_duration", { sets: 3, reps: 20, weight: 15 });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(25);
    expect(s.note).toBe("+5 s over last session");
    expect(s.up).toBe(true);
  });

  it("bodyweight_reps track + last → +1 rep, weight=null, note exact", () => {
    const s = suggest("bodyweight_reps", { sets: 3, reps: 15, weight: null });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(16);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("+1 rep over last session");
    expect(s.up).toBe(true);
  });

  it("reps_only track + last → +1 rep", () => {
    const s = suggest("reps_only", { sets: 3, reps: 12, weight: null });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(13);
    expect(s.weight).toBeNull();
    expect(s.note).toBe("+1 rep over last session");
    expect(s.up).toBe(true);
  });

  it("distance_duration track + last → +5 s (time based)", () => {
    const s = suggest("distance_duration", { sets: 3, reps: 60, weight: null });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(65);
    expect(s.note).toBe("+5 s over last session");
    expect(s.up).toBe(true);
  });

  it("assisted_bodyweight track + last → +2.5 kg (weighted)", () => {
    const s = suggest("assisted_bodyweight", { sets: 3, reps: 10, weight: 20 });
    expect(s.sets).toBe(3);
    expect(s.reps).toBe(10);
    expect(s.weight).toBe(22.5);
    expect(s.note).toBe("+2.5 kg over last session");
    expect(s.up).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// personalBest
// ---------------------------------------------------------------------------

describe("personalBest", () => {
  it("returns max of a non-empty series", () => {
    expect(personalBest([50, 100, 75, 90])).toBe(100);
  });

  it("returns max of a single-element series", () => {
    expect(personalBest([42])).toBe(42);
  });

  it("returns 0 for an empty series", () => {
    expect(personalBest([])).toBe(0);
  });

  it("works with negative values", () => {
    expect(personalBest([-5, -1, -10])).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// estimate1RM
// ---------------------------------------------------------------------------

describe("estimate1RM", () => {
  it("100 kg × 5 reps → ~116.667 (Epley)", () => {
    // 100 * (1 + 5/30) = 100 * 1.16667 = 116.667
    expect(estimate1RM(100, 5)).toBeCloseTo(116.667, 2);
  });

  it("0 reps → returns weight unchanged", () => {
    expect(estimate1RM(80, 0)).toBeCloseTo(80, 5);
  });

  it("30 reps → doubles weight", () => {
    // weight * (1 + 30/30) = weight * 2
    expect(estimate1RM(50, 30)).toBeCloseTo(100, 5);
  });

  it("1 rep → weight * (1 + 1/30)", () => {
    expect(estimate1RM(60, 1)).toBeCloseTo(62, 0);
  });
});

// ---------------------------------------------------------------------------
// trendPoints
// ---------------------------------------------------------------------------

describe("trendPoints", () => {
  // Helper: parse "x,y x,y …" into [{x,y}]
  function parse(pts: string): Array<{ x: number; y: number }> {
    return pts
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [x, y] = p.split(",").map(Number);
        return { x, y };
      });
  }

  it("single point → x = pad, y = mid (flat → mid/top behavior, y inverted)", () => {
    // With 1 point: x=pad; flat series → all at mid (50% of h-2pad from bottom,
    // which when y-inverted gives mid-range in SVG).
    const pts = trendPoints([50], 200, 100, 10);
    const parsed = parse(pts);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].x).toBeCloseTo(10, 1); // x = pad for single point
  });

  it("flat series → all points have the same y", () => {
    const pts = trendPoints([40, 40, 40], 300, 100, 10);
    const parsed = parse(pts);
    expect(parsed).toHaveLength(3);
    // All y should be equal (flat)
    const ys = parsed.map((p) => p.y);
    expect(ys[0]).toBeCloseTo(ys[1], 1);
    expect(ys[1]).toBeCloseTo(ys[2], 1);
  });

  it("ascending series → y values decrease (SVG y is inverted)", () => {
    // Higher values → lower SVG y (closer to top)
    const pts = trendPoints([10, 20, 30], 300, 100, 10);
    const parsed = parse(pts);
    expect(parsed).toHaveLength(3);
    // y should decrease as values increase (SVG inversion)
    expect(parsed[2].y).toBeLessThan(parsed[0].y);
  });

  it("correct count matches series length", () => {
    const pts = trendPoints([1, 2, 3, 4, 5], 500, 200, 20);
    const parsed = parse(pts);
    expect(parsed).toHaveLength(5);
  });

  it("x values spread across w - 2*pad", () => {
    const w = 200;
    const pad = 10;
    const pts = trendPoints([5, 10, 15, 20], w, 100, pad);
    const parsed = parse(pts);
    expect(parsed[0].x).toBeCloseTo(pad, 1);
    expect(parsed[parsed.length - 1].x).toBeCloseTo(w - pad, 1);
  });

  it("output values are formatted to 1 decimal place", () => {
    const pts = trendPoints([10, 20], 100, 80, 5);
    // Each token should look like "NNN.N,NNN.N"
    const tokens = pts.trim().split(/\s+/);
    expect(tokens).toHaveLength(2);
    for (const token of tokens) {
      expect(token).toMatch(/^\d+\.?\d*,\d+\.?\d*$/);
    }
  });

  it("descending series → y increases (lower values = higher SVG y)", () => {
    const pts = trendPoints([30, 20, 10], 300, 100, 10);
    const parsed = parse(pts);
    expect(parsed[2].y).toBeGreaterThan(parsed[0].y);
  });

  it("two-point series: x spans pad to w-pad", () => {
    const pts = trendPoints([5, 15], 200, 100, 10);
    const parsed = parse(pts);
    expect(parsed[0].x).toBeCloseTo(10, 1);
    expect(parsed[1].x).toBeCloseTo(190, 1);
  });
});

// ---------------------------------------------------------------------------
// gain
// ---------------------------------------------------------------------------

describe("gain", () => {
  it("returns 0 for empty series", () => {
    expect(gain([])).toBe(0);
  });

  it("returns 0 for single-element series", () => {
    expect(gain([42])).toBe(0);
  });

  it("positive gain: last - first", () => {
    expect(gain([10, 20, 30])).toBe(20);
  });

  it("negative gain when series decreases", () => {
    expect(gain([100, 50, 30])).toBe(-70);
  });

  it("zero gain when first equals last", () => {
    expect(gain([50, 60, 50])).toBe(0);
  });

  it("two elements: last - first", () => {
    expect(gain([5, 15])).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// fullHistorySeries
// ---------------------------------------------------------------------------

describe("fullHistorySeries", () => {
  const exId = "bench-press";

  it("empty history → empty series", () => {
    expect(fullHistorySeries([], exId)).toEqual([]);
  });

  it("filters by exId — ignores sets from other exercises", () => {
    const sets: LoggedSet[] = [
      makeSet("squat", "2024-01-01", 10, 100, "2024-01-01T10:00:00Z"),
      makeSet(exId, "2024-01-01", 8, 60, "2024-01-01T11:00:00Z"),
    ];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(1);
  });

  it("weighted exercise: uses estimate1RM (weight*(1+reps/30)) per set", () => {
    // 60 kg × 8 reps → 60*(1+8/30) = 60*1.2667 = 76
    const sets: LoggedSet[] = [makeSet(exId, "2024-01-01", 8, 60, "2024-01-01T10:00:00Z")];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(1);
    expect(series[0]).toBeCloseTo(76, 0);
  });

  it("unweighted exercise: uses raw value", () => {
    const sets: LoggedSet[] = [makeSet(exId, "2024-01-01", 15, null, "2024-01-01T10:00:00Z")];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(1);
    expect(series[0]).toBe(15);
  });

  it("groups multiple sets on same date — keeps best (highest) value", () => {
    // Day has two sets; the higher 1RM wins
    // Set A: 60kg × 5 → 60*(1+5/30) = 70
    // Set B: 80kg × 3 → 80*(1+3/30) = 88
    const sets: LoggedSet[] = [
      makeSet(exId, "2024-01-01", 5, 60, "2024-01-01T09:00:00Z"),
      makeSet(exId, "2024-01-01", 3, 80, "2024-01-01T10:00:00Z"),
    ];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(1);
    expect(series[0]).toBeCloseTo(88, 0);
  });

  it("multiple sessions returned in chronological order", () => {
    const sets: LoggedSet[] = [
      makeSet(exId, "2024-01-03", 10, 70, "2024-01-03T10:00:00Z"),
      makeSet(exId, "2024-01-01", 10, 60, "2024-01-01T10:00:00Z"),
      makeSet(exId, "2024-01-02", 10, 65, "2024-01-02T10:00:00Z"),
    ];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(3);
    // Each session: weight*(1+10/30) → first < second < third
    expect(series[0]).toBeLessThan(series[1]);
    expect(series[1]).toBeLessThan(series[2]);
  });

  it("two sessions, each with one set, both included", () => {
    const sets: LoggedSet[] = [
      makeSet(exId, "2024-01-01", 8, 50, "2024-01-01T10:00:00Z"),
      makeSet(exId, "2024-01-02", 8, 55, "2024-01-02T10:00:00Z"),
    ];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(2);
  });

  it("unweighted: picks best (max) raw value per session", () => {
    const sets: LoggedSet[] = [
      makeSet(exId, "2024-01-01", 12, null, "2024-01-01T09:00:00Z"),
      makeSet(exId, "2024-01-01", 15, null, "2024-01-01T10:00:00Z"),
      makeSet(exId, "2024-01-01", 10, null, "2024-01-01T11:00:00Z"),
    ];
    const series = fullHistorySeries(sets, exId);
    expect(series).toHaveLength(1);
    expect(series[0]).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// formatGain
// ---------------------------------------------------------------------------

describe("formatGain", () => {
  it("positive integer → '+N unit'", () => {
    expect(formatGain(1, "rep")).toBe("+1 rep");
  });

  it("positive decimal → '+N.D unit'", () => {
    expect(formatGain(2.5, "kg")).toBe("+2.5 kg");
  });

  it("zero → '0 unit' (no sign)", () => {
    expect(formatGain(0, "reps")).toBe("0 reps");
  });

  it("negative integer → '-N unit'", () => {
    expect(formatGain(-3, "kg")).toBe("-3 kg");
  });

  it("negative decimal → '-N.D unit'", () => {
    expect(formatGain(-1.5, "kg")).toBe("-1.5 kg");
  });

  it("positive whole number shown without decimal", () => {
    // 10.0 → '+10 kg', not '+10.0 kg'
    expect(formatGain(10, "kg")).toBe("+10 kg");
  });

  it("positive 1-decimal shown with 1 decimal", () => {
    expect(formatGain(5.5, "kg")).toBe("+5.5 kg");
  });

  it("unit is appended with a space", () => {
    const result = formatGain(3, "reps");
    expect(result.endsWith(" reps")).toBe(true);
  });

  it("large positive gain", () => {
    expect(formatGain(100, "kg")).toBe("+100 kg");
  });

  it("negative decimal 1dp", () => {
    expect(formatGain(-0.5, "s")).toBe("-0.5 s");
  });
});
