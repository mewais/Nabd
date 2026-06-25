/** @jsxImportSource react */
/**
 * Tests for @nabd/bodymap — regionMuscle, regionStyle, BodyMap, MuscleBar.
 * All tests are RED against the skeleton (which throws "not implemented").
 * They turn GREEN once the code agent implements the bodies.
 * Together they exercise every export and every branch → 100% coverage of src/index.ts.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FRONT_MUSCLES, BACK_MUSCLES, VIEWBOX, ViewSide } from "../../assets/body/index";
import { MUSCLE_NAMES } from "@nabd/domain";
import type { Coverage, MuscleKey } from "@nabd/domain";
import {
  regionMuscle,
  regionStyle,
  BodyMap,
  MuscleBar,
} from "@nabd/bodymap";

// ---------------------------------------------------------------------------
// Coverage fixture helpers
// ---------------------------------------------------------------------------

/** Build a Coverage where every muscle is set to `defaultVal` (default 0). */
function makeCoverage(overrides: Partial<Record<MuscleKey, number>> = {}, defaultVal = 0): Coverage {
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

// Zero coverage — all muscles at 0
const ZERO_COV = makeCoverage({}, 0);
// Full coverage — all muscles at 100
const FULL_COV = makeCoverage({}, 100);
// Mixed: front_delts=50, everything else 0
const MID_COV = makeCoverage({ front_delts: 50 });

// ---------------------------------------------------------------------------
// regionMuscle
// ---------------------------------------------------------------------------

describe("regionMuscle", () => {
  it('returns "front_delts" for "shoulder-front-left"', () => {
    expect(regionMuscle("shoulder-front-left")).toBe("front_delts");
  });

  it('returns "front_delts" for "shoulder-front-right"', () => {
    expect(regionMuscle("shoulder-front-right")).toBe("front_delts");
  });

  it('returns "front_delts" for exact prefix "shoulder-front" (no suffix)', () => {
    // The prefix itself is "shoulder-front"; a region whose id IS the prefix is also matched
    expect(regionMuscle("shoulder-front")).toBe("front_delts");
  });

  it('returns "rhomboids" for "traps-mid-right"', () => {
    expect(regionMuscle("traps-mid-right")).toBe("rhomboids");
  });

  it('returns "rhomboids" for "traps-mid-left"', () => {
    expect(regionMuscle("traps-mid-left")).toBe("rhomboids");
  });

  it('returns "abductors" for "gluteus-medius-left"', () => {
    expect(regionMuscle("gluteus-medius-left")).toBe("abductors");
  });

  it('returns "abductors" for "gluteus-medius-right"', () => {
    expect(regionMuscle("gluteus-medius-right")).toBe("abductors");
  });

  it('returns null for decorative region "head"', () => {
    expect(regionMuscle("head")).toBeNull();
  });

  it('returns null for decorative region "hand-left"', () => {
    expect(regionMuscle("hand-left")).toBeNull();
  });

  it('returns null for decorative region "hand-right"', () => {
    expect(regionMuscle("hand-right")).toBeNull();
  });

  it('returns null for decorative region "face"', () => {
    expect(regionMuscle("face")).toBeNull();
  });

  it('returns null for decorative region "knee-left"', () => {
    expect(regionMuscle("knee-left")).toBeNull();
  });

  it('returns null for decorative region "knee-right"', () => {
    expect(regionMuscle("knee-right")).toBeNull();
  });

  it('returns null for decorative region "foot-left"', () => {
    expect(regionMuscle("foot-left")).toBeNull();
  });

  it('returns null for decorative region "elbow-right"', () => {
    expect(regionMuscle("elbow-right")).toBeNull();
  });

  it('returns null for an entirely unknown region id', () => {
    expect(regionMuscle("totally-unknown-region")).toBeNull();
  });

  it('returns "side_delts" for "shoulder-side-left"', () => {
    expect(regionMuscle("shoulder-side-left")).toBe("side_delts");
  });

  it('returns "rear_delts" for "deltoid-rear-left"', () => {
    expect(regionMuscle("deltoid-rear-left")).toBe("rear_delts");
  });

  it('returns "upper_traps" for "traps-upper-left"', () => {
    expect(regionMuscle("traps-upper-left")).toBe("upper_traps");
  });

  it('returns "lower_traps" for "traps-lower-right"', () => {
    expect(regionMuscle("traps-lower-right")).toBe("lower_traps");
  });

  it('returns "lats" for "lats-upper-left"', () => {
    expect(regionMuscle("lats-upper-left")).toBe("lats");
  });

  it('returns "lats" for "lats-mid-right"', () => {
    expect(regionMuscle("lats-mid-right")).toBe("lats");
  });

  it('returns "lats" for "lats-lower-left"', () => {
    expect(regionMuscle("lats-lower-left")).toBe("lats");
  });

  it('returns "lower_back" for "lower-back-erectors-left"', () => {
    expect(regionMuscle("lower-back-erectors-left")).toBe("lower_back");
  });

  it('returns "lower_back" for "lower-back-ql-right"', () => {
    expect(regionMuscle("lower-back-ql-right")).toBe("lower_back");
  });

  it('returns "lower_back" for "spine"', () => {
    expect(regionMuscle("spine")).toBe("lower_back");
  });

  it('returns "chest" for "chest-upper-left"', () => {
    expect(regionMuscle("chest-upper-left")).toBe("chest");
  });

  it('returns "chest" for "chest-lower-right"', () => {
    expect(regionMuscle("chest-lower-right")).toBe("chest");
  });

  it('returns "abs" for "abs-upper-left"', () => {
    expect(regionMuscle("abs-upper-left")).toBe("abs");
  });

  it('returns "abs" for "abs-lower-right"', () => {
    expect(regionMuscle("abs-lower-right")).toBe("abs");
  });

  it('returns "obliques" for "obliques-left"', () => {
    expect(regionMuscle("obliques-left")).toBe("obliques");
  });

  it('returns "obliques" for "serratus-anterior-right"', () => {
    expect(regionMuscle("serratus-anterior-right")).toBe("obliques");
  });

  it('returns "quads" for "quads-left"', () => {
    expect(regionMuscle("quads-left")).toBe("quads");
  });

  it('returns "hamstrings" for "hamstrings-medial-left"', () => {
    expect(regionMuscle("hamstrings-medial-left")).toBe("hamstrings");
  });

  it('returns "hamstrings" for "hamstrings-lateral-right"', () => {
    expect(regionMuscle("hamstrings-lateral-right")).toBe("hamstrings");
  });

  it('returns "glutes" for "gluteus-maximus-left"', () => {
    expect(regionMuscle("gluteus-maximus-left")).toBe("glutes");
  });

  it('returns "adductors" for "adductors-left"', () => {
    expect(regionMuscle("adductors-left")).toBe("adductors");
  });

  it('returns "calves" for "calves-gastroc-medial-left"', () => {
    expect(regionMuscle("calves-gastroc-medial-left")).toBe("calves");
  });

  it('returns "calves" for "calves-soleus-right"', () => {
    expect(regionMuscle("calves-soleus-right")).toBe("calves");
  });

  it('returns "tibialis" for "tibialis-anterior-left"', () => {
    expect(regionMuscle("tibialis-anterior-left")).toBe("tibialis");
  });

  it('returns "hip_flexors" for "hip-flexor-left"', () => {
    expect(regionMuscle("hip-flexor-left")).toBe("hip_flexors");
  });

  it('returns "biceps" for "biceps-left"', () => {
    expect(regionMuscle("biceps-left")).toBe("biceps");
  });

  it('returns "triceps" for "triceps-long-right"', () => {
    expect(regionMuscle("triceps-long-right")).toBe("triceps");
  });

  it('returns "triceps" for "triceps-lateral-left"', () => {
    expect(regionMuscle("triceps-lateral-left")).toBe("triceps");
  });

  it('returns "forearms" for "forearm-left"', () => {
    expect(regionMuscle("forearm-left")).toBe("forearms");
  });

  it('returns "forearms" for "forearm-flexors-left"', () => {
    expect(regionMuscle("forearm-flexors-left")).toBe("forearms");
  });

  it('returns "forearms" for "forearm-extensors-right"', () => {
    expect(regionMuscle("forearm-extensors-right")).toBe("forearms");
  });

  it('returns "neck" for "neck-right"', () => {
    expect(regionMuscle("neck-right")).toBe("neck");
  });

  it('returns "neck" for "nape"', () => {
    expect(regionMuscle("nape")).toBe("neck");
  });
});

// ---------------------------------------------------------------------------
// regionStyle — heat mode
// ---------------------------------------------------------------------------

describe("regionStyle — heat mode", () => {
  it("null region (decorative head) → neutral fill, no stroke/fillOpacity", () => {
    const s = regionStyle("head", ZERO_COV, "heat");
    expect(s.fill).toBe("var(--map-muscle)");
    // No fillOpacity on neutral
    expect(s.fillOpacity).toBeUndefined();
    expect(s.stroke).toBeUndefined();
  });

  it("null region (hand-left) → neutral fill", () => {
    const s = regionStyle("hand-left", ZERO_COV, "heat");
    expect(s.fill).toBe("var(--map-muscle)");
  });

  it("heat at c=0 → fillOpacity = 0.34", () => {
    const cov = makeCoverage({ front_delts: 0 });
    const s = regionStyle("shoulder-front-left", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });

  it("heat at c=100 → fillOpacity = 1.0", () => {
    const cov = makeCoverage({ front_delts: 100 });
    const s = regionStyle("shoulder-front-left", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat at c=50 → fillOpacity = 0.34 + 0.66*0.5 = 0.67", () => {
    const cov = makeCoverage({ front_delts: 50 });
    const s = regionStyle("shoulder-front-left", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat mode does not set stroke", () => {
    const cov = makeCoverage({ rhomboids: 80 });
    const s = regionStyle("traps-mid-right", cov, "heat");
    expect(s.stroke).toBeUndefined();
  });

  it("heat at c=0 for abductors (gluteus-medius) → fillOpacity = 0.34", () => {
    const cov = makeCoverage({ abductors: 0 });
    const s = regionStyle("gluteus-medius-left", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });

  it("heat at c=100 for abductors (gluteus-medius) → fillOpacity = 1.0", () => {
    const cov = makeCoverage({ abductors: 100 });
    const s = regionStyle("gluteus-medius-left", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  // Clamp checks: values beyond 0–100 should be clamped
  it("heat clamps c above 100 to 100 → fillOpacity = 1.0", () => {
    const cov = makeCoverage({ lats: 200 });
    const s = regionStyle("lats-upper-left", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat clamps c below 0 to 0 → fillOpacity = 0.34", () => {
    const cov = makeCoverage({ lats: -50 });
    const s = regionStyle("lats-upper-left", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });
});

// ---------------------------------------------------------------------------
// regionStyle — outline mode
// ---------------------------------------------------------------------------

describe("regionStyle — outline mode", () => {
  it("null region → neutral fill, no stroke", () => {
    const s = regionStyle("head", ZERO_COV, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.stroke).toBeUndefined();
  });

  it("outline at c=0 → strokeOpacity = 0.2", () => {
    const cov = makeCoverage({ rhomboids: 0 });
    const s = regionStyle("traps-mid-right", cov, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.stroke).toBe("var(--accent)");
    expect(s.strokeOpacity).toBeCloseTo(0.2, 5);
  });

  it("outline at c=100 → strokeOpacity = 1.0", () => {
    const cov = makeCoverage({ rhomboids: 100 });
    const s = regionStyle("traps-mid-right", cov, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.stroke).toBe("var(--accent)");
    expect(s.strokeOpacity).toBeCloseTo(1.0, 5);
  });

  it("outline at c=50 → strokeOpacity = 0.2 + 0.8*0.5 = 0.6", () => {
    const cov = makeCoverage({ rhomboids: 50 });
    const s = regionStyle("traps-mid-left", cov, "outline");
    expect(s.stroke).toBe("var(--accent)");
    expect(s.strokeOpacity).toBeCloseTo(0.6, 5);
  });

  it("outline mode does not override fill with accent", () => {
    const cov = makeCoverage({ front_delts: 100 });
    const s = regionStyle("shoulder-front-left", cov, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
  });

  it("outline clamps c above 100 to 100 → strokeOpacity = 1.0", () => {
    const cov = makeCoverage({ chest: 150 });
    const s = regionStyle("chest-upper-left", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(1.0, 5);
  });

  it("outline clamps c below 0 to 0 → strokeOpacity = 0.2", () => {
    const cov = makeCoverage({ chest: -10 });
    const s = regionStyle("chest-lower-right", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(0.2, 5);
  });
});

// ---------------------------------------------------------------------------
// BodyMap component
// ---------------------------------------------------------------------------

describe("BodyMap", () => {
  it("renders an <svg> element", () => {
    const { container } = render(
      <BodyMap side="front" coverage={ZERO_COV} />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("front view: svg viewBox matches VIEWBOX.front", () => {
    const { container } = render(
      <BodyMap side="front" coverage={ZERO_COV} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe(VIEWBOX[ViewSide.FRONT]);
  });

  it("back view: svg viewBox matches VIEWBOX.back", () => {
    const { container } = render(
      <BodyMap side="back" coverage={ZERO_COV} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe(VIEWBOX[ViewSide.BACK]);
  });

  it("front view: number of <path> elements equals FRONT_MUSCLES length", () => {
    const { container } = render(
      <BodyMap side="front" coverage={ZERO_COV} />
    );
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(FRONT_MUSCLES.length);
  });

  it("back view: number of <path> elements equals BACK_MUSCLES length", () => {
    const { container } = render(
      <BodyMap side="back" coverage={ZERO_COV} />
    );
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(BACK_MUSCLES.length);
  });

  it("front view: a muscle region path (shoulder-front-left) carries an accent fill when coverage > 0", () => {
    const cov = makeCoverage({ front_delts: 80 });
    const { container } = render(
      <BodyMap side="front" coverage={cov} style="heat" />
    );
    // Find the path for "shoulder-front-left" by its expected d attribute prefix
    const frontDeltRegion = FRONT_MUSCLES.find((m) => m.id === "shoulder-front-left");
    expect(frontDeltRegion).not.toBeUndefined();
    // We can check by querying all paths and matching by their d attribute
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find(
      (p) => p.getAttribute("d") === frontDeltRegion!.path
    );
    expect(targetPath).not.toBeUndefined();
    // The fill should be accent (heat mode, non-zero coverage)
    const fill = (targetPath as HTMLElement).style.fill;
    expect(fill).toBe("var(--accent)");
  });

  it("front view: a decorative region (head) has neutral fill", () => {
    const cov = FULL_COV;
    const { container } = render(
      <BodyMap side="front" coverage={cov} style="heat" />
    );
    const headRegion = FRONT_MUSCLES.find((m) => m.id === "head");
    expect(headRegion).not.toBeUndefined();
    const paths = Array.from(container.querySelectorAll("path"));
    const headPath = paths.find(
      (p) => p.getAttribute("d") === headRegion!.path
    );
    expect(headPath).not.toBeUndefined();
    const fill = (headPath as HTMLElement).style.fill;
    expect(fill).toBe("var(--map-muscle)");
  });

  it("back view: traps-mid-right path carries accent fill when rhomboids coverage > 0", () => {
    const cov = makeCoverage({ rhomboids: 60 });
    const { container } = render(
      <BodyMap side="back" coverage={cov} style="heat" />
    );
    const region = BACK_MUSCLES.find((m) => m.id === "traps-mid-right");
    expect(region).not.toBeUndefined();
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find(
      (p) => p.getAttribute("d") === region!.path
    );
    expect(targetPath).not.toBeUndefined();
    const fill = (targetPath as HTMLElement).style.fill;
    expect(fill).toBe("var(--accent)");
  });

  it("outline style: a muscle region path carries accent stroke", () => {
    const cov = makeCoverage({ front_delts: 50 });
    const { container } = render(
      <BodyMap side="front" coverage={cov} style="outline" />
    );
    const frontDeltRegion = FRONT_MUSCLES.find((m) => m.id === "shoulder-front-left");
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find(
      (p) => p.getAttribute("d") === frontDeltRegion!.path
    );
    expect(targetPath).not.toBeUndefined();
    const stroke = (targetPath as HTMLElement).style.stroke;
    expect(stroke).toBe("var(--accent)");
  });

  it("default style is heat (no style prop → heat behavior)", () => {
    // When style is omitted, it defaults to "heat"
    const cov = makeCoverage({ front_delts: 100 });
    const { container } = render(
      <BodyMap side="front" coverage={cov} />
    );
    const frontDeltRegion = FRONT_MUSCLES.find((m) => m.id === "shoulder-front-left");
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find(
      (p) => p.getAttribute("d") === frontDeltRegion!.path
    );
    expect(targetPath).not.toBeUndefined();
    // Heat mode → fill = accent
    const fill = (targetPath as HTMLElement).style.fill;
    expect(fill).toBe("var(--accent)");
  });

  it("renders a <title> element for a tracked muscle region with correct text", () => {
    const cov = makeCoverage({ front_delts: 75 });
    const { container } = render(
      <BodyMap side="front" coverage={cov} style="heat" />
    );
    // Title should be "<Muscle name> · <pct>%"
    // "front_delts" → "Front Delts · 75%"
    const titles = Array.from(container.querySelectorAll("title"));
    const frontDeltTitle = titles.find(
      (t) => t.textContent === `${MUSCLE_NAMES["front_delts"]} · 75%`
    );
    expect(frontDeltTitle).not.toBeUndefined();
  });

  it("accepts a width prop without error", () => {
    const { container } = render(
      <BodyMap side="front" coverage={ZERO_COV} width={300} />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// MuscleBar component
// ---------------------------------------------------------------------------

describe("MuscleBar", () => {
  it("renders the muscle display name", () => {
    const { getByText } = render(
      <MuscleBar muscle="front_delts" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["front_delts"])).not.toBeNull();
  });

  it("renders the pct as text (e.g. '50%')", () => {
    const { getByText } = render(
      <MuscleBar muscle="front_delts" pct={50} />
    );
    expect(getByText("50%")).not.toBeNull();
  });

  it("renders '0%' when pct is 0", () => {
    const { getByText } = render(
      <MuscleBar muscle="lats" pct={0} />
    );
    expect(getByText("0%")).not.toBeNull();
  });

  it("renders '100%' when pct is 100", () => {
    const { getByText } = render(
      <MuscleBar muscle="quads" pct={100} />
    );
    expect(getByText("100%")).not.toBeNull();
  });

  it("bar width style reflects pct (50% → width 50%)", () => {
    const { container } = render(
      <MuscleBar muscle="front_delts" pct={50} />
    );
    // Find the bar element — it should have width: 50% (or "50%")
    // Look for a child element whose style.width matches
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "50%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("bar width style reflects pct (20% → width 20%)", () => {
    const { container } = render(
      <MuscleBar muscle="biceps" pct={20} />
    );
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "20%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("bar width style reflects pct (70% → width 70%)", () => {
    const { container } = render(
      <MuscleBar muscle="hamstrings" pct={70} />
    );
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "70%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("shows 'Rest' tag when pct >= 66 (pct=70)", () => {
    const { getByText } = render(
      <MuscleBar muscle="hamstrings" pct={70} showRec={true} />
    );
    expect(getByText("Rest")).not.toBeNull();
  });

  it("shows 'Push' tag when pct <= 38 (pct=20)", () => {
    const { getByText } = render(
      <MuscleBar muscle="biceps" pct={20} showRec={true} />
    );
    expect(getByText("Push")).not.toBeNull();
  });

  it("shows no rec tag when pct is between 39 and 65 (pct=50)", () => {
    const { queryByText } = render(
      <MuscleBar muscle="front_delts" pct={50} showRec={true} />
    );
    expect(queryByText("Rest")).toBeNull();
    expect(queryByText("Push")).toBeNull();
  });

  it("boundary: pct=66 shows 'Rest'", () => {
    const { getByText } = render(
      <MuscleBar muscle="lats" pct={66} showRec={true} />
    );
    expect(getByText("Rest")).not.toBeNull();
  });

  it("boundary: pct=38 shows 'Push'", () => {
    const { getByText } = render(
      <MuscleBar muscle="triceps" pct={38} showRec={true} />
    );
    expect(getByText("Push")).not.toBeNull();
  });

  it("showRec=false hides the rec tag even when pct=70 (Rest territory)", () => {
    const { queryByText } = render(
      <MuscleBar muscle="hamstrings" pct={70} showRec={false} />
    );
    expect(queryByText("Rest")).toBeNull();
  });

  it("showRec=false hides the rec tag even when pct=20 (Push territory)", () => {
    const { queryByText } = render(
      <MuscleBar muscle="biceps" pct={20} showRec={false} />
    );
    expect(queryByText("Push")).toBeNull();
  });

  it("showRec not provided (undefined) hides the rec tag", () => {
    // Default for showRec should hide the tag
    const { queryByText } = render(
      <MuscleBar muscle="hamstrings" pct={70} />
    );
    // If showRec is undefined/false by default, no tag shown
    // (the spec says "if showRec" — undefined is falsy)
    expect(queryByText("Rest")).toBeNull();
  });

  it("renders 'forearms' muscle name (all 23 muscles are exercised via prior tests + this)", () => {
    const { getByText } = render(
      <MuscleBar muscle="forearms" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["forearms"])).not.toBeNull();
  });

  it("renders 'tibialis' muscle name", () => {
    const { getByText } = render(
      <MuscleBar muscle="tibialis" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["tibialis"])).not.toBeNull();
  });

  it("renders 'calves' muscle name", () => {
    const { getByText } = render(
      <MuscleBar muscle="calves" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["calves"])).not.toBeNull();
  });

  it("renders 'glutes' muscle name", () => {
    const { getByText } = render(
      <MuscleBar muscle="glutes" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["glutes"])).not.toBeNull();
  });

  it("renders 'quads' muscle name", () => {
    const { getByText } = render(
      <MuscleBar muscle="quads" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["quads"])).not.toBeNull();
  });

  it("renders 'adductors' muscle name", () => {
    const { getByText } = render(
      <MuscleBar muscle="adductors" pct={50} />
    );
    expect(getByText(MUSCLE_NAMES["adductors"])).not.toBeNull();
  });
});
