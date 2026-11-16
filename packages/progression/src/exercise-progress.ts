import type { ExerciseLookup, LoggedSet, WeightUnit } from "@nabd/domain";
import { exerciseTrends } from "./trend";
import type { ExerciseTrend } from "./trend";

/** Every exercise that has history: how it has trended, and what to call it. */
export class ExerciseProgress {
  /** One trend per exercise, in order of first appearance. */
  readonly trends: readonly ExerciseTrend[];
  private readonly loggedNames: ReadonlyMap<string, string>;

  constructor(
    history: readonly LoggedSet[],
    private readonly lookup: ExerciseLookup,
    unit: WeightUnit,
  ) {
    this.trends = exerciseTrends(history, unit, (exId) => lookup(exId)?.tracking);
    this.loggedNames = new Map(history.map((set) => [set.exId, set.exercise]));
  }

  trendOf(exId: string): ExerciseTrend | undefined {
    return this.trends.find((trend) => trend.exId === exId);
  }

  /** A deleted custom exercise still has history, so its logged name is the fallback. */
  nameOf(exId: string): string {
    return this.lookup(exId)?.name ?? this.loggedNames.get(exId) ?? exId;
  }
}
