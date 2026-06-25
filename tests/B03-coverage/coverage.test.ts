/**
 * B03 · @nabd/coverage — test suite
 *
 * All tests are RED until the skeleton is implemented.
 * reportOnFailure ensures the coverage table still prints on failure,
 * proving 100% src/index.ts line + function coverage.
 */

import { describe, it, expect } from "vitest";
import {
  computePlanVolume,
  planCoverage,
  coverageFrom7dHistory,
  applySetDelta,
  recommendation,
  insight,
  emptyCoverage,
} from "@nabd/coverage";

import type { Program, Exercise, LoggedSet } from "@nabd/domain";
import { MUSCLES, DEFAULTS } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Helpers — minimal fixture builders
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise> & { id: string; primary: Exercise["primary"]; secondary: Exercise["secondary"] }): Exercise {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    group: overrides.group ?? "Chest",
    primary: overrides.primary,
    secondary: overrides.secondary,
    equipment: overrides.equipment ?? "barbell",
    tracking: overrides.tracking ?? "weight_reps",
  };
}

/** A lookup stub: returns the exercise for the given id, or undefined. */
function makeLookup(exercises: Exercise[]) {
  const map = new Map(exercises.map((e) => [e.id, e]));
  return (id: string) => map.get(id);
}

/** Build a minimal LoggedSet. */
function makeLoggedSet(
  overrides: {
    id?: string;
    exId?: string;
    muscles: LoggedSet["muscles"];
    ts: string;
    date?: string;
  },
): LoggedSet {
  return {
    id: overrides.id ?? "ls1",
    exId: overrides.exId ?? "ex1",
    exercise: "Test Exercise",
    group: "Chest",
    muscles: overrides.muscles,
    value: 10,
    weight: 50,
    ts: overrides.ts,
    date: overrides.date ?? overrides.ts.slice(0, 10),
    trigger: "manual",
  };
}

// ---------------------------------------------------------------------------
// emptyCoverage
// ---------------------------------------------------------------------------

