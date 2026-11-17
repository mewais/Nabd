/**
 * @nabd/modals — buildLibraryVM: what the exercise library shows for
 * its state, the library and the equipment the user owns.
 */

import { EQUIPMENT_KEYS, MUSCLES } from "@nabd/domain";
import type { Equipment } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { buildLibraryVM } from "@nabd/modals";
import type { LibraryVM } from "@nabd/modals";
import type { LibraryState } from "@nabd/view";
import { exercise } from "../support/builders";
import { EX, LIBRARY } from "../support/exercises";

/** What the library is asked to show: its state, and (for a pool target) what the pool holds. */
type Scenario = Partial<LibraryState> & { pool?: string[]; library?: ExerciseLibrary };

function libraryVM(
  { pool = [], library = LIBRARY, ...state }: Scenario = {},
  owned: readonly Equipment[] = EQUIPMENT_KEYS,
): LibraryVM | null {
  const closed = { target: { kind: "extra" as const }, search: "", group: null, draft: null };
  return buildLibraryVM({ state: { ...closed, ...state }, pool, library, owned });
}

function browse(over: Scenario = {}, owned?: readonly Equipment[]) {
  const vm = libraryVM(over, owned);
  if (vm?.mode !== "browse") throw new Error("expected the browser");
  return vm.browser;
}

const names = (over: Scenario = {}, owned?: readonly Equipment[]): string[] =>
  browse(over, owned).rows.map((row) => row.name);

describe("buildLibraryVM", () => {
  it("is null while the library is closed", () => {
    expect(libraryVM({ target: null })).toBeNull();
  });

  it("is titled by what picking an exercise will do", () => {
    const title = (target: LibraryState["target"]): string | undefined =>
      libraryVM({ target })?.title;

    expect(title({ kind: "exercise", dayId: "d" })).toBe("Add Exercise");
    expect(title({ kind: "pool", dayId: "d", slotId: "s", muscle: "rear_delts" })).toBe(
      "Add to Pool — Rear Delts",
    );
    expect(title({ kind: "extra" })).toBe("Log Something Else");
  });

  it("describes each exercise: muscles, tracking and equipment", () => {
    expect(browse().rows[0]).toEqual({
      id: "bench",
      name: "Bench Press",
      detail: "Chest, Triceps, Front Delts · Weight & reps · Barbell",
      custom: false,
      addLabel: "Add Bench Press",
    });
  });

  it("flags custom exercises", () => {
    const mine = exercise({ id: "mine", name: "Desk Push-Up", custom: true });
    const { rows } = browse({ library: new ExerciseLibrary([EX.bench, mine]) });

    expect(rows.map((row) => [row.name, row.custom])).toEqual([
      ["Bench Press", false],
      ["Desk Push-Up", true],
    ]);
  });

  it("narrows the list by search text, whatever its case", () => {
    expect(names({ search: "PRESS" })).toEqual(["Bench Press"]);
    expect(browse({ search: "PRESS" }).search).toBe("PRESS");
  });

  it("narrows the list by muscle group; no group means all", () => {
    expect(browse().group).toBe("all");
    expect(browse({ group: "Back" }).group).toBe("Back");
    expect(names({ group: "Back" })).toEqual(["Barbell Row", "Assisted Pull-Up"]);
  });

  it("only offers what can be done with the owned equipment", () => {
    expect(names({}, ["bodyweight"])).toEqual(["Push-Up", "Plank", "Weighted Dip"]);
  });

  describe("opened to add to a cycled pool", () => {
    const pool = (members: string[]): Scenario => ({
      target: { kind: "pool", dayId: "d", slotId: "s", muscle: "abs" },
      pool: members,
    });

    it("offers everything while the pool is empty", () => {
      expect(names(pool([]))).toEqual(names());
      expect(browse(pool([])).scopeNote).toBeNull();
    });

    it("offers only timed exercises once the pool is timed, and says why", () => {
      expect(names(pool(["plank"]))).toEqual(["Plank"]);
      expect(browse(pool(["plank"])).scopeNote).toMatch(/only timed exercises are offered/);
    });

    it("offers no timed exercise once the pool is counted in reps", () => {
      expect(names(pool(["bench"]))).not.toContain("Plank");
      expect(names(pool(["bench"]))).toContain("Barbell Row");
      expect(browse(pool(["bench"])).scopeNote).toMatch(/timed exercises are not offered/);
    });
  });

  it("explains an empty result instead of listing nothing", () => {
    expect(browse().emptyNote).toBeNull();

    const none = browse({ search: "zzz" });
    expect(none.rows).toEqual([]);
    expect(none.emptyNote).toBe(
      "No exercises match — check the filter, or your equipment in Settings.",
    );
  });

  describe("with a draft", () => {
    type Draft = NonNullable<LibraryState["draft"]>;
    const draft: Draft = {
      name: "Goblet Squat",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "kettlebell",
      tracking: "weight_reps",
    };
    const form = (over: Partial<Draft> = {}): Extract<LibraryVM, { mode: "create" }> => {
      const vm = libraryVM({ draft: { ...draft, ...over } });
      if (vm?.mode !== "create") throw new Error("expected the form");
      return vm;
    };

    it("shows the form, filled from the draft, under the same title", () => {
      const vm = form();
      expect(vm).toMatchObject({
        title: "Log Something Else",
        mode: "create",
        form: { name: "Goblet Squat", equipment: "kettlebell", tracking: "weight_reps" },
      });
      expect(vm.form.primary.selected).toEqual(draft.primary);
      expect(vm.form.secondary.selected).toEqual(draft.secondary);
      expect(vm.form.canCreate).toBe(true);
    });

    it("offers every muscle as a chip that switches it in or out of its list", () => {
      const { primary, secondary } = form().form;
      const chip = (muscle: string, chips: typeof primary.chips) =>
        chips.find((c) => c.value === muscle);
      expect(primary.chips).toHaveLength(MUSCLES.length);
      expect(chip("glutes", primary.chips)?.toggle).toEqual({
        primary: [...draft.primary, "glutes"],
      });
      expect(chip(draft.primary[0]!, primary.chips)?.toggle).toEqual({
        primary: draft.primary.slice(1),
      });
      expect(chip("chest", secondary.chips)?.toggle).toEqual({
        secondary: [...draft.secondary, "chest"],
      });
    });

    it("cannot create an exercise without a primary muscle, or without a name", () => {
      expect(form({ primary: [] }).form.canCreate).toBe(false);
      expect(form({ name: "" }).form.canCreate).toBe(false);
      expect(form({ name: "   " }).form.canCreate).toBe(false);
    });
  });
});
