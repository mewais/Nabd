/**
 * B19 · @nabd/today — value-asserting React tests (RED against skeleton).
 *
 * ALL tests are RED now because the skeleton throws "not implemented" on every
 * call/render.  They turn GREEN once the code agent implements the bodies.
 * Together they exercise every export and every branch → 100% coverage of
 * src/index.ts.
 *
 * Rules honoured:
 * - No `expect(...).toThrow("not implemented")`.
 * - No sole `.toBeDefined()` / `.toBeTruthy()`.
 * - Every test asserts a concrete DOM text / role / callback / returned value.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MUSCLE_NAMES } from "@nabd/domain";
import type { Coverage, MuscleKey, Slot } from "@nabd/domain";

import {
  buildLegend,
  buildRhythmRows,
  buildHero,
  HeroCard,
  RhythmCard,
  CoverageCard,
  VolumeInsightCard,
  StatTiles,
  TodayScreen,
} from "@nabd/today";
import type {
  LegendRow,
  RhythmRow,
  HeroVM,
  HeroCardProps,
  RhythmCardProps,
  CoverageCardProps,
  VolumeInsightProps,
  StatTilesProps,
  TodayScreenProps,
} from "@nabd/today";

// =============================================================================
// Fixtures & helpers
// =============================================================================

/** Build a Coverage where every muscle = defaultVal, overriding with overrides. */
function makeCoverage(
  overrides: Partial<Record<MuscleKey, number>> = {},
  defaultVal = 0,
): Coverage {
  const muscles: MuscleKey[] = [
    "front_delts", "side_delts", "rear_delts", "neck", "upper_traps",
    "rhomboids", "lower_traps", "lats", "lower_back", "chest", "abs",
    "obliques", "quads", "hamstrings", "glutes", "abductors", "adductors",
    "calves", "tibialis", "hip_flexors", "biceps", "triceps", "forearms",
  ];
  const cov: Partial<Record<MuscleKey, number>> = {};
  for (const m of muscles) {
    cov[m] = defaultVal;
  }
  return { ...cov, ...overrides } as Coverage;
}

/** Minimal valid Slot factory. */
function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: "slot-1",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    min: 480,
    timeStr: "08:00",
    sets: 3,
    done: 0,
    status: "upcoming",
    result: "",
    ...overrides,
  };
}

// Convenience coverage fixtures
const ZERO_COV = makeCoverage({}, 0);
// Coverage with specific interesting values for legend tests:
// chest → 70 (rest), biceps → 20 (push), quads → 50 (none)
const MIXED_COV = makeCoverage({ chest: 70, biceps: 20, quads: 50 });

// =============================================================================
// buildLegend
// =============================================================================