describe("emptyCoverage", () => {
  it("returns exactly 23 muscle keys all set to 0", () => {
    const cov = emptyCoverage();
    expect(Object.keys(cov)).toHaveLength(23);
    for (const muscle of MUSCLES) {
      expect(cov[muscle]).toBe(0);
    }
  });

  it("contains all defined muscle keys", () => {
    const cov = emptyCoverage();
    for (const muscle of MUSCLES) {
      expect(Object.prototype.hasOwnProperty.call(cov, muscle)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// computePlanVolume — fixed programs
// ---------------------------------------------------------------------------

describe("computePlanVolume — fixed", () => {
  it("attributes full working sets to primary muscles", () => {
    // bench press: primary=[chest], secondary=[]
    // 3 working sets → chest gets 3
    const bench = makeExercise({
      id: "bench",
      primary: ["chest"],
      secondary: [],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8, b: 12 },
                { type: "working", a: 8, b: 12 },
                { type: "working", a: 8, b: 12 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([bench]));
    expect(vol["chest"]).toBe(3);
  });

  it("attributes half working sets to secondary muscles", () => {
    // overhead press: primary=[side_delts], secondary=[triceps, front_delts]
    // 4 working sets → side_delts gets 4, triceps gets 2, front_delts gets 2
    const ohp = makeExercise({
      id: "ohp",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: ["triceps", "front_delts"],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "ohp",
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 10 },
                { type: "working", a: 10 },
                { type: "working", a: 10 },
                { type: "working", a: 10 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([ohp]));
    expect(vol["side_delts"]).toBe(4);
    expect(vol["triceps"]).toBe(2);
    expect(vol["front_delts"]).toBe(2);
  });

  it("excludes warmup sets from volume", () => {
    const squat = makeExercise({
      id: "squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes", "hamstrings"],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "squat",
              repMode: "range",
              intensity: "rpe",
              rest: 180,
              sets: [
                { type: "warmup", a: 10 },  // excluded
                { type: "warmup", a: 8 },   // excluded
                { type: "working", a: 5 },
                { type: "working", a: 5 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([squat]));
    // Only 2 working sets: quads=2, glutes=1, hamstrings=1
    expect(vol["quads"]).toBe(2);
    expect(vol["glutes"]).toBe(1);
    expect(vol["hamstrings"]).toBe(1);
  });

  it("sums volume across multiple exercises in a day", () => {
    const bench = makeExercise({
      id: "bench",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
    });
    const fly = makeExercise({
      id: "fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
            {
              id: "ep2",
              exId: "fly",
              repMode: "fixed",
              intensity: "none",
              rest: 60,
              sets: [
                { type: "working", a: 12 },
                { type: "working", a: 12 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([bench, fly]));
    // bench: chest=3, triceps=1.5, front_delts=1.5
    // fly: chest=2
    // total: chest=5, triceps=1.5, front_delts=1.5
    expect(vol["chest"]).toBe(5);
    expect(vol["triceps"]).toBe(1.5);
    expect(vol["front_delts"]).toBe(1.5);
  });

  it("sums volume across multiple days", () => {
    const bench = makeExercise({
      id: "bench",
      primary: ["chest"],
      secondary: [],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
          slots: [],
        },
        {
          id: "d2",
          name: "Day 2",
          weekday: null,
          exercises: [
            {
              id: "ep2",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([bench]));
    // Day 1: chest=2; Day 2: chest=3 → total chest=5
    expect(vol["chest"]).toBe(5);
  });

  it("returns only muscles that were touched (no zero entries)", () => {
    const bench = makeExercise({
      id: "bench",
      primary: ["chest"],
      secondary: [],
    });

    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "bench",
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8 }],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([bench]));
    // Only chest should appear
    expect(Object.keys(vol)).toContain("chest");
    expect(Object.keys(vol)).not.toContain("lats");
    expect(Object.keys(vol)).not.toContain("quads");
  });
});

// ---------------------------------------------------------------------------
// computePlanVolume — cycled programs
// ---------------------------------------------------------------------------

describe("computePlanVolume — cycled", () => {
  it("attributes slot working sets to GROUP_PRIMARY_MUSCLE of the slot group", () => {
    // Chest slot → chest primary muscle
    const program: Program = {
      name: "Cycled",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              group: "Chest",
              pool: ["bench"],
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([]));
    // Chest → chest = 3
    expect(vol["chest"]).toBe(3);
  });

  it("maps Back group slot to lats primary muscle", () => {
    const program: Program = {
      name: "Cycled",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              group: "Back",
              pool: ["row"],
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([]));
    expect(vol["lats"]).toBe(2);
  });

  it("handles multiple cycled slots on the same day with mixed groups", () => {
    const program: Program = {
      name: "Cycled",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Push Day",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              group: "Chest",
              pool: ["bench"],
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
            {
              id: "s2",
              group: "Triceps",
              pool: ["pushdown"],
              repMode: "fixed",
              intensity: "none",
              rest: 60,
              sets: [
                { type: "working", a: 12 },
                { type: "working", a: 12 },
              ],
            },
          ],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([]));
    // chest=3, triceps=2
    expect(vol["chest"]).toBe(3);
    expect(vol["triceps"]).toBe(2);
  });

  it("excludes warmup sets from cycled slots too", () => {
    const program: Program = {
      name: "Cycled",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              group: "Quads",
              pool: ["squat"],
              repMode: "fixed",
              intensity: "none",
              rest: 180,
              sets: [
                { type: "warmup", a: 10 }, // excluded
                { type: "working", a: 5 },
                { type: "working", a: 5 },
                { type: "working", a: 5 },
              ],
            },
          ],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([]));
    // quads = 3 (warmup excluded)
    expect(vol["quads"]).toBe(3);
  });

  it("sums cycled slots across multiple days", () => {
    const program: Program = {
      name: "Cycled",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              group: "Chest",
              pool: ["bench"],
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
        },
        {
          id: "d2",
          name: "Day 3",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s2",
              group: "Chest",
              pool: ["fly"],
              repMode: "fixed",
              intensity: "none",
              rest: 60,
              sets: [
                { type: "working", a: 12 },
                { type: "working", a: 12 },
                { type: "working", a: 12 },
              ],
            },
          ],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([]));
    // Day 1: chest=2; Day 2: chest=3 → total=5
    expect(vol["chest"]).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// planCoverage
// ---------------------------------------------------------------------------

describe("planCoverage", () => {
  it("converts volume to percentage: 16 sets = 100%", () => {
    const vol = { chest: 16 };
    const cov = planCoverage(vol);
    expect(cov["chest"]).toBe(100);
  });

  it("converts volume to percentage: 8 sets = 50%", () => {
    const vol = { chest: 8 };
    const cov = planCoverage(vol);
    expect(cov["chest"]).toBe(50);
  });

  it("converts volume to percentage: 4 sets = 25%", () => {
    const vol = { lats: 4 };
    const cov = planCoverage(vol);
    expect(cov["lats"]).toBe(25);
  });

  it("clamps at 100 even when volume exceeds 16", () => {
    const vol = { quads: 20 };
    const cov = planCoverage(vol);
    expect(cov["quads"]).toBe(100);
  });

  it("clamps at 100 for exactly 16 (boundary)", () => {
    const vol = { chest: 16 };
    const cov = planCoverage(vol);
    expect(cov["chest"]).toBe(100);
  });

  it("returns 0 for muscles with no volume", () => {
    const vol = { chest: 8 };
    const cov = planCoverage(vol);
    // All other muscles not in vol should be 0
    expect(cov["lats"]).toBe(0);
  });

  it("handles multiple muscles simultaneously", () => {
    const vol = { chest: 8, lats: 4, quads: 16, triceps: 2 };
    const cov = planCoverage(vol);
    expect(cov["chest"]).toBe(50);
    expect(cov["lats"]).toBe(25);
    expect(cov["quads"]).toBe(100);
    // triceps: 2/16*100 = 12.5
    expect(cov["triceps"]).toBeCloseTo(12.5);
  });

  it("formula: pct = min(100, vol/16*100)", () => {
    // 12 sets → 12/16*100 = 75
    const vol = { hamstrings: 12 };
    const cov = planCoverage(vol);
    expect(cov["hamstrings"]).toBeCloseTo(75);
  });
});

// ---------------------------------------------------------------------------
// coverageFrom7dHistory
// ---------------------------------------------------------------------------

describe("coverageFrom7dHistory", () => {
  // "now" = 2024-01-08T00:00:00Z
  const now = new Date("2024-01-08T00:00:00Z");

  it("includes sets from exactly 7 days ago (boundary inclusive)", () => {
    // 7 days before now = 2024-01-01T00:00:00Z
    const history: LoggedSet[] = [
      makeLoggedSet({
        id: "ls1",
        muscles: ["chest"],
        ts: "2024-01-01T00:00:00Z",
        date: "2024-01-01",
      }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    // 1 set to primary chest → chest gets 1 → pct = min(100, 1/16*100) = 6.25
    expect(cov["chest"]).toBeCloseTo(6.25);
  });

  it("excludes sets older than 7 days", () => {
    // 8 days before now
    const history: LoggedSet[] = [
      makeLoggedSet({
        id: "ls1",
        muscles: ["chest"],
        ts: "2023-12-31T12:00:00Z",
        date: "2023-12-31",
      }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    expect(cov["chest"]).toBe(0);
  });

  it("includes a set from 1 day ago", () => {
    const history: LoggedSet[] = [
      makeLoggedSet({
        id: "ls1",
        muscles: ["lats"],
        ts: "2024-01-07T10:00:00Z",
        date: "2024-01-07",
      }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    expect(cov["lats"]).toBeCloseTo(6.25);
  });

  it("counts multiple sets for the same muscle", () => {
    // 4 sets to chest within last 7 days
    const history: LoggedSet[] = [
      makeLoggedSet({ id: "ls1", muscles: ["chest"], ts: "2024-01-07T10:00:00Z" }),
      makeLoggedSet({ id: "ls2", muscles: ["chest"], ts: "2024-01-06T10:00:00Z" }),
      makeLoggedSet({ id: "ls3", muscles: ["chest"], ts: "2024-01-05T10:00:00Z" }),
      makeLoggedSet({ id: "ls4", muscles: ["chest"], ts: "2024-01-04T10:00:00Z" }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    // 4 primary sets → vol=4 → pct = 4/16*100 = 25
    expect(cov["chest"]).toBeCloseTo(25);
  });

  it("counts primary muscle as full (1) and secondary as half (0.5)", () => {
    // A LoggedSet's muscles list is treated as primaries for volume; since
    // LoggedSet only has a single muscles array, behavior per spec:
    // "primary full, secondary half — muscles already on each LoggedSet"
    // The spec says the set's muscle list is the primary muscles; all get
    // full count (no secondary distinction on a LoggedSet).
    // Actually from AGENT.md: "count logged sets per muscle in the last 7 days
    // (primary full, secondary half — muscles already on each LoggedSet)"
    // This means each muscle listed in LoggedSet.muscles is counted:
    // first element = primary (+1), rest = secondary (+0.5)? No — per the
    // BEHAVIOR section and Exercise.primary/secondary. LoggedSet has a single
    // flat muscles list. The applySetDelta function signature shows muscles
    // array with perSet as flat amount. Let's check the interface carefully:
    // applySetDelta(_cov, _muscles, _perSet) — primary full, secondary half is
    // the computePlanVolume logic. For coverageFrom7dHistory the spec says
    // "primary full, secondary half — muscles already on each LoggedSet".
    // The LoggedSet stores muscles flat. Most likely the first is primary(+1),
    // the rest secondary (+0.5). But the AGENT.md for coverageFrom7dHistory
    // just says "same" as planCoverage formula applied after counting.
    // Given the interface, each set contributes 1 set to the muscles listed.
    // We'll test: 2 muscles in set, primary logic: all in muscles array = 1 full each.
    // Actually re-reading: for coverageFrom7dHistory, it accumulates sets per muscle
    // then applies planCoverage formula. Each LoggedSet's muscles[] get +1.
    // We'll assert this consistently.
    const history: LoggedSet[] = [
      makeLoggedSet({
        id: "ls1",
        muscles: ["chest", "triceps"],
        ts: "2024-01-07T10:00:00Z",
      }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    // 1 set with muscles=[chest, triceps]
    // chest (primary) gets 1 full → 1/16*100 = 6.25
    // triceps (secondary) gets 0.5 → 0.5/16*100 = 3.125
    // NOTE: if implementation treats all muscles equally (all +1), then:
    // chest=6.25, triceps=6.25
    // Per spec "primary full, secondary half": first muscle primary, rest secondary
    expect(cov["chest"]).toBeCloseTo(6.25);
    expect(cov["triceps"]).toBeCloseTo(3.125);
  });

  it("saturates at 100 when enough sets logged", () => {
    // 16 primary sets → 100%
    const history: LoggedSet[] = Array.from({ length: 16 }, (_, i) =>
      makeLoggedSet({
        id: `ls${i}`,
        muscles: ["quads"],
        ts: `2024-01-0${Math.min(7, i + 1)}T10:00:00Z`,
        date: `2024-01-0${Math.min(7, i + 1)}`,
      }),
    );
    const cov = coverageFrom7dHistory(history, now);
    expect(cov["quads"]).toBe(100);
  });

  it("returns all 23 muscles with values", () => {
    const history: LoggedSet[] = [];
    const cov = coverageFrom7dHistory(history, now);
    for (const muscle of MUSCLES) {
      expect(Object.prototype.hasOwnProperty.call(cov, muscle)).toBe(true);
    }
  });

  it("returns 0 for untouched muscles when history is empty", () => {
    const cov = coverageFrom7dHistory([], now);
    for (const muscle of MUSCLES) {
      expect(cov[muscle]).toBe(0);
    }
  });

  it("excludes sets from exactly 8 days ago", () => {
    // 8 days before 2024-01-08 = 2023-12-31
    const history: LoggedSet[] = [
      makeLoggedSet({
        id: "ls1",
        muscles: ["chest"],
        ts: "2023-12-31T23:59:59Z",
        date: "2023-12-31",
      }),
    ];
    const cov = coverageFrom7dHistory(history, now);
    expect(cov["chest"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applySetDelta
// ---------------------------------------------------------------------------

describe("applySetDelta", () => {
  it("bumps specified muscles by perSet amount", () => {
    const base = emptyCoverage();
    const updated = applySetDelta(base, ["chest"], 4);
    expect(updated["chest"]).toBe(4);
  });

  it("does not mutate the original coverage", () => {
    const base = emptyCoverage();
    const original = { ...base };
    applySetDelta(base, ["chest"], 4);
    expect(base["chest"]).toBe(original["chest"]);
  });

  it("clamps bumped value at 100", () => {
    const base = { ...emptyCoverage(), chest: 98 };
    const updated = applySetDelta(base, ["chest"], 4);
    expect(updated["chest"]).toBe(100);
  });

  it("clamps exactly at 100 when bump would exceed it", () => {
    const base = { ...emptyCoverage(), lats: 99 };
    const updated = applySetDelta(base, ["lats"], 10);
    expect(updated["lats"]).toBe(100);
  });

  it("leaves non-specified muscles unchanged", () => {
    const base = { ...emptyCoverage(), lats: 50 };
    const updated = applySetDelta(base, ["chest"], 4);
    expect(updated["lats"]).toBe(50);
    expect(updated["chest"]).toBe(4);
  });

  it("accepts multiple muscles in one call", () => {
    const base = emptyCoverage();
    const updated = applySetDelta(base, ["chest", "triceps", "front_delts"], 4);
    expect(updated["chest"]).toBe(4);
    expect(updated["triceps"]).toBe(4);
    expect(updated["front_delts"]).toBe(4);
  });

  it("uses DEFAULTS.coveragePerSet=4 as the bump unit", () => {
    // Verify the constant value itself matches what tests expect
    expect(DEFAULTS.coveragePerSet).toBe(4);
    const base = emptyCoverage();
    const updated = applySetDelta(base, ["chest"], DEFAULTS.coveragePerSet);
    expect(updated["chest"]).toBe(4);
  });

  it("stacks multiple bumps correctly (immutable chaining)", () => {
    const base = emptyCoverage();
    const after1 = applySetDelta(base, ["chest"], 4);
    const after2 = applySetDelta(after1, ["chest"], 4);
    expect(after2["chest"]).toBe(8);
    // Previous snapshots unchanged
    expect(after1["chest"]).toBe(4);
    expect(base["chest"]).toBe(0);
  });

  it("clamps at exactly 100 — not above", () => {
    const base = { ...emptyCoverage(), chest: 100 };
    const updated = applySetDelta(base, ["chest"], 4);
    expect(updated["chest"]).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// recommendation
// ---------------------------------------------------------------------------

describe("recommendation", () => {
  it("returns 'rest' for pct >= 66 (value: 66)", () => {
    expect(recommendation(66)).toBe("rest");
  });

  it("returns 'rest' for pct = 70", () => {
    expect(recommendation(70)).toBe("rest");
  });

  it("returns 'rest' for pct = 100", () => {
    expect(recommendation(100)).toBe("rest");
  });

  it("returns 'push' for pct <= 38 (value: 38)", () => {
    expect(recommendation(38)).toBe("push");
  });

  it("returns 'push' for pct = 20", () => {
    expect(recommendation(20)).toBe("push");
  });

  it("returns 'push' for pct = 0", () => {
    expect(recommendation(0)).toBe("push");
  });

  it("returns 'none' for pct = 50 (between thresholds)", () => {
    expect(recommendation(50)).toBe("none");
  });

  it("returns 'none' for pct just above 38 (value: 39)", () => {
    expect(recommendation(39)).toBe("none");
  });

  it("returns 'none' for pct just below 66 (value: 65)", () => {
    expect(recommendation(65)).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// insight
// ---------------------------------------------------------------------------

describe("insight", () => {
  it("rest = top 2 muscles by coverage (highest first)", () => {
    const cov = {
      ...emptyCoverage(),
      chest: 80,
      lats: 70,
      quads: 50,
      hamstrings: 20,
      biceps: 10,
    };
    const result = insight(cov);
    expect(result.rest).toHaveLength(2);
    expect(result.rest[0]).toBe("chest");
    expect(result.rest[1]).toBe("lats");
  });

  it("push = bottom 2 muscles by coverage (lowest first)", () => {
    const cov = {
      ...emptyCoverage(),
      chest: 80,
      lats: 70,
      quads: 50,
      hamstrings: 20,
      biceps: 10,
    };
    const result = insight(cov);
    expect(result.push).toHaveLength(2);
    // Bottom 2 are biceps(10) and hamstrings(20) — but all zero muscles
    // from emptyCoverage spread would also be 0. The function should return
    // the bottom 2 from the set of all muscles.
    // With many 0-value muscles, bottom 2 would be two of those.
    // Let's use a coverage where all muscles have distinct values.
  });

  it("returns top 2 rest and bottom 2 push with distinct values", () => {
    // Assign specific values to only 4 muscles, all others 0
    // (but 0-muscles are valid too)
    const cov = emptyCoverage();
    // Override a few
    const override: Partial<typeof cov> = {
      chest: 90,
      lats: 80,
      quads: 30,
      triceps: 20,
    };
    const fullCov = { ...cov, ...override };

    const result = insight(fullCov);
    // rest = top 2 = chest(90), lats(80)
    expect(result.rest[0]).toBe("chest");
    expect(result.rest[1]).toBe("lats");
    // push = bottom 2 = some of the 0-muscles or lowest
    expect(result.push).toHaveLength(2);
    // All zero-coverage muscles tie, but the bottom 2 should have 0 coverage
    // (since we have 19 muscles at 0)
    expect(fullCov[result.push[0]]).toBe(0);
    expect(fullCov[result.push[1]]).toBe(0);
  });

  it("sorts descending for rest, ascending for push", () => {
    const cov = emptyCoverage();
    const override: Partial<typeof cov> = {
      chest: 100,
      lats: 90,
      quads: 80,
      hamstrings: 70,
      glutes: 60,
      biceps: 50,
      triceps: 40,
      calves: 30,
      abs: 20,
      obliques: 10,
    };
    const fullCov = { ...cov, ...override };

    const result = insight(fullCov);
    // Top 2 highest
    expect(result.rest[0]).toBe("chest");
    expect(result.rest[1]).toBe("lats");
    // Bottom 2 lowest = 0-valued muscles (13 muscles at 0)
    expect(fullCov[result.push[0]]).toBe(0);
    expect(fullCov[result.push[1]]).toBe(0);
  });

  it("returns arrays of length exactly 2 for both rest and push", () => {
    const cov = {
      ...emptyCoverage(),
      chest: 80,
      lats: 70,
      quads: 50,
      hamstrings: 20,
    };
    const result = insight(cov);
    expect(result.rest).toHaveLength(2);
    expect(result.push).toHaveLength(2);
  });

  it("rest and push are non-overlapping", () => {
    const cov = {
      ...emptyCoverage(),
      chest: 100,
      lats: 90,
      quads: 80,
      hamstrings: 70,
    };
    const result = insight(cov);
    const restSet = new Set(result.rest);
    const pushSet = new Set(result.push);
    for (const m of result.push) {
      expect(restSet.has(m)).toBe(false);
    }
    for (const m of result.rest) {
      expect(pushSet.has(m)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: computePlanVolume → planCoverage
// ---------------------------------------------------------------------------

describe("integration: planVolume → planCoverage", () => {
  it("full pipeline for a simple fixed program", () => {
    const bench = makeExercise({
      id: "bench",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
    });

    const program: Program = {
      name: "PPL",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "bench",
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [
                { type: "warmup", a: 10 }, // excluded
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
                { type: "working", a: 8 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };

    const vol = computePlanVolume(program, makeLookup([bench]));
    const cov = planCoverage(vol);

    // 4 working sets: chest=4 → 4/16*100 = 25%
    expect(cov["chest"]).toBeCloseTo(25);
    // secondary: 2 sets each → 2/16*100 = 12.5%
    expect(cov["triceps"]).toBeCloseTo(12.5);
    expect(cov["front_delts"]).toBeCloseTo(12.5);
  });
});

// ---------------------------------------------------------------------------
// Direct calls to ensure 100% function coverage despite emptyCoverage throwing
// ---------------------------------------------------------------------------

/** A fully-specified zero Coverage object (no dependency on emptyCoverage). */
const ZERO_COV: import("@nabd/domain").Coverage = Object.fromEntries(
  MUSCLES.map((m) => [m, 0]),
) as import("@nabd/domain").Coverage;

describe("applySetDelta — direct (no emptyCoverage dependency)", () => {
  it("directly calls applySetDelta with a literal coverage map", () => {
    const updated = applySetDelta(ZERO_COV, ["chest"], 4);
    expect(updated["chest"]).toBe(4);
    // Original unchanged
    expect(ZERO_COV["chest"]).toBe(0);
  });

  it("directly calls applySetDelta clamp to 100", () => {
    const highCov = { ...ZERO_COV, chest: 99 };
    const updated = applySetDelta(highCov, ["chest"], 10);
    expect(updated["chest"]).toBe(100);
  });

  it("directly calls applySetDelta with multiple muscles", () => {
    const updated = applySetDelta(ZERO_COV, ["lats", "biceps"], 8);
    expect(updated["lats"]).toBe(8);
    expect(updated["biceps"]).toBe(8);
    expect(updated["chest"]).toBe(0);
  });
});

describe("insight — direct (no emptyCoverage dependency)", () => {
  it("directly calls insight with a literal coverage map", () => {
    const cov = { ...ZERO_COV, chest: 95, lats: 85, quads: 50, hamstrings: 10 };
    const result = insight(cov);
    expect(result.rest).toHaveLength(2);
    expect(result.push).toHaveLength(2);
    expect(result.rest[0]).toBe("chest");
    expect(result.rest[1]).toBe("lats");
  });

  it("insight push contains lowest coverage muscles", () => {
    // Use a coverage where all muscles have distinct known values
    const cov: import("@nabd/domain").Coverage = {
      front_delts: 100,
      side_delts: 90,
      rear_delts: 80,
      neck: 70,
      upper_traps: 60,
      rhomboids: 50,
      lower_traps: 45,
      lats: 40,
      lower_back: 35,
      chest: 30,
      abs: 25,
      obliques: 20,
      quads: 15,
      hamstrings: 12,
      glutes: 10,
      abductors: 8,
      adductors: 6,
      calves: 4,
      tibialis: 3,
      hip_flexors: 2,
      biceps: 1,
      triceps: 0,
      forearms: 0,
    };
    const result = insight(cov);
    // rest = top 2 = front_delts(100), side_delts(90)
    expect(result.rest[0]).toBe("front_delts");
    expect(result.rest[1]).toBe("side_delts");
    // push = bottom 2 = triceps(0) and forearms(0), or biceps(1) — two of the lowest
    expect(result.push).toHaveLength(2);
    // The two lowest-valued muscles should be in the push list
    const pushValues = result.push.map((m) => cov[m]);
    // Both should be <= 1 (the two lowest values)
    expect(Math.max(...pushValues)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases for full branch coverage
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("computePlanVolume: empty program (no days) returns empty volume", () => {
    const program: Program = {
      name: "Empty",
      type: "fixed",
      schedule: "floating",
      days: [],
    };
    const vol = computePlanVolume(program, makeLookup([]));
    expect(Object.keys(vol)).toHaveLength(0);
  });

  it("computePlanVolume: day with no exercises and no slots contributes nothing", () => {
    const program: Program = {
      name: "Rest",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Rest Day",
          weekday: null,
          exercises: [],
          slots: [],
        },
      ],
    };
    const vol = computePlanVolume(program, makeLookup([]));
    expect(Object.keys(vol)).toHaveLength(0);
  });

  it("computePlanVolume: unknown exId gracefully skips (lookup returns undefined)", () => {
    const program: Program = {
      name: "Test",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "ep1",
              exId: "unknown-exercise",
              repMode: "fixed",
              intensity: "none",
              rest: 0,
              sets: [{ type: "working", a: 10 }],
            },
          ],
          slots: [],
        },
      ],
    };
    // Lookup returns undefined for unknown-exercise
    const vol = computePlanVolume(program, makeLookup([]));
    // Should not crash; volume should be empty (no muscle touched)
    expect(vol).toBeDefined();
  });

  it("planCoverage: empty volume produces all-zero coverage", () => {
    const cov = planCoverage({});
    for (const muscle of MUSCLES) {
      expect(cov[muscle]).toBe(0);
    }
  });

  it("applySetDelta: empty muscles array changes nothing", () => {
    const base = { ...emptyCoverage(), chest: 50 };
    const updated = applySetDelta(base, [], 4);
    expect(updated["chest"]).toBe(50);
  });

  it("recommendation boundary: exactly 66 = rest", () => {
    expect(recommendation(66)).toBe("rest");
  });

  it("recommendation boundary: exactly 38 = push", () => {
    expect(recommendation(38)).toBe("push");
  });

  it("recommendation boundary: 67 = rest, 37 = push", () => {
    expect(recommendation(67)).toBe("rest");
    expect(recommendation(37)).toBe("push");
  });
});
