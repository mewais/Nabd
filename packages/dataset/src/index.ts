// @nabd/dataset — the exercise library: a catalog of movements, composed into
// one exercise per equipment and laterality, plus the user's custom exercises.

export { ExerciseLibrary } from "./library";
// The composition rules, public so they can be exercised on small inputs.
export { compose } from "./compose";
export { currentExerciseId } from "./retired";
export type { Movement } from "./movement";
