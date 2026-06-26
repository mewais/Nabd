/** @jsxImportSource react */
/**
 * Tests for @nabd/bodymap — regionMuscles, regionStyle, BodyMap, MuscleBar.
 * Uses the new react-native-body-highlighter asset (slug-based, path arrays).
 * Covers every export and branch → 100% coverage of src/index.ts.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FRONT_MUSCLES, BACK_MUSCLES, VIEWBOX } from "../../assets/body/index";
import { MUSCLE_NAMES } from "@nabd/domain";
import type { Coverage, MuscleKey } from "@nabd/domain";
import {
  regionMuscles,
  regionStyle,
  BodyMap,
  MuscleBar,
} from "@nabd/bodymap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count total paths rendered for a side (sum of all path-array entries per part). */
function totalPathCount(parts: typeof FRONT_MUSCLES): number {
  let n = 0;
  for (const p of parts) {
    n += (p.path.left?.length ?? 0);
    n += (p.path.right?.length ?? 0);
    n += (p.path.center?.length ?? 0);
    n += (p.path.common?.length ?? 0);
  }
  return n;
}

/** Build a Coverage where every muscle is set to `defaultVal`. */
function makeCoverage(overrides: Partial<Record<MuscleKey, number>> = {}, defaultVal = 0): Coverage {
  const muscles: MuscleKey[] = [
    "front_delts", "side_delts", "rear_delts", "neck", "upper_traps",
    "rhomboids", "lower_traps", "lats", "lower_back", "chest", "abs",
    "obliques", "quads", "hamstrings", "glutes", "abductors", "adductors",
    "calves", "tibialis", "hip_flexors", "biceps", "triceps", "forearms",
  ];
  const cov: Partial<Record<MuscleKey, number>> = {};
  for (const m of muscles) cov[m] = defaultVal;
  return { ...cov, ...overrides } as Coverage;
}

const ZERO_COV = makeCoverage({}, 0);
const FULL_COV = makeCoverage({}, 100);

// ---------------------------------------------------------------------------
// regionMuscles
// ---------------------------------------------------------------------------

describe("regionMuscles", () => {
  it("returns empty array for unmapped slugs (head)", () => {
    expect(regionMuscles("head")).toEqual([]);
  });

  it("returns empty array for unmapped slugs (hair)", () => {
    expect(regionMuscles("hair")).toEqual([]);
  });

  it("returns empty array for unmapped slugs (hands)", () => {
    expect(regionMuscles("hands")).toEqual([]);
  });

  it("returns empty array for unmapped slugs (feet)", () => {
    expect(regionMuscles("feet")).toEqual([]);
  });

  it("returns empty array for unmapped slugs (knees)", () => {
    expect(regionMuscles("knees")).toEqual([]);
  });

  it("returns empty array for unmapped slugs (ankles)", () => {
    expect(regionMuscles("ankles")).toEqual([]);
  });

  it("returns empty array for a completely unknown slug", () => {
    expect(regionMuscles("totally-unknown-slug")).toEqual([]);
  });

  it("deltoids → 3 muscles: front_delts, side_delts, rear_delts", () => {
    const result = regionMuscles("deltoids");
    expect(result).toContain("front_delts");
    expect(result).toContain("side_delts");
    expect(result).toContain("rear_delts");
    expect(result.length).toBe(3);
  });

  it("trapezius → 2 muscles: upper_traps, lower_traps", () => {
    const result = regionMuscles("trapezius");
    expect(result).toContain("upper_traps");
    expect(result).toContain("lower_traps");
    expect(result.length).toBe(2);
  });

  it("upper-back → 2 muscles: rhomboids, lats", () => {
    const result = regionMuscles("upper-back");
    expect(result).toContain("rhomboids");
    expect(result).toContain("lats");
    expect(result.length).toBe(2);
  });

  it("gluteal → 2 muscles: glutes, abductors", () => {
    const result = regionMuscles("gluteal");
    expect(result).toContain("glutes");
    expect(result).toContain("abductors");
    expect(result.length).toBe(2);
  });

  it("quadriceps → 2 muscles: quads, hip_flexors", () => {
    const result = regionMuscles("quadriceps");
    expect(result).toContain("quads");
    expect(result).toContain("hip_flexors");
    expect(result.length).toBe(2);
  });

  it("lower-back → [lower_back]", () => {
    const result = regionMuscles("lower-back");
    expect(result).toEqual(["lower_back"]);
  });

  it("chest → [chest]", () => {
    expect(regionMuscles("chest")).toEqual(["chest"]);
  });

  it("abs → [abs]", () => {
    expect(regionMuscles("abs")).toEqual(["abs"]);
  });

  it("obliques → [obliques]", () => {
    expect(regionMuscles("obliques")).toEqual(["obliques"]);
  });

  it("hamstring → [hamstrings]", () => {
    expect(regionMuscles("hamstring")).toEqual(["hamstrings"]);
  });

  it("adductors → [adductors]", () => {
    expect(regionMuscles("adductors")).toEqual(["adductors"]);
  });

  it("calves → [calves]", () => {
    expect(regionMuscles("calves")).toEqual(["calves"]);
  });

  it("tibialis → [tibialis]", () => {
    expect(regionMuscles("tibialis")).toEqual(["tibialis"]);
  });

  it("biceps → [biceps]", () => {
    expect(regionMuscles("biceps")).toEqual(["biceps"]);
  });

  it("triceps → [triceps]", () => {
    expect(regionMuscles("triceps")).toEqual(["triceps"]);
  });

  it("forearm → [forearms]", () => {
    expect(regionMuscles("forearm")).toEqual(["forearms"]);
  });

  it("neck → [neck]", () => {
    expect(regionMuscles("neck")).toEqual(["neck"]);
  });
});

