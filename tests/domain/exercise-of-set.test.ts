import { exerciseOfSet } from "@nabd/domain";
import { exercise, logged, nov } from "../support/builders";

describe("exerciseOfSet", () => {
  const carry = exercise({
    id: "custom-1",
    name: "Garage Carry",
    group: "Forearms",
    primary: ["forearms"],
    secondary: ["upper_traps"],
  });

  it("rebuilds a stand-in from what the set recorded, first muscle primary", () => {
    expect(exerciseOfSet(logged(carry, nov(16), 10, 40))).toMatchObject({
      id: "custom-1",
      name: "Garage Carry",
      group: "Forearms",
      primary: ["forearms"],
      secondary: ["upper_traps"],
      tracking: "weight_reps",
    });
  });

  it("takes an unweighted set for a reps-only exercise", () => {
    expect(exerciseOfSet(logged(carry, nov(16), 10, null))?.tracking).toBe("reps_only");
  });

  it("is null for a set that names no muscle", () => {
    expect(exerciseOfSet(logged(carry, nov(16), 10, 40, { muscles: [] }))).toBeNull();
  });
});
