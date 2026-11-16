// What the advisor suites share: advice for a set of an exercise, after a history.

import { dateKey } from "@nabd/domain";
import type { Exercise, LoggedSet } from "@nabd/domain";
import { ExerciseHistory, ProgressionAdvisor } from "@nabd/progression";
import { nov, prescription, workingSets } from "../support/builders";

const TODAY = dateKey(nov(16));
/** Three working sets of 8–12. */
const range8to12 = prescription(workingSets(3));

interface AdviseOptions {
  setIndex?: number;
  stepKg?: number;
  plan?: typeof range8to12 | null;
  /** The user's body weight in kg; unknown unless given. */
  bodyWeight?: number | null;
  /** The session the set belongs to; today's unless given. */
  session?: string;
}

/** The advice for set `setIndex` (the first) of `ex`, after `sets`. */
export function advise(ex: Exercise, sets: LoggedSet[], options: AdviseOptions = {}) {
  const { setIndex = 0, stepKg = 2.5, plan = range8to12, bodyWeight = null } = options;
  return new ProgressionAdvisor(stepKg, bodyWeight).advise({
    tracking: ex.tracking,
    prescription: plan,
    setIndex,
    history: new ExerciseHistory(sets, ex.id),
    session: options.session ?? TODAY,
  });
}
