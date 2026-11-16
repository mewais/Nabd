/**
 * @nabd/modals — buildLibraryVM: what the exercise library shows for
 * its state, the library and the equipment the user owns.
 */

import { EQUIPMENT_KEYS } from "@nabd/domain";
import type { Equipment } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { buildLibraryVM } from "@nabd/modals";
import type { LibraryVM } from "@nabd/modals";
import { EX, LIBRARY } from "../support/plan-fixtures";
import { exercise } from "../support/domain-factories";

type LibraryState = Parameters<typeof buildLibraryVM>[0];

const state = (over: Partial<LibraryState> = {}): LibraryState => ({
  target: { kind: "extra" },
  search: "",
  group: null,
  draft: null,
  ...over,
});

function browse(over: Partial<LibraryState> = {}, owned: readonly Equipment[] = EQUIPMENT_KEYS) {
  const vm = buildLibraryVM(state(over), LIBRARY, owned);
  if (vm?.mode !== "browse") throw new Error("expected the browser");
  return vm.browser;
}

const names = (over: Partial<LibraryState> = {}, owned?: readonly Equipment[]): string[] =>
  browse(over, owned).rows.map((row) => row.name);

describe("buildLibraryVM", () => {
  it("is null while the library is closed", () => {
    expect(buildLibraryVM(state({ target: null }), LIBRARY, EQUIPMENT_KEYS)).toBeNull();
  });

  it("is titled by what picking an exercise will do", () => {
    const title = (target: LibraryState["target"]): string | undefined =>
      buildLibraryVM(state({ target }), LIBRARY, EQUIPMENT_KEYS)?.title;

    expect(title({ kind: "exercise" })).toBe("Add Exercise");
    expect(title({ kind: "pool", muscle: "rear_delts" })).toBe("Add to Pool — Rear Delts");
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
    const vm = buildLibraryVM(state(), new ExerciseLibrary([EX.bench, mine]), EQUIPMENT_KEYS);
    if (vm?.mode !== "browse") throw new Error("expected the browser");

    expect(vm.browser.rows.map((row) => [row.name, row.custom])).toEqual([
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
      const vm = buildLibraryVM(state({ draft: { ...draft, ...over } }), LIBRARY, EQUIPMENT_KEYS);
      if (vm?.mode !== "create") throw new Error("expected the form");
      return vm;
    };

    it("shows the form, filled from the draft, under the same title", () => {
      expect(form()).toEqual({
        title: "Log Something Else",
        mode: "create",
        form: { ...draft, canCreate: true },
      });
    });

    it("cannot create an exercise without a primary muscle", () => {
      expect(form({ primary: [] }).form.canCreate).toBe(false);
    });
  });
});
