import { EQUIPMENT_KEYS, ExerciseSchema, MUSCLE_PRIMARY_GROUP, isTimeBased } from "@nabd/domain";
import { ExerciseLibrary, compose } from "@nabd/dataset";
import type { Movement } from "@nabd/dataset";
import { exercise } from "../support/domain-factories";

const catalog = ExerciseLibrary.catalog;

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

describe("compose", () => {
  const base: Movement = {
    id: "press",
    name: "Press",
    primary: ["chest"],
    secondary: ["triceps", "triceps"],
    equipment: ["bodyweight", "dumbbell"],
    laterality: ["bilateral", "unilateral"],
  };

  it("expands a movement over its equipment and laterality", () => {
    const names = compose([{ ...base, equipment: ["dumbbell"] }]).map((e) => [e.id, e.name]);
    expect(names).toEqual([
      ["press__dumbbell", "Dumbbell Press"],
      ["press__dumbbell__uni", "Single-Arm Dumbbell Press"],
    ]);
  });

  it("applies name overrides, leg naming, tracking defaults and de-duplicates secondaries", () => {
    const [pushUp] = compose([
      {
        ...base,
        equipment: ["bodyweight"],
        laterality: ["bilateral"],
        nameOverride: { bodyweight: "Push-Up" },
      },
    ]);
    expect(pushUp).toMatchObject({
      name: "Push-Up",
      tracking: "weighted_bodyweight",
      secondary: ["triceps"],
    });
    const [, legUni] = compose([{ ...base, primary: ["quads"], equipment: ["dumbbell"] }]);
    expect(legUni!.name).toBe("Single-Leg Dumbbell Press");
    const [hold] = compose([
      { ...base, equipment: ["bodyweight"], laterality: ["bilateral"], tracking: "duration" },
    ]);
    expect(hold!.tracking).toBe("duration");
  });

  it("drops the bodyweight variant when a same-named equipped variant exists", () => {
    const sameName = compose([
      {
        ...base,
        laterality: ["bilateral"],
        nameOverride: { bodyweight: "Press", dumbbell: "Press" },
      },
    ]);
    expect(sameName.map((e) => e.equipment)).toEqual(["dumbbell"]);
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
});