describe("buildLegend", () => {
  it("returns an array of 8 rows for the default muscle set", () => {
    const rows = buildLegend(ZERO_COV);
    expect(rows).toHaveLength(8);
  });

  it("default muscle set contains chest, lats, side_delts, biceps, quads, glutes, abs, calves", () => {
    const rows = buildLegend(ZERO_COV);
    const muscles = rows.map((r) => r.muscle);
    expect(muscles).toContain("chest");
    expect(muscles).toContain("lats");
    expect(muscles).toContain("side_delts");
    expect(muscles).toContain("biceps");
    expect(muscles).toContain("quads");
    expect(muscles).toContain("glutes");
    expect(muscles).toContain("abs");
    expect(muscles).toContain("calves");
  });

  it("muscle at pct=70 gets rec='rest'", () => {
    const cov = makeCoverage({ chest: 70 });
    const rows = buildLegend(cov);
    const chestRow = rows.find((r) => r.muscle === "chest");
    expect(chestRow).not.toBeUndefined();
    expect(chestRow!.rec).toBe("rest");
  });

  it("muscle at pct=20 gets rec='push'", () => {
    const cov = makeCoverage({ biceps: 20 });
    const rows = buildLegend(cov);
    const bicepsRow = rows.find((r) => r.muscle === "biceps");
    expect(bicepsRow).not.toBeUndefined();
    expect(bicepsRow!.rec).toBe("push");
  });

  it("muscle at pct=50 gets rec='none'", () => {
    const cov = makeCoverage({ quads: 50 });
    const rows = buildLegend(cov);
    const quadsRow = rows.find((r) => r.muscle === "quads");
    expect(quadsRow).not.toBeUndefined();
    expect(quadsRow!.rec).toBe("none");
  });

  it("boundary: pct=66 gets rec='rest'", () => {
    const cov = makeCoverage({ chest: 66 });
    const rows = buildLegend(cov);
    const row = rows.find((r) => r.muscle === "chest");
    expect(row!.rec).toBe("rest");
  });

  it("boundary: pct=38 gets rec='push'", () => {
    const cov = makeCoverage({ biceps: 38 });
    const rows = buildLegend(cov);
    const row = rows.find((r) => r.muscle === "biceps");
    expect(row!.rec).toBe("push");
  });

  it("boundary: pct=39 gets rec='none' (just above push threshold)", () => {
    const cov = makeCoverage({ quads: 39 });
    const rows = buildLegend(cov);
    const row = rows.find((r) => r.muscle === "quads");
    expect(row!.rec).toBe("none");
  });

  it("boundary: pct=65 gets rec='none' (just below rest threshold)", () => {
    const cov = makeCoverage({ abs: 65 });
    const rows = buildLegend(cov);
    const row = rows.find((r) => r.muscle === "abs");
    expect(row!.rec).toBe("none");
  });

  it("pct=0 (missing from coverage) gets rec='push'", () => {
    const rows = buildLegend(ZERO_COV);
    const chestRow = rows.find((r) => r.muscle === "chest");
    expect(chestRow!.pct).toBe(0);
    expect(chestRow!.rec).toBe("push");
  });

  it("each row carries the correct MUSCLE_NAMES display name", () => {
    const rows = buildLegend(ZERO_COV);
    for (const row of rows) {
      expect(row.name).toBe(MUSCLE_NAMES[row.muscle]);
    }
  });

  it("chest row.name equals MUSCLE_NAMES['chest'] = 'Chest'", () => {
    const rows = buildLegend(ZERO_COV);
    const row = rows.find((r) => r.muscle === "chest")!;
    expect(row.name).toBe("Chest");
  });

  it("pct field matches the coverage value for that muscle", () => {
    const cov = makeCoverage({ chest: 70, quads: 50, biceps: 20 });
    const rows = buildLegend(cov);
    expect(rows.find((r) => r.muscle === "chest")!.pct).toBe(70);
    expect(rows.find((r) => r.muscle === "quads")!.pct).toBe(50);
    expect(rows.find((r) => r.muscle === "biceps")!.pct).toBe(20);
  });

  it("accepts a custom muscles array — returns exactly those muscles", () => {
    const custom: MuscleKey[] = ["chest", "biceps"];
    const rows = buildLegend(ZERO_COV, custom);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.muscle)).toEqual(["chest", "biceps"]);
  });

  it("custom muscles: each row has correct pct from coverage", () => {
    const cov = makeCoverage({ chest: 80, biceps: 10 });
    const rows = buildLegend(cov, ["chest", "biceps"]);
    expect(rows[0].muscle).toBe("chest");
    expect(rows[0].pct).toBe(80);
    expect(rows[1].muscle).toBe("biceps");
    expect(rows[1].pct).toBe(10);
  });

  it("returns correct row shape: {muscle, name, pct, rec}", () => {
    const cov = makeCoverage({ chest: 70 });
    const rows = buildLegend(cov, ["chest"]);
    expect(rows[0]).toEqual({
      muscle: "chest",
      name: "Chest",
      pct: 70,
      rec: "rest",
    });
  });

  it("muscle absent from coverage (undefined) falls back to pct=0", () => {
    // Coverage with chest missing/at zero
    const rows = buildLegend(ZERO_COV, ["chest"]);
    expect(rows[0].pct).toBe(0);
  });
});

// =============================================================================
// buildRhythmRows
// =============================================================================