// ---------------------------------------------------------------------------
// regionStyle — heat mode
// ---------------------------------------------------------------------------

describe("regionStyle — heat mode", () => {
  it("unmapped slug (head) → neutral fill, no fillOpacity, no stroke", () => {
    const s = regionStyle("head", ZERO_COV, "heat");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.fillOpacity).toBeUndefined();
    expect(s.stroke).toBeUndefined();
  });

  it("unmapped slug (hair) → neutral fill", () => {
    expect(regionStyle("hair", ZERO_COV, "heat").fill).toBe("var(--map-muscle)");
  });

  it("unmapped slug (hands) → neutral fill", () => {
    expect(regionStyle("hands", ZERO_COV, "heat").fill).toBe("var(--map-muscle)");
  });

  it("unmapped slug (feet) → neutral fill", () => {
    expect(regionStyle("feet", ZERO_COV, "heat").fill).toBe("var(--map-muscle)");
  });

  it("unmapped slug (knees) → neutral fill", () => {
    expect(regionStyle("knees", ZERO_COV, "heat").fill).toBe("var(--map-muscle)");
  });

  it("unmapped slug (ankles) → neutral fill", () => {
    expect(regionStyle("ankles", ZERO_COV, "heat").fill).toBe("var(--map-muscle)");
  });

  it("heat at c=0 for single-muscle slug (chest) → fillOpacity = 0.34", () => {
    const cov = makeCoverage({ chest: 0 });
    const s = regionStyle("chest", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });

  it("heat at c=100 for single-muscle slug (chest) → fillOpacity = 1.0", () => {
    const cov = makeCoverage({ chest: 100 });
    const s = regionStyle("chest", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat at c=50 for single-muscle slug (chest) → fillOpacity = 0.67", () => {
    const cov = makeCoverage({ chest: 50 });
    const s = regionStyle("chest", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat mode does not set stroke", () => {
    const s = regionStyle("chest", makeCoverage({ chest: 80 }), "heat");
    expect(s.stroke).toBeUndefined();
  });

  it("heat: deltoids averages 3 muscles (front=0, side=0, rear=0) → fillOpacity=0.34", () => {
    const cov = makeCoverage({ front_delts: 0, side_delts: 0, rear_delts: 0 });
    const s = regionStyle("deltoids", cov, "heat");
    expect(s.fill).toBe("var(--accent)");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });

  it("heat: deltoids averages 3 muscles (front=100, side=100, rear=100) → fillOpacity=1.0", () => {
    const cov = makeCoverage({ front_delts: 100, side_delts: 100, rear_delts: 100 });
    const s = regionStyle("deltoids", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat: deltoids averages 3 muscles (front=100, side=0, rear=50) → avg=50 → fillOpacity=0.67", () => {
    const cov = makeCoverage({ front_delts: 100, side_delts: 0, rear_delts: 50 });
    const s = regionStyle("deltoids", cov, "heat");
    // avg = (100+0+50)/3 = 50; fillOpacity = 0.34 + 0.66*0.5 = 0.67
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat: trapezius averages 2 muscles (upper=60, lower=40) → avg=50 → fillOpacity=0.67", () => {
    const cov = makeCoverage({ upper_traps: 60, lower_traps: 40 });
    const s = regionStyle("trapezius", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat: upper-back averages 2 muscles (rhomboids=100, lats=0) → avg=50 → fillOpacity=0.67", () => {
    const cov = makeCoverage({ rhomboids: 100, lats: 0 });
    const s = regionStyle("upper-back", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat: gluteal averages 2 muscles (glutes=0, abductors=0) → avg=0 → fillOpacity=0.34", () => {
    const cov = makeCoverage({ glutes: 0, abductors: 0 });
    const s = regionStyle("gluteal", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });

  it("heat: gluteal averages 2 muscles (glutes=100, abductors=100) → avg=100 → fillOpacity=1.0", () => {
    const cov = makeCoverage({ glutes: 100, abductors: 100 });
    const s = regionStyle("gluteal", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat: quadriceps averages 2 muscles (quads=100, hip_flexors=0) → avg=50 → fillOpacity=0.67", () => {
    const cov = makeCoverage({ quads: 100, hip_flexors: 0 });
    const s = regionStyle("quadriceps", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.67, 5);
  });

  it("heat clamps c above 100 to 100 → fillOpacity = 1.0", () => {
    const cov = makeCoverage({ abs: 200 });
    const s = regionStyle("abs", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(1.0, 5);
  });

  it("heat clamps c below 0 to 0 → fillOpacity = 0.34", () => {
    const cov = makeCoverage({ abs: -50 });
    const s = regionStyle("abs", cov, "heat");
    expect(s.fillOpacity).toBeCloseTo(0.34, 5);
  });
});

// ---------------------------------------------------------------------------
// regionStyle — outline mode
// ---------------------------------------------------------------------------

describe("regionStyle — outline mode", () => {
  it("unmapped slug (head) → neutral fill, no stroke", () => {
    const s = regionStyle("head", ZERO_COV, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.stroke).toBeUndefined();
  });

  it("outline at c=0 for single-muscle slug → strokeOpacity = 0.2", () => {
    const cov = makeCoverage({ biceps: 0 });
    const s = regionStyle("biceps", cov, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
    expect(s.stroke).toBe("var(--accent)");
    expect(s.strokeOpacity).toBeCloseTo(0.2, 5);
  });

  it("outline at c=100 for single-muscle slug → strokeOpacity = 1.0", () => {
    const cov = makeCoverage({ biceps: 100 });
    const s = regionStyle("biceps", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(1.0, 5);
  });

  it("outline at c=50 for single-muscle slug → strokeOpacity = 0.6", () => {
    const cov = makeCoverage({ triceps: 50 });
    const s = regionStyle("triceps", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(0.6, 5);
  });

  it("outline: deltoids averages 3 muscles (all=100) → strokeOpacity=1.0", () => {
    const cov = makeCoverage({ front_delts: 100, side_delts: 100, rear_delts: 100 });
    const s = regionStyle("deltoids", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(1.0, 5);
  });

  it("outline: deltoids averages 3 muscles (front=60, side=0, rear=0) → avg=20 → strokeOpacity=0.36", () => {
    const cov = makeCoverage({ front_delts: 60, side_delts: 0, rear_delts: 0 });
    const s = regionStyle("deltoids", cov, "outline");
    // avg = 60/3 = 20; strokeOpacity = 0.2 + 0.8*0.2 = 0.36
    expect(s.strokeOpacity).toBeCloseTo(0.36, 5);
  });

  it("outline mode fill is always var(--map-muscle), not accent", () => {
    const cov = makeCoverage({ chest: 100 });
    const s = regionStyle("chest", cov, "outline");
    expect(s.fill).toBe("var(--map-muscle)");
  });

  it("outline clamps c above 100 to 100 → strokeOpacity = 1.0", () => {
    const cov = makeCoverage({ calves: 150 });
    const s = regionStyle("calves", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(1.0, 5);
  });

  it("outline clamps c below 0 to 0 → strokeOpacity = 0.2", () => {
    const cov = makeCoverage({ calves: -10 });
    const s = regionStyle("calves", cov, "outline");
    expect(s.strokeOpacity).toBeCloseTo(0.2, 5);
  });
});

// ---------------------------------------------------------------------------
// BodyMap component
// ---------------------------------------------------------------------------

describe("BodyMap", () => {
  it("renders an <svg> element", () => {
    const { container } = render(<BodyMap side="front" coverage={ZERO_COV} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("front view: svg viewBox matches VIEWBOX.front", () => {
    const { container } = render(<BodyMap side="front" coverage={ZERO_COV} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe(VIEWBOX.front);
  });

  it("back view: svg viewBox matches VIEWBOX.back", () => {
    const { container } = render(<BodyMap side="back" coverage={ZERO_COV} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe(VIEWBOX.back);
  });

  it("front view: number of <path> elements equals total path strings in FRONT_MUSCLES", () => {
    const { container } = render(<BodyMap side="front" coverage={ZERO_COV} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(totalPathCount(FRONT_MUSCLES));
  });

  it("back view: number of <path> elements equals total path strings in BACK_MUSCLES", () => {
    const { container } = render(<BodyMap side="back" coverage={ZERO_COV} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(totalPathCount(BACK_MUSCLES));
  });

  it("front view: a chest path carries accent fill when coverage > 0 (heat)", () => {
    const cov = makeCoverage({ chest: 80 });
    const { container } = render(<BodyMap side="front" coverage={cov} style="heat" />);
    // All chest paths should have accent fill
    const chestPart = FRONT_MUSCLES.find((m) => m.slug === "chest");
    expect(chestPart).not.toBeUndefined();
    const firstChestPath = chestPart!.path.left![0];
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find((p) => p.getAttribute("d") === firstChestPath);
    expect(targetPath).not.toBeUndefined();
    expect((targetPath as HTMLElement).style.fill).toBe("var(--accent)");
  });

  it("front view: head paths (unmapped) have neutral fill even at full coverage", () => {
    const { container } = render(<BodyMap side="front" coverage={FULL_COV} style="heat" />);
    const headPart = FRONT_MUSCLES.find((m) => m.slug === "head");
    expect(headPart).not.toBeUndefined();
    // Head uses common paths
    const firstHeadPath = headPart!.path.common![0];
    const paths = Array.from(container.querySelectorAll("path"));
    const headPath = paths.find((p) => p.getAttribute("d") === firstHeadPath);
    expect(headPath).not.toBeUndefined();
    expect((headPath as HTMLElement).style.fill).toBe("var(--map-muscle)");
  });

  it("back view: gluteal slug carries accent fill when glutes+abductors coverage > 0", () => {
    const cov = makeCoverage({ glutes: 60, abductors: 40 });
    const { container } = render(<BodyMap side="back" coverage={cov} style="heat" />);
    const glutealPart = BACK_MUSCLES.find((m) => m.slug === "gluteal");
    expect(glutealPart).not.toBeUndefined();
    const firstGlutealPath = glutealPart!.path.left![0];
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find((p) => p.getAttribute("d") === firstGlutealPath);
    expect(targetPath).not.toBeUndefined();
    expect((targetPath as HTMLElement).style.fill).toBe("var(--accent)");
  });

  it("outline style: a muscle slug path carries accent stroke", () => {
    const cov = makeCoverage({ biceps: 50 });
    const { container } = render(<BodyMap side="front" coverage={cov} style="outline" />);
    const bicepsPart = FRONT_MUSCLES.find((m) => m.slug === "biceps");
    expect(bicepsPart).not.toBeUndefined();
    const firstBicepsPath = bicepsPart!.path.left![0];
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find((p) => p.getAttribute("d") === firstBicepsPath);
    expect(targetPath).not.toBeUndefined();
    expect((targetPath as HTMLElement).style.stroke).toBe("var(--accent)");
  });

  it("default style is heat (no style prop)", () => {
    const cov = makeCoverage({ chest: 100 });
    const { container } = render(<BodyMap side="front" coverage={cov} />);
    const chestPart = FRONT_MUSCLES.find((m) => m.slug === "chest");
    const firstChestPath = chestPart!.path.left![0];
    const paths = Array.from(container.querySelectorAll("path"));
    const targetPath = paths.find((p) => p.getAttribute("d") === firstChestPath);
    expect(targetPath).not.toBeUndefined();
    expect((targetPath as HTMLElement).style.fill).toBe("var(--accent)");
  });

  it("renders a <title> element for a tracked muscle region with muscle name and avg %", () => {
    // chest maps to ["chest"], avg = 75%
    const cov = makeCoverage({ chest: 75 });
    const { container } = render(<BodyMap side="front" coverage={cov} style="heat" />);
    const titles = Array.from(container.querySelectorAll("title"));
    const chestTitle = titles.find(
      (t) => t.textContent === `${MUSCLE_NAMES["chest"]} · 75%`
    );
    expect(chestTitle).not.toBeUndefined();
  });

  it("renders a <title> for deltoids region with 3-muscle average rounded", () => {
    // front=90, side=60, rear=0 → avg = 50 → title has 50%
    const cov = makeCoverage({ front_delts: 90, side_delts: 60, rear_delts: 0 });
    const { container } = render(<BodyMap side="front" coverage={cov} style="heat" />);
    const titles = Array.from(container.querySelectorAll("title"));
    // Title should contain all 3 muscle names and 50%
    const deltaTitle = titles.find(
      (t) => t.textContent !== null && t.textContent.includes("50%")
    );
    expect(deltaTitle).not.toBeUndefined();
    expect(deltaTitle!.textContent).toContain("Front Delts");
    expect(deltaTitle!.textContent).toContain("Side Delts");
    expect(deltaTitle!.textContent).toContain("Rear Delts");
  });

  it("no <title> element for unmapped regions (head, hair)", () => {
    const { container } = render(<BodyMap side="front" coverage={FULL_COV} />);
    const paths = container.querySelectorAll("path");
    // Paths for head/hair should have no title child
    const headPart = FRONT_MUSCLES.find((m) => m.slug === "head");
    const hairPart = FRONT_MUSCLES.find((m) => m.slug === "hair");
    expect(headPart).not.toBeUndefined();
    expect(hairPart).not.toBeUndefined();
    const firstHeadD = headPart!.path.common![0];
    const firstHairD = hairPart!.path.common![0];
    const allPaths = Array.from(paths);
    const headPath = allPaths.find((p) => p.getAttribute("d") === firstHeadD);
    const hairPath = allPaths.find((p) => p.getAttribute("d") === firstHairD);
    expect(headPath).not.toBeUndefined();
    expect(hairPath).not.toBeUndefined();
    expect(headPath!.querySelector("title")).toBeNull();
    expect(hairPath!.querySelector("title")).toBeNull();
  });

  it("accepts a width prop without error", () => {
    const { container } = render(<BodyMap side="front" coverage={ZERO_COV} width={300} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("default width is 124", () => {
    const { container } = render(<BodyMap side="front" coverage={ZERO_COV} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // React renders width as attribute
    expect(svg!.getAttribute("width")).toBe("124");
  });
});

// ---------------------------------------------------------------------------
// MuscleBar component
// ---------------------------------------------------------------------------

describe("MuscleBar", () => {
  it("renders the muscle display name", () => {
    const { getByText } = render(<MuscleBar muscle="front_delts" pct={50} />);
    expect(getByText(MUSCLE_NAMES["front_delts"])).not.toBeNull();
  });

  it("renders the pct as text (e.g. '50%')", () => {
    const { getByText } = render(<MuscleBar muscle="front_delts" pct={50} />);
    expect(getByText("50%")).not.toBeNull();
  });

  it("renders '0%' when pct is 0", () => {
    const { getByText } = render(<MuscleBar muscle="lats" pct={0} />);
    expect(getByText("0%")).not.toBeNull();
  });

  it("renders '100%' when pct is 100", () => {
    const { getByText } = render(<MuscleBar muscle="quads" pct={100} />);
    expect(getByText("100%")).not.toBeNull();
  });

  it("bar width style reflects pct (50% → width 50%)", () => {
    const { container } = render(<MuscleBar muscle="front_delts" pct={50} />);
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "50%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("bar width style reflects pct (20% → width 20%)", () => {
    const { container } = render(<MuscleBar muscle="biceps" pct={20} />);
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "20%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("bar width style reflects pct (70% → width 70%)", () => {
    const { container } = render(<MuscleBar muscle="hamstrings" pct={70} />);
    const bars = container.querySelectorAll("[style]");
    const barEl = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width === "70%"
    );
    expect(barEl).not.toBeUndefined();
  });

  it("shows 'Rest' tag when pct >= 66 (pct=70)", () => {
    const { getByText } = render(<MuscleBar muscle="hamstrings" pct={70} showRec={true} />);
    expect(getByText("Rest")).not.toBeNull();
  });

  it("shows 'Push' tag when pct <= 38 (pct=20)", () => {
    const { getByText } = render(<MuscleBar muscle="biceps" pct={20} showRec={true} />);
    expect(getByText("Push")).not.toBeNull();
  });

  it("shows no rec tag when pct is between 39 and 65 (pct=50)", () => {
    const { queryByText } = render(<MuscleBar muscle="front_delts" pct={50} showRec={true} />);
    expect(queryByText("Rest")).toBeNull();
    expect(queryByText("Push")).toBeNull();
  });

  it("boundary: pct=66 shows 'Rest'", () => {
    const { getByText } = render(<MuscleBar muscle="lats" pct={66} showRec={true} />);
    expect(getByText("Rest")).not.toBeNull();
  });

  it("boundary: pct=38 shows 'Push'", () => {
    const { getByText } = render(<MuscleBar muscle="triceps" pct={38} showRec={true} />);
    expect(getByText("Push")).not.toBeNull();
  });

  it("showRec=false hides the rec tag even when pct=70 (Rest territory)", () => {
    const { queryByText } = render(<MuscleBar muscle="hamstrings" pct={70} showRec={false} />);
    expect(queryByText("Rest")).toBeNull();
  });

  it("showRec=false hides the rec tag even when pct=20 (Push territory)", () => {
    const { queryByText } = render(<MuscleBar muscle="biceps" pct={20} showRec={false} />);
    expect(queryByText("Push")).toBeNull();
  });

  it("showRec not provided (undefined) hides the rec tag", () => {
    const { queryByText } = render(<MuscleBar muscle="hamstrings" pct={70} />);
    expect(queryByText("Rest")).toBeNull();
  });

  it("renders 'forearms' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="forearms" pct={50} />);
    expect(getByText(MUSCLE_NAMES["forearms"])).not.toBeNull();
  });

  it("renders 'tibialis' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="tibialis" pct={50} />);
    expect(getByText(MUSCLE_NAMES["tibialis"])).not.toBeNull();
  });

  it("renders 'calves' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="calves" pct={50} />);
    expect(getByText(MUSCLE_NAMES["calves"])).not.toBeNull();
  });

  it("renders 'glutes' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="glutes" pct={50} />);
    expect(getByText(MUSCLE_NAMES["glutes"])).not.toBeNull();
  });

  it("renders 'quads' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="quads" pct={50} />);
    expect(getByText(MUSCLE_NAMES["quads"])).not.toBeNull();
  });

  it("renders 'adductors' muscle name", () => {
    const { getByText } = render(<MuscleBar muscle="adductors" pct={50} />);
    expect(getByText(MUSCLE_NAMES["adductors"])).not.toBeNull();
  });
});
