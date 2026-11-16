import { EQUIPMENT_KEYS, ExerciseSchema, MUSCLE_PRIMARY_GROUP, isTimeBased } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { exercise } from "../support/builders";
import { CATALOG, catalogLookup } from "../support/exercises";

const catalog = ExerciseLibrary.catalog;
/** The ids of the catalog's exercises of `movement`, in catalog order. */
const idsOf = (movement: string): string[] =>
  catalog
    .find({})
    .map((e) => e.id)
    .filter((id) => id.startsWith(`${movement}__`));

describe("the built-in catalog", () => {
  it("contains only valid exercises with unique ids", () => {
    const all = catalog.find({});
    expect(all.length).toBeGreaterThan(200);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    for (const ex of all) {
      expect(ExerciseSchema.safeParse(ex).success, ex.id).toBe(true);
      expect(ex.group, ex.id).toBe(MUSCLE_PRIMARY_GROUP[ex.primary[0]!]);
    }
  });

  it("names and tags well-known exercises sensibly", () => {
    expect(catalog.byId("bench_press__barbell")).toMatchObject({
      name: "Barbell Bench Press",
      group: "Chest",
      equipment: "barbell",
      tracking: "weight_reps",
    });
    expect(catalog.byId("pull_up__pullupbar")?.tracking).toBe("weighted_bodyweight");
    expect(isTimeBased(catalog.byId("plank__bodyweight")!.tracking)).toBe(true);
    expect(catalog.byId("nope")).toBeUndefined();
  });
});

describe("how the catalog's movements become exercises", () => {
  it("expands a movement over its equipment and laterality, naming each variant", () => {
    expect(idsOf("overhead_press").slice(0, 3)).toEqual([
      "overhead_press__barbell",
      "overhead_press__dumbbell",
      "overhead_press__dumbbell__uni",
    ]);
    expect(catalog.byId("overhead_press__dumbbell")?.name).toBe("Dumbbell Overhead Press");
    expect(catalog.byId("overhead_press__dumbbell__uni")?.name).toBe(
      "Single-Arm Dumbbell Overhead Press",
    );
    expect(catalog.byId("calf_raise__dumbbell__uni")?.name).toBe("Single-Leg Dumbbell Calf Raise");
  });

  it("applies name overrides and tracking defaults, and lists each secondary muscle once", () => {
    expect(catalog.byId("curl__machine")?.name).toBe("Preacher Curl");
    expect(catalog.byId("push_up__bodyweight")).toMatchObject({
      name: "Push-Up",
      tracking: "weighted_bodyweight",
    });
    for (const ex of catalog.find({})) {
      expect(new Set(ex.secondary).size, ex.id).toBe(ex.secondary.length);
    }
  });

  it("never offers two exercises under one name: a bodyweight one gives way to its equipped twin", () => {
    const names = catalog.find({}).map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("one-sided variants", () => {
  it("are never offered for a bar that takes both hands", () => {
    expect(idsOf("curl")).toEqual([
      "curl__barbell",
      "curl__dumbbell",
      "curl__dumbbell__uni",
      "curl__cable",
      "curl__cable__uni",
      "curl__bands",
      "curl__bands__uni",
      "curl__machine",
      "curl__machine__uni",
      "curl__ezbar",
    ]);
  });

  it("are kept for the legs, which a bar on the back or in the hands still leaves free", () => {
    expect(catalog.byId("calf_raise__barbell__uni")?.name).toBe("Single-Leg Barbell Calf Raise");
  });

  it("the catalog has no single-arm barbell, EZ-bar or Smith-machine exercise", () => {
    const names = catalog
      .find({ equipment: new Set(["barbell", "ezbar", "smith"] as const) })
      .map((e) => e.name);
    expect(names.filter((name) => name.startsWith("Single-Arm"))).toEqual([]);
    expect(names).toContain("Single-Leg Barbell Calf Raise");
    expect(catalog.byId("overhead_press__barbell__uni")).toBeUndefined();
    expect(catalog.byId("overhead_press__dumbbell__uni")).toBeDefined();
  });
});

describe("ExerciseLibrary", () => {
  const custom = exercise({
    name: "My Odd Lift",
    equipment: "kettlebell",
    group: "Back",
    custom: true,
  });
  const library = catalog.withCustom([custom]);

  it("adds custom exercises without touching the catalog", () => {
    expect(library.byId(custom.id)).toBe(custom);
    expect(catalog.byId(custom.id)).toBeUndefined();
    expect(catalog.withCustom([])).toBe(catalog);
  });

  it("offers its lookup as a function that can be handed to the engines", () => {
    const { lookup } = library;
    expect(lookup(custom.id)).toBe(custom);
    expect(lookup("nope")).toBeUndefined();
  });

  it("finds by name, group and owned equipment, in any combination", () => {
    expect(library.find({ text: "  odd LIFT " })).toEqual([custom]);
    expect(library.find({})).toHaveLength(catalog.find({}).length + 1);
    const back = library.find({ group: "Back" });
    expect(back).toContain(custom);
    expect(back.every((e) => e.group === "Back")).toBe(true);
    const owned = new Set(["dumbbell", "bodyweight"] as const);
    const doable = library.find({ equipment: owned });
    expect(doable.length).toBeGreaterThan(0);
    expect(doable.every((e) => owned.has(e.equipment as "dumbbell"))).toBe(true);
    expect(library.find({ equipment: new Set(EQUIPMENT_KEYS) })).toEqual(library.find({}));
    expect(library.find({ text: "odd", equipment: owned })).toEqual([]);
  });

  it("finds only what is counted in reps, or only what is timed", () => {
    const timed = library.find({ measure: "time" });
    expect(timed).toContain(catalogLookup(CATALOG.plank));
    expect(timed.every((e) => isTimeBased(e.tracking))).toBe(true);
    expect(library.find({ measure: "reps" })).toHaveLength(library.find({}).length - timed.length);
  });
});

describe("the exercises the test suites train on", () => {
  it.each(Object.values(CATALOG))("%s is in the catalog", (exId) => {
    expect(catalogLookup(exId)).toBeDefined();
  });
});