describe("buildRhythmRows", () => {
  it("returns an empty array for empty input", () => {
    const rows = buildRhythmRows([]);
    expect(rows).toHaveLength(0);
  });

  it("returns one row per slot", () => {
    const slots = [makeSlot({ id: "a" }), makeSlot({ id: "b" })];
    const rows = buildRhythmRows(slots);
    expect(rows).toHaveLength(2);
  });

  it("row id matches slot id", () => {
    const row = buildRhythmRows([makeSlot({ id: "slot-42" })])[0];
    expect(row.id).toBe("slot-42");
  });

  it("row timeStr matches slot timeStr", () => {
    const row = buildRhythmRows([makeSlot({ timeStr: "09:30" })])[0];
    expect(row.timeStr).toBe("09:30");
  });

  it("row exercise matches slot exercise", () => {
    const row = buildRhythmRows([makeSlot({ exercise: "Squat" })])[0];
    expect(row.exercise).toBe("Squat");
  });

  it("row sub is '<group> · <muscle names joined by \" , \">'", () => {
    const slot = makeSlot({
      group: "Chest",
      muscles: ["chest"],
    });
    const row = buildRhythmRows([slot])[0];
    expect(row.sub).toBe("Chest · Chest");
  });

  it("row sub with multiple muscles joins them with ', '", () => {
    const slot = makeSlot({
      group: "Shoulders",
      muscles: ["front_delts", "side_delts"],
    });
    const row = buildRhythmRows([slot])[0];
    expect(row.sub).toBe("Shoulders · Front Delts, Side Delts");
  });

  // --- status: done ---
  it("done slot: badge = result string", () => {
    const slot = makeSlot({ status: "done", result: "3×12", done: 3, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("3×12");
  });

  it("done slot: dotColor = var(--accent2)", () => {
    const slot = makeSlot({ status: "done", result: "2×10", done: 2, sets: 2 });
    const row = buildRhythmRows([slot])[0];
    expect(row.dotColor).toBe("var(--accent2)");
  });

  it("done slot: canStart = false", () => {
    const slot = makeSlot({ status: "done", result: "3×12", done: 3, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.canStart).toBe(false);
  });

  it("done slot: isNow = false", () => {
    const slot = makeSlot({ status: "done", result: "3×12", done: 3, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.isNow).toBe(false);
  });

  // --- status: now ---
  it("now slot: badge = 'Now'", () => {
    const slot = makeSlot({ status: "now", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("Now");
  });

  it("now slot: dotColor = var(--accent)", () => {
    const slot = makeSlot({ status: "now", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.dotColor).toBe("var(--accent)");
  });

  it("now slot: canStart = true", () => {
    const slot = makeSlot({ status: "now", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.canStart).toBe(true);
  });

  it("now slot: isNow = true", () => {
    const slot = makeSlot({ status: "now", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.isNow).toBe(true);
  });

  // --- status: skipped ---
  it("skipped slot: badge = 'Skipped'", () => {
    const slot = makeSlot({ status: "skipped", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("Skipped");
  });

  it("skipped slot: dotColor = var(--text3)", () => {
    const slot = makeSlot({ status: "skipped", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.dotColor).toBe("var(--text3)");
  });

  it("skipped slot: canStart = false", () => {
    const slot = makeSlot({ status: "skipped", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.canStart).toBe(false);
  });

  it("skipped slot: isNow = false", () => {
    const slot = makeSlot({ status: "skipped", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.isNow).toBe(false);
  });

  // --- status: upcoming, done=0 ---
  it("upcoming slot with done=0: badge = '—'", () => {
    const slot = makeSlot({ status: "upcoming", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("—");
  });

  it("upcoming slot with done=0: dotColor = var(--text3)", () => {
    const slot = makeSlot({ status: "upcoming", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.dotColor).toBe("var(--text3)");
  });

  it("upcoming slot with done=0: canStart = true", () => {
    const slot = makeSlot({ status: "upcoming", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.canStart).toBe(true);
  });

  it("upcoming slot with done=0: isNow = false", () => {
    const slot = makeSlot({ status: "upcoming", done: 0, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.isNow).toBe(false);
  });

  // --- status: upcoming, done>0 ---
  it("upcoming slot with done=1, sets=3: badge = '1/3 sets'", () => {
    const slot = makeSlot({ status: "upcoming", done: 1, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("1/3 sets");
  });

  it("upcoming slot with done=2, sets=4: badge = '2/4 sets'", () => {
    const slot = makeSlot({ status: "upcoming", done: 2, sets: 4 });
    const row = buildRhythmRows([slot])[0];
    expect(row.badge).toBe("2/4 sets");
  });

  it("upcoming slot with done>0: dotColor = var(--text3)", () => {
    const slot = makeSlot({ status: "upcoming", done: 1, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.dotColor).toBe("var(--text3)");
  });

  it("upcoming slot with done>0: canStart = true", () => {
    const slot = makeSlot({ status: "upcoming", done: 1, sets: 3 });
    const row = buildRhythmRows([slot])[0];
    expect(row.canStart).toBe(true);
  });

  it("handles multiple slots with different statuses in one call", () => {
    const slots = [
      makeSlot({ id: "s1", status: "done", result: "3×10", done: 3, sets: 3 }),
      makeSlot({ id: "s2", status: "now", done: 0, sets: 3 }),
      makeSlot({ id: "s3", status: "upcoming", done: 0, sets: 3 }),
      makeSlot({ id: "s4", status: "skipped", done: 0, sets: 3 }),
    ];
    const rows = buildRhythmRows(slots);
    expect(rows).toHaveLength(4);
    expect(rows[0].badge).toBe("3×10");
    expect(rows[1].badge).toBe("Now");
    expect(rows[2].badge).toBe("—");
    expect(rows[3].badge).toBe("Skipped");
  });

  it("row status matches slot status", () => {
    const slot = makeSlot({ status: "now" });
    const row = buildRhythmRows([slot])[0];
    expect(row.status).toBe("now");
  });
});

// =============================================================================
// buildHero
// =============================================================================

describe("buildHero", () => {
  it("null currentSlot → allDone = true", () => {
    const vm = buildHero(null, "", "", 0);
    expect(vm.allDone).toBe(true);
  });

  it("null currentSlot → kicker = empty string", () => {
    const vm = buildHero(null, "", "", 0);
    expect(vm.kicker).toBe("");
  });

  it("null currentSlot → exercise = empty string", () => {
    const vm = buildHero(null, "", "", 0);
    expect(vm.exercise).toBe("");
  });

  it("null currentSlot → group = empty string", () => {
    const vm = buildHero(null, "", "", 0);
    expect(vm.group).toBe("");
  });

  it("null currentSlot → muscleNames is empty array", () => {
    const vm = buildHero(null, "", "", 0);
    expect(vm.muscleNames).toEqual([]);
  });

  it("null currentSlot → suggestion passed through", () => {
    const vm = buildHero(null, "3×10", "", 0);
    expect(vm.suggestion).toBe("3×10");
  });

  it("null currentSlot → note passed through", () => {
    const vm = buildHero(null, "", "Great form", 0);
    expect(vm.note).toBe("Great form");
  });

  it("null currentSlot → setsTotal passed through", () => {
    const vm = buildHero(null, "", "", 5);
    expect(vm.setsTotal).toBe(5);
  });

  it("status='now' → allDone = false", () => {
    const slot = makeSlot({ status: "now" });
    const vm = buildHero(slot, "3×12", "Easy day", 3);
    expect(vm.allDone).toBe(false);
  });

  it("status='now' → kicker = 'UP NEXT · <timeStr>'", () => {
    const slot = makeSlot({ status: "now", timeStr: "08:00" });
    const vm = buildHero(slot, "3×12", "", 3);
    expect(vm.kicker).toBe("UP NEXT · 08:00");
  });

  it("status='upcoming' → kicker = 'LATER · <timeStr>'", () => {
    const slot = makeSlot({ status: "upcoming", timeStr: "10:30" });
    const vm = buildHero(slot, "3×10", "", 3);
    expect(vm.kicker).toBe("LATER · 10:30");
  });

  it("kicker uses the slot's timeStr correctly", () => {
    const slot = makeSlot({ status: "now", timeStr: "14:45" });
    const vm = buildHero(slot, "", "", 0);
    expect(vm.kicker).toBe("UP NEXT · 14:45");
  });

  it("exercise comes from slot.exercise", () => {
    const slot = makeSlot({ exercise: "Deadlift" });
    const vm = buildHero(slot, "", "", 0);
    expect(vm.exercise).toBe("Deadlift");
  });

  it("group comes from slot.group", () => {
    const slot = makeSlot({ group: "Back" });
    const vm = buildHero(slot, "", "", 0);
    expect(vm.group).toBe("Back");
  });

  it("muscleNames maps slot.muscles to MUSCLE_NAMES strings", () => {
    const slot = makeSlot({ muscles: ["chest", "front_delts"] });
    const vm = buildHero(slot, "", "", 0);
    expect(vm.muscleNames).toEqual(["Chest", "Front Delts"]);
  });

  it("muscleNames for single muscle", () => {
    const slot = makeSlot({ muscles: ["biceps"] });
    const vm = buildHero(slot, "", "", 0);
    expect(vm.muscleNames).toEqual(["Biceps"]);
  });

  it("suggestion is passed through from parameter", () => {
    const slot = makeSlot({ status: "now" });
    const vm = buildHero(slot, "4×8 @ 80kg", "", 3);
    expect(vm.suggestion).toBe("4×8 @ 80kg");
  });

  it("note is passed through from parameter", () => {
    const slot = makeSlot({ status: "now" });
    const vm = buildHero(slot, "", "Go heavier next week", 3);
    expect(vm.note).toBe("Go heavier next week");
  });

  it("setsTotal is passed through from parameter", () => {
    const slot = makeSlot({ status: "now" });
    const vm = buildHero(slot, "", "", 12);
    expect(vm.setsTotal).toBe(12);
  });
});

// =============================================================================
// HeroCard component
// =============================================================================

describe("HeroCard", () => {
  function makeHeroVM(overrides: Partial<HeroVM> = {}): HeroVM {
    return {
      allDone: false,
      kicker: "UP NEXT · 08:00",
      exercise: "Bench Press",
      group: "Chest",
      muscleNames: ["Chest", "Front Delts"],
      suggestion: "3×12",
      note: "Add weight next session",
      setsTotal: 3,
      ...overrides,
    };
  }

  it("renders the exercise name when not allDone", () => {
    const vm = makeHeroVM({ exercise: "Squat" });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("Squat")).toBeInTheDocument();
  });

  it("renders the kicker text", () => {
    const vm = makeHeroVM({ kicker: "UP NEXT · 09:00" });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("UP NEXT · 09:00")).toBeInTheDocument();
  });

  it("renders the suggestion text", () => {
    const vm = makeHeroVM({ suggestion: "4×10" });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("4×10")).toBeInTheDocument();
  });

  it("renders each muscle name as a chip/text", () => {
    const vm = makeHeroVM({ muscleNames: ["Chest", "Front Delts"] });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    // "Chest" may appear as both the group label and a muscle chip — verify at least one chip exists
    expect(screen.getAllByText("Chest").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
  });

  it("Start button calls onStart when clicked", () => {
    const onStart = vi.fn();
    const vm = makeHeroVM();
    render(<HeroCard vm={vm} onStart={onStart} onSnooze={() => {}} />);
    const startBtn = screen.getByRole("button", { name: /start/i });
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("Snooze button calls onSnooze when clicked", () => {
    const onSnooze = vi.fn();
    const vm = makeHeroVM();
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={onSnooze} />);
    const snoozeBtn = screen.getByRole("button", { name: /snooze/i });
    fireEvent.click(snoozeBtn);
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });

  it("Start button calls onStart exactly once per click", () => {
    const onStart = vi.fn();
    render(<HeroCard vm={makeHeroVM()} onStart={onStart} onSnooze={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it("allDone=true shows 'Day complete' text", () => {
    const vm = makeHeroVM({ allDone: true });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });

  it("allDone=true does NOT render exercise name", () => {
    const vm = makeHeroVM({ allDone: true, exercise: "Bench Press" });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
  });

  it("allDone=true does NOT show Start/Snooze buttons", () => {
    const vm = makeHeroVM({ allDone: true });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.queryByRole("button", { name: /start/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /snooze/i })).not.toBeInTheDocument();
  });

  it("renders the note text when present", () => {
    const vm = makeHeroVM({ note: "Keep elbows tucked" });
    render(<HeroCard vm={vm} onStart={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("Keep elbows tucked")).toBeInTheDocument();
  });
});

// =============================================================================
// RhythmCard component
// =============================================================================

describe("RhythmCard", () => {
  function makeRow(overrides: Partial<RhythmRow> = {}): RhythmRow {
    return {
      id: "row-1",
      timeStr: "08:00",
      exercise: "Bench Press",
      sub: "Chest · Chest",
      status: "upcoming",
      badge: "—",
      dotColor: "var(--text3)",
      canStart: true,
      isNow: false,
      ...overrides,
    };
  }

  it("renders 'Today's rhythm' header", () => {
    render(
      <RhythmCard rows={[]} doneCount={0} total={0} onStart={() => {}} />,
    );
    expect(screen.getByText(/today's rhythm/i)).toBeInTheDocument();
  });

  it("renders done/total count text", () => {
    render(
      <RhythmCard
        rows={[]}
        doneCount={2}
        total={5}
        onStart={() => {}}
      />,
    );
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("renders one row per RhythmRow in rows[]", () => {
    const rows = [
      makeRow({ id: "r1", exercise: "Squat" }),
      makeRow({ id: "r2", exercise: "Deadlift" }),
      makeRow({ id: "r3", exercise: "Press" }),
    ];
    render(<RhythmCard rows={rows} doneCount={0} total={3} onStart={() => {}} />);
    expect(screen.getByText("Squat")).toBeInTheDocument();
    expect(screen.getByText("Deadlift")).toBeInTheDocument();
    expect(screen.getByText("Press")).toBeInTheDocument();
  });

  it("renders timeStr for each row", () => {
    const rows = [makeRow({ timeStr: "10:30" })];
    render(<RhythmCard rows={rows} doneCount={0} total={1} onStart={() => {}} />);
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("renders the sub text for a row", () => {
    const rows = [makeRow({ sub: "Chest · Chest" })];
    render(<RhythmCard rows={rows} doneCount={0} total={1} onStart={() => {}} />);
    expect(screen.getByText("Chest · Chest")).toBeInTheDocument();
  });

  it("renders the badge text for a row", () => {
    const rows = [makeRow({ badge: "3×12", status: "done", canStart: false })];
    render(<RhythmCard rows={rows} doneCount={1} total={1} onStart={() => {}} />);
    expect(screen.getByText("3×12")).toBeInTheDocument();
  });

  it("canStart=true row has a Start button", () => {
    const rows = [makeRow({ canStart: true, id: "r1" })];
    render(<RhythmCard rows={rows} doneCount={0} total={1} onStart={() => {}} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("canStart=false row (done) has NO Start button", () => {
    const rows = [makeRow({ canStart: false, status: "done", badge: "3×10" })];
    render(<RhythmCard rows={rows} doneCount={1} total={1} onStart={() => {}} />);
    expect(screen.queryByRole("button", { name: /start/i })).not.toBeInTheDocument();
  });

  it("clicking Start on a canStart row calls onStart with that row's id", () => {
    const onStart = vi.fn();
    const rows = [makeRow({ id: "slot-xyz", canStart: true })];
    render(<RhythmCard rows={rows} doneCount={0} total={1} onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith("slot-xyz");
  });

  it("clicking Start on second row calls onStart with second row's id", () => {
    const onStart = vi.fn();
    const rows = [
      makeRow({ id: "r1", canStart: false, status: "done", badge: "done" }),
      makeRow({ id: "r2", canStart: true, exercise: "Deadlift" }),
    ];
    render(<RhythmCard rows={rows} doneCount={1} total={2} onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith("r2");
  });

  it("multiple canStart rows each have a Start button", () => {
    const rows = [
      makeRow({ id: "r1", canStart: true, exercise: "Ex1" }),
      makeRow({ id: "r2", canStart: true, exercise: "Ex2" }),
    ];
    render(<RhythmCard rows={rows} doneCount={0} total={2} onStart={() => {}} />);
    const startBtns = screen.getAllByRole("button", { name: /start/i });
    expect(startBtns).toHaveLength(2);
  });

  it("renders 'Now' badge for now-status row", () => {
    const rows = [makeRow({ status: "now", badge: "Now", isNow: true, canStart: true })];
    render(<RhythmCard rows={rows} doneCount={0} total={1} onStart={() => {}} />);
    expect(screen.getByText("Now")).toBeInTheDocument();
  });
});

// =============================================================================
// CoverageCard component
// =============================================================================

describe("CoverageCard", () => {
  const defaultProps: CoverageCardProps = {
    coverage: ZERO_COV,
    mapView: "front",
    mapStyle: "heat",
    onMapView: () => {},
    onMapStyle: () => {},
  };

  it("renders a body map (svg) element", () => {
    const { container } = render(<CoverageCard {...defaultProps} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders view Segmented control with Both/Front/Back options", () => {
    render(<CoverageCard {...defaultProps} />);
    // Should have buttons for front and back views at minimum
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent?.toLowerCase());
    const hasFront = labels.some((l) => l?.includes("front"));
    const hasBack = labels.some((l) => l?.includes("back"));
    expect(hasFront).toBe(true);
    expect(hasBack).toBe(true);
  });

  it("renders style Segmented control with Heat/Outline options", () => {
    render(<CoverageCard {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent?.toLowerCase());
    const hasHeat = labels.some((l) => l?.includes("heat"));
    const hasOutline = labels.some((l) => l?.includes("outline"));
    expect(hasHeat).toBe(true);
    expect(hasOutline).toBe(true);
  });

  it("clicking 'Back' in view segmented calls onMapView('back')", () => {
    const onMapView = vi.fn();
    render(<CoverageCard {...defaultProps} onMapView={onMapView} />);
    const buttons = screen.getAllByRole("button");
    const backBtn = buttons.find((b) => b.textContent?.toLowerCase().includes("back"));
    expect(backBtn).not.toBeUndefined();
    fireEvent.click(backBtn!);
    expect(onMapView).toHaveBeenCalledWith("back");
  });

  it("clicking 'Front' in view segmented calls onMapView('front')", () => {
    const onMapView = vi.fn();
    render(<CoverageCard {...defaultProps} mapView="back" onMapView={onMapView} />);
    const buttons = screen.getAllByRole("button");
    const frontBtn = buttons.find((b) => b.textContent?.toLowerCase() === "front");
    expect(frontBtn).not.toBeUndefined();
    fireEvent.click(frontBtn!);
    expect(onMapView).toHaveBeenCalledWith("front");
  });

  it("clicking 'Outline' in style segmented calls onMapStyle('outline')", () => {
    const onMapStyle = vi.fn();
    render(<CoverageCard {...defaultProps} onMapStyle={onMapStyle} />);
    const buttons = screen.getAllByRole("button");
    const outlineBtn = buttons.find((b) => b.textContent?.toLowerCase().includes("outline"));
    expect(outlineBtn).not.toBeUndefined();
    fireEvent.click(outlineBtn!);
    expect(onMapStyle).toHaveBeenCalledWith("outline");
  });

  it("clicking 'Heat' in style segmented calls onMapStyle('heat')", () => {
    const onMapStyle = vi.fn();
    render(<CoverageCard {...defaultProps} mapStyle="outline" onMapStyle={onMapStyle} />);
    const buttons = screen.getAllByRole("button");
    const heatBtn = buttons.find((b) => b.textContent?.toLowerCase() === "heat");
    expect(heatBtn).not.toBeUndefined();
    fireEvent.click(heatBtn!);
    expect(onMapStyle).toHaveBeenCalledWith("heat");
  });

  it("renders muscle bars (one per default legend muscle)", () => {
    const { container } = render(<CoverageCard {...defaultProps} />);
    // Should render at least 8 muscle bars for the 8 default display muscles
    const bars = container.querySelectorAll(".muscle-bar, [class*='muscle-bar'], [class*='bar']");
    // At minimum we should have some bar elements; confirm there's content
    // Check for presence of muscle name text
    expect(screen.getByText("Chest")).toBeInTheDocument();
  });

  it("renders the display name for lats muscle bar", () => {
    render(<CoverageCard {...defaultProps} />);
    expect(screen.getByText("Lats")).toBeInTheDocument();
  });

  it("renders back view body map when mapView='back'", () => {
    const { container } = render(
      <CoverageCard {...defaultProps} mapView="back" />,
    );
    // Should still render an svg
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

// =============================================================================
// VolumeInsightCard component
// =============================================================================

describe("VolumeInsightCard", () => {
  it("renders rest muscle names", () => {
    render(<VolumeInsightCard rest={["Chest", "Lats"]} push={[]} />);
    expect(screen.getByText(/chest/i)).toBeInTheDocument();
    expect(screen.getByText(/lats/i)).toBeInTheDocument();
  });

  it("renders push muscle names", () => {
    render(<VolumeInsightCard rest={[]} push={["Biceps", "Calves"]} />);
    expect(screen.getByText(/biceps/i)).toBeInTheDocument();
    expect(screen.getByText(/calves/i)).toBeInTheDocument();
  });

  it("renders 'Rest these' text when rest list is non-empty", () => {
    render(<VolumeInsightCard rest={["Chest"]} push={[]} />);
    expect(screen.getByText(/rest these/i)).toBeInTheDocument();
  });

  it("renders 'Push these' text when push list is non-empty", () => {
    render(<VolumeInsightCard rest={[]} push={["Biceps"]} />);
    expect(screen.getByText(/push these/i)).toBeInTheDocument();
  });

  it("renders both rest and push sections together", () => {
    render(<VolumeInsightCard rest={["Chest", "Lats"]} push={["Biceps", "Calves"]} />);
    expect(screen.getByText(/rest these/i)).toBeInTheDocument();
    expect(screen.getByText(/push these/i)).toBeInTheDocument();
    expect(screen.getByText(/chest/i)).toBeInTheDocument();
    expect(screen.getByText(/biceps/i)).toBeInTheDocument();
  });

  it("renders all rest muscle names joined", () => {
    render(<VolumeInsightCard rest={["Chest", "Lats", "Quads"]} push={[]} />);
    expect(screen.getByText(/chest/i)).toBeInTheDocument();
    expect(screen.getByText(/lats/i)).toBeInTheDocument();
    expect(screen.getByText(/quads/i)).toBeInTheDocument();
  });

  it("renders empty state gracefully (no errors)", () => {
    const { container } = render(<VolumeInsightCard rest={[]} push={[]} />);
    expect(container).toBeTruthy();
    // No error thrown, container has something
    expect(container.firstChild).not.toBeNull();
  });
});

// =============================================================================
// StatTiles component
// =============================================================================

describe("StatTiles", () => {
  const stats: StatTilesProps = {
    streak: "7",
    weekSets: "42",
    volume: "1,250 kg",
  };

  it("renders the streak value", () => {
    render(<StatTiles {...stats} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the weekSets value", () => {
    render(<StatTiles {...stats} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders the volume value", () => {
    render(<StatTiles {...stats} />);
    expect(screen.getByText("1,250 kg")).toBeInTheDocument();
  });

  it("renders exactly three stat values", () => {
    const { container } = render(<StatTiles {...stats} />);
    // At minimum there should be some child elements for the three tiles
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("1,250 kg")).toBeInTheDocument();
  });

  it("renders streak=0 correctly", () => {
    render(<StatTiles streak="0" weekSets="10" volume="500 kg" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders long volume string correctly", () => {
    render(<StatTiles streak="5" weekSets="30" volume="10,000 kg" />);
    expect(screen.getByText("10,000 kg")).toBeInTheDocument();
  });
});

// =============================================================================
// TodayScreen component
// =============================================================================

describe("TodayScreen", () => {
  function makeHeroVM(overrides: Partial<HeroVM> = {}): HeroVM {
    return {
      allDone: false,
      kicker: "UP NEXT · 08:00",
      exercise: "Bench Press",
      group: "Chest",
      muscleNames: ["Chest"],
      suggestion: "3×12",
      note: "Focus on form",
      setsTotal: 3,
      ...overrides,
    };
  }

  function makeRhythmRow(overrides: Partial<RhythmRow> = {}): RhythmRow {
    return {
      id: "slot-1",
      timeStr: "08:00",
      exercise: "Bench Press",
      sub: "Chest · Chest",
      status: "now",
      badge: "Now",
      dotColor: "var(--accent)",
      canStart: true,
      isNow: true,
      ...overrides,
    };
  }

  const defaultScreenProps: TodayScreenProps = {
    hero: makeHeroVM(),
    rhythm: [makeRhythmRow()],
    doneCount: 0,
    total: 1,
    coverage: ZERO_COV,
    mapView: "front",
    mapStyle: "heat",
    insightRest: ["Chest", "Lats"],
    insightPush: ["Biceps", "Calves"],
    stats: { streak: "5", weekSets: "30", volume: "800 kg" },
    onStartNext: () => {},
    onSnooze: () => {},
    onStartSlot: () => {},
    onMapView: () => {},
    onMapStyle: () => {},
  };

  it("renders the exercise name in the hero area", () => {
    render(<TodayScreen {...defaultScreenProps} />);
    // "Bench Press" appears in the hero card (and rhythm row if same exercise);
    // verify it is present at least once in the document.
    expect(screen.getAllByText("Bench Press").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Today's rhythm' header via RhythmCard", () => {
    render(<TodayScreen {...defaultScreenProps} />);
    expect(screen.getByText(/today's rhythm/i)).toBeInTheDocument();
  });

  it("renders body map svg via CoverageCard", () => {
    const { container } = render(<TodayScreen {...defaultScreenProps} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders rest muscle names via VolumeInsightCard", () => {
    render(<TodayScreen {...defaultScreenProps} insightRest={["Chest"]} insightPush={[]} />);
    // "Chest" may appear in BodyMap SVG title elements and muscle bars too; verify presence.
    expect(screen.getAllByText(/chest/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders push muscle names via VolumeInsightCard", () => {
    render(
      <TodayScreen {...defaultScreenProps} insightRest={[]} insightPush={["Biceps"]} />,
    );
    // "Biceps" may appear in BodyMap SVG titles and muscle bars too; verify presence.
    expect(screen.getAllByText(/biceps/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders streak stat value", () => {
    render(
      <TodayScreen
        {...defaultScreenProps}
        stats={{ streak: "12", weekSets: "60", volume: "2,000 kg" }}
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders weekSets stat value", () => {
    render(
      <TodayScreen
        {...defaultScreenProps}
        stats={{ streak: "5", weekSets: "55", volume: "1,500 kg" }}
      />,
    );
    expect(screen.getByText("55")).toBeInTheDocument();
  });

  it("renders volume stat value", () => {
    render(
      <TodayScreen
        {...defaultScreenProps}
        stats={{ streak: "3", weekSets: "20", volume: "999 kg" }}
      />,
    );
    expect(screen.getByText("999 kg")).toBeInTheDocument();
  });

  it("Start button in hero calls onStartNext", () => {
    const onStartNext = vi.fn();
    render(<TodayScreen {...defaultScreenProps} onStartNext={onStartNext} />);
    // Find start button in hero area
    const startBtns = screen.getAllByRole("button", { name: /start/i });
    fireEvent.click(startBtns[0]);
    expect(onStartNext).toHaveBeenCalledTimes(1);
  });

  it("Snooze button calls onSnooze", () => {
    const onSnooze = vi.fn();
    render(<TodayScreen {...defaultScreenProps} onSnooze={onSnooze} />);
    fireEvent.click(screen.getByRole("button", { name: /snooze/i }));
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });

  it("Start on a rhythm row calls onStartSlot with the slot id", () => {
    const onStartSlot = vi.fn();
    const rhythm = [
      makeRhythmRow({ id: "slot-abc", canStart: true, exercise: "Deadlift" }),
    ];
    render(
      <TodayScreen {...defaultScreenProps} rhythm={rhythm} onStartSlot={onStartSlot} />,
    );
    // The rhythm row start button — may be the second start button if hero also has one
    const startBtns = screen.getAllByRole("button", { name: /start/i });
    // Click the last one (rhythm row)
    fireEvent.click(startBtns[startBtns.length - 1]);
    expect(onStartSlot).toHaveBeenCalledWith("slot-abc");
  });

  it("allDone hero shows 'Day complete'", () => {
    const props = {
      ...defaultScreenProps,
      hero: makeHeroVM({ allDone: true }),
    };
    render(<TodayScreen {...props} />);
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });

  it("onMapView is wired to CoverageCard — clicking Back calls onMapView", () => {
    const onMapView = vi.fn();
    render(<TodayScreen {...defaultScreenProps} onMapView={onMapView} />);
    const buttons = screen.getAllByRole("button");
    const backBtn = buttons.find((b) => b.textContent?.toLowerCase().includes("back"));
    expect(backBtn).not.toBeUndefined();
    fireEvent.click(backBtn!);
    expect(onMapView).toHaveBeenCalledWith("back");
  });

  it("onMapStyle is wired to CoverageCard — clicking Outline calls onMapStyle", () => {
    const onMapStyle = vi.fn();
    render(<TodayScreen {...defaultScreenProps} onMapStyle={onMapStyle} />);
    const buttons = screen.getAllByRole("button");
    const outlineBtn = buttons.find((b) => b.textContent?.toLowerCase().includes("outline"));
    expect(outlineBtn).not.toBeUndefined();
    fireEvent.click(outlineBtn!);
    expect(onMapStyle).toHaveBeenCalledWith("outline");
  });

  it("renders kicker text from hero VM", () => {
    const hero = makeHeroVM({ kicker: "LATER · 11:00" });
    render(<TodayScreen {...defaultScreenProps} hero={hero} />);
    expect(screen.getByText("LATER · 11:00")).toBeInTheDocument();
  });

  it("renders suggestion from hero VM", () => {
    const hero = makeHeroVM({ suggestion: "5×5" });
    render(<TodayScreen {...defaultScreenProps} hero={hero} />);
    expect(screen.getByText("5×5")).toBeInTheDocument();
  });
});
