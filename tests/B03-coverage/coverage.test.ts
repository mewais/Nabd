import type { Exercise, Program } from "@nabd/domain";
import { MUSCLES } from "@nabd/domain";
import { FULL_COVERAGE_SETS, MuscleVolume, insight, recommendation } from "@nabd/coverage";
import { exercise, logged, nov, row, working } from "../support/domain-factories";

const press = exercise({ primary: ["chest"], secondary: ["triceps", "front_delts"] });
const fly = exercise({ primary: ["chest"], secondary: [] });
const curl = exercise({ primary: ["biceps"], secondary: ["forearms"] });
const lookup = (id: string): Exercise | undefined => [press, fly, curl].find((e) => e.id === id);

const threeSets = [working(8, 12), working(8, 12), working(8, 12)];
const prescription = { repMode: "range" as const, intensity: "none" as const, rest: 60 };

describe("planned volume", () => {
  it("fixed plans count a set fully for primary muscles and half for secondary; warm-ups don't count", () => {
    const program: Program = {
      name: "P",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d",
          name: "D",
          weekday: 1,
          slots: [],
          exercises: [
            row(press.id, [{ type: "warmup", a: 10 }, ...threeSets]),
            row(curl.id, [working(10), { type: "drop", a: 10 }]),
            row("missing", threeSets),
          ],
        },
      ],
    };
    const volume = MuscleVolume.ofProgram(program, lookup);
    expect(volume.of("chest")).toBe(3);
    expect(volume.of("triceps")).toBe(1.5);
    expect(volume.of("biceps")).toBe(2);
    expect(volume.of("forearms")).toBe(1);
    expect(volume.of("quads")).toBe(0);
    expect(volume.ranked().map((r) => r.muscle)).toEqual([
      "chest",
      "biceps",
      "triceps",
      "front_delts",
      "forearms",
    ]);
  });

  it("cycled slots spread their sets over the pool; an empty pool credits the target muscle", () => {
    const program: Program = {
      name: "C",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d",
          name: "D",
          weekday: null,
          exercises: [row(curl.id, threeSets)],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [press.id, fly.id],
              ...prescription,
              sets: threeSets,
            },
            { id: "s2", muscle: "lats", pool: [], ...prescription, sets: threeSets },
          ],
        },
      ],
    };
    const volume = MuscleVolume.ofProgram(program, lookup);
    expect(volume.of("chest")).toBe(3);
    expect(volume.of("triceps")).toBe(0.75);
    expect(volume.of("lats")).toBe(3);
    expect(volume.of("biceps")).toBe(0);
  });
});

describe("recent history", () => {
  const now = nov(16, 18);

  it("covers the last seven days, weighting by the library's primary/secondary muscles", () => {
    const history = [
      logged(press, nov(8), 10, 40),
      logged(press, nov(10), 10, 40),
      logged(press, nov(16, 10), 10, 40),
      logged(press, nov(16, 11), 10, 20, { setType: "warmup" }),
    ];
    const volume = MuscleVolume.ofRecentHistory(history, lookup, now);
    expect(volume.of("chest")).toBe(2);
    expect(volume.of("triceps")).toBe(1);
  });

  it("falls back to the logged muscles (first one primary) for a deleted exercise", () => {
    const gone = exercise({ primary: ["quads"], secondary: ["glutes"] });
    const volume = MuscleVolume.ofRecentHistory([logged(gone, nov(15), 10, 60)], lookup, now);
    expect(volume.of("quads")).toBe(1);
    expect(volume.of("glutes")).toBe(0.5);
  });

  it("turns sets into 0–100 coverage, saturating at the full-coverage volume", () => {
    const volume = new MuscleVolume();
    volume.add("chest", FULL_COVERAGE_SETS / 2);
    volume.add("biceps", FULL_COVERAGE_SETS * 3);
    const coverage = volume.toCoverage();
    expect(coverage.chest).toBe(50);
    expect(coverage.biceps).toBe(100);
    expect(coverage.calves).toBe(0);
    expect(Object.keys(coverage)).toHaveLength(MUSCLES.length);
  });
});

describe("recommendations", () => {
  it("rests well-covered muscles and pushes lagging ones", () => {
    expect(recommendation(66)).toBe("rest");
    expect(recommendation(65)).toBe("none");
    expect(recommendation(39)).toBe("none");
    expect(recommendation(38)).toBe("push");
  });

  it("only calls a muscle lagging if the plan targets it, and says nothing with nothing to say", () => {
    const planned = new MuscleVolume();
    planned.add("chest", 9);
    planned.add("biceps", 6);
    const actual = new MuscleVolume();
    expect(insight(actual.toCoverage(), planned)).toEqual({ rest: [], push: ["chest", "biceps"] });

    actual.add("chest", 14);
    actual.add("quads", 16);
    expect(insight(actual.toCoverage(), planned)).toEqual({
      rest: ["quads", "chest"],
      push: ["biceps"],
    });
    expect(insight(actual.toCoverage(), new MuscleVolume()).push).toEqual([]);
  });
});
