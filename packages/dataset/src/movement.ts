import type { Equipment, MuscleKey, TrackingType } from "@nabd/domain";

type Laterality = "bilateral" | "unilateral";

/**
 * One way of moving, independent of what it is loaded with. The catalog lists
 * movements; {@link compose} turns each into one exercise per equipment and
 * laterality it can be done with.
 */
export interface Movement {
  /** Base slug, e.g. "bench_press". */
  id: string;
  /** Display name, e.g. "Bench Press". */
  name: string;
  /** Prime movers only; the first decides the exercise's group. */
  primary: [MuscleKey, ...MuscleKey[]];
  /** Assisting muscles only. */
  secondary: MuscleKey[];
  equipment: Equipment[];
  /** "unilateral" only where a one-sided version is a real exercise. */
  laterality: Laterality[];
  /** How sets are tracked, when it is not the default for the equipment. */
  tracking?: TrackingType;
  /**
   * Display names that replace the composed one: by equipment, or `uni` for
   * every one-sided variant, e.g. { bodyweight: "Push-Up", uni: "Single-Arm Push-Up" }.
   */
  nameOverride?: Partial<Record<Equipment | "uni", string>>;
}
