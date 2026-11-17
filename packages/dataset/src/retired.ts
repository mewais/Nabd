import { ExerciseLibrary } from "./library";

const UNILATERAL_SUFFIX = "__uni";

/**
 * The catalog id that stands for `exId` today. The catalog once listed
 * single-arm variants of two-handed equipment (a one-arm barbell row); they
 * were dropped, and the two-handed exercise stands in for each. Any other id —
 * current, custom or unknown — is returned as it is.
 */
export function currentExerciseId(exId: string): string {
  const { catalog } = ExerciseLibrary;
  if (!exId.endsWith(UNILATERAL_SUFFIX) || catalog.byId(exId)) return exId;
  const twoHanded = exId.slice(0, -UNILATERAL_SUFFIX.length);
  return catalog.byId(twoHanded) ? twoHanded : exId;
}
