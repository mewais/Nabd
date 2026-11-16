import type { TrackingType } from "@nabd/domain";
import { isBodyweightLoaded } from "@nabd/domain";
import type { Advice, Progression, RepGoal } from "./advice";
import type { ExerciseHistory, Performance } from "./history";
import { MovedLoad, loadFor } from "./intensity";
import type { IntensityWaiting, PrescribedIntensity } from "./intensity";
import type { LoadSteps } from "./load-steps";

/** What steering a set's advice by its prescribed intensity looks at. */
interface SteeringRequest {
  tracking: TrackingType;
  /** The intensity the set prescribes; null when none does. */
  asked: PrescribedIntensity | null;
  goal: RepGoal;
  history: ExerciseHistory;
  /** The set's session: only earlier ones are estimated from. */
  session: string;
}

/**
 * Brings a set's prescribed RPE or %1RM into double progression's advice.
 * With an estimated one-rep max (from the latest session before the set's)
 * its load becomes the primary target, for the bottom of the rep goal, and
 * double progression's own target the alternative (the alternative it already
 * had when the two agree). Without one the advice stays as it is, and says
 * which intensity it is waiting to use, and for what. A hold, or an exercise
 * with no load, ignores the intensity.
 */
export class IntensitySteering {
  constructor(
    private readonly steps: LoadSteps,
    /** The user's body weight in kg; null when they have not said. */
    private readonly bodyWeightKg: number | null,
  ) {}

  steer(plain: Progression, request: SteeringRequest): Advice {
    const { tracking, asked, goal, history, session } = request;
    const moved = new MovedLoad(tracking, this.bodyWeightKg);
    if (asked === null || !moved.isLift) return { ...plain, intensity: null };
    const max = moved.isMeasurable
      ? history.estimateBefore(session, (set) => moved.of(set))
      : undefined;
    if (max === undefined) {
      return { ...plain, intensity: { ...asked, ...this.waiting(moved, history, session) } };
    }
    const weight = this.intensityLoad(tracking, moved.loadFor(loadFor(asked, max, goal.lo)));
    if (weight === null) return { ...plain, intensity: null };
    const primary: Performance = { reps: goal.lo, weight };
    const agrees = primary.weight === plain.primary.weight && primary.reps === plain.primary.reps;
    const alternative = agrees ? plain.alternative : plain.primary;
    return { ...plain, primary, alternative, intensity: { ...asked, max } };
  }

  /** Why an intensity has no one-rep max to work from yet. */
  private waiting(moved: MovedLoad, history: ExerciseHistory, session: string): IntensityWaiting {
    if (!moved.isMeasurable) return { max: null, waitingFor: "bodyWeight" };
    const hasHistory = history.sessionsBefore(session, 1).length > 0;
    return { max: null, waitingFor: hasHistory ? "load" : "history" };
  }

  /**
   * The load an intensity asks for, on the load step and within bounds. For a
   * bodyweight exercise, whose plain form is no load at all, a load that
   * rounds to nothing is no load worth suggesting: null, and the reps-first
   * advice stands.
   */
  private intensityLoad(tracking: TrackingType, kg: number): number | null {
    const load = this.steps.onStep(kg);
    return load <= 0 && isBodyweightLoaded(tracking) ? null : this.steps.bounded(tracking, load);
  }
}
