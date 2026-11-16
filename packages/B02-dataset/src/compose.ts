import type { Equipment, Exercise, MuscleKey, TrackingType } from "@nabd/domain";
import { MUSCLE_PRIMARY_GROUP } from "@nabd/domain";
import type { Movement } from "./movement";

/** How each kind of equipment reads in front of a movement's name ("" = not mentioned). */
const EQUIPMENT_NAME_PREFIX: Record<Equipment, string> = {
  bodyweight: "",
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  ezbar: "EZ-Bar",
  kettlebell: "Kettlebell",
  bands: "Band",
  pullupbar: "",
  bench: "Bench",
  cable: "Cable",
  machine: "Machine",
  smith: "Smith Machine",
};

/** Muscles whose one-sided exercises are "Single-Leg" rather than "Single-Arm". */
const LEG_MUSCLES: ReadonlySet<MuscleKey> = new Set<MuscleKey>([
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "tibialis",
  "hip_flexors",
]);

function trackingOf(movement: Movement, equipment: Equipment): TrackingType {
  if (movement.tracking) return movement.tracking;
  const ownBody = equipment === "bodyweight" || equipment === "pullupbar";
  return ownBody ? "weighted_bodyweight" : "weight_reps";
}

function nameOf(movement: Movement, equipment: Equipment, unilateral: boolean): string {
  const overrides = movement.nameOverride ?? {};
  if (unilateral && overrides.uni) return overrides.uni;
  const prefix = EQUIPMENT_NAME_PREFIX[equipment];
  const composed = prefix === "" ? movement.name : `${prefix} ${movement.name}`;
  const name = overrides[equipment] ?? composed;
  if (!unilateral) return name;
  return `${LEG_MUSCLES.has(movement.primary[0]) ? "Single-Leg" : "Single-Arm"} ${name}`;
}

/** One exercise per equipment × laterality the movement can be done with. */
function variantsOf(movement: Movement): Exercise[] {
  return movement.equipment.flatMap((equipment) =>
    movement.laterality.map((laterality): Exercise => {
      const unilateral = laterality === "unilateral";
      return {
        id: `${movement.id}__${equipment}${unilateral ? "__uni" : ""}`,
        name: nameOf(movement, equipment, unilateral),
        group: MUSCLE_PRIMARY_GROUP[movement.primary[0]],
        primary: [...movement.primary],
        secondary: [...new Set(movement.secondary)],
        equipment,
        tracking: trackingOf(movement, equipment),
        custom: false,
      };
    }),
  );
}

/**
 * Where a name is shared by a bodyweight exercise and an equipped one, only the
 * equipped one is kept: it is the more specific description of the same thing.
 */
function dropRedundantBodyweight(exercises: Exercise[]): Exercise[] {
  const equipped = new Set(
    exercises.filter((e) => e.equipment !== "bodyweight").map((e) => e.name),
  );
  return exercises.filter((e) => e.equipment !== "bodyweight" || !equipped.has(e.name));
}

/** Expand movements into the exercises a user can pick. */
export function compose(movements: readonly Movement[]): Exercise[] {
  return dropRedundantBodyweight(movements.flatMap(variantsOf));
}
