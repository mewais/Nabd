import type { Movement } from "../movement";
import { ARMS } from "./arms";
import { BACK } from "./back";
import { CHEST } from "./chest";
import { CORE } from "./core";
import { HIPS, HIP_FLEXORS } from "./hips";
import { LOWER_LEGS } from "./lower-legs";
import { SHOULDERS } from "./shoulders";
import { THIGHS } from "./thighs";

/** Every built-in movement, in the order the library lists them. */
export const MOVEMENTS: readonly Movement[] = [
  ...CHEST,
  ...BACK,
  ...SHOULDERS,
  ...ARMS,
  ...THIGHS,
  ...HIPS,
  ...LOWER_LEGS,
  ...HIP_FLEXORS,
  ...CORE,
];
