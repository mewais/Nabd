import type { LoggedSet } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import { ExerciseHistory } from "@nabd/progression";
import type { Advice, Performance, ProgressionAdvisor } from "@nabd/progression";

/**
 * Answers, for any exercise in today's queue, "what should I aim for?" and
 * "what do I pre-fill the form with?".
 */
export class Coach {
  private readonly histories = new Map<string, ExerciseHistory>();

  constructor(
    private readonly history: readonly LoggedSet[],
    private readonly advisor: ProgressionAdvisor,
    /** The session today's sets belong to (see `TodayPlan.session`). */
    private readonly session: string,
  ) {}

  private historyOf(exId: string): ExerciseHistory {
    let history = this.histories.get(exId);
    if (!history) {
      history = new ExerciseHistory(this.history, exId);
      this.histories.set(exId, history);
    }
    return history;
  }

  private advise(item: PlanItem): Advice {
    return this.advisor.advise({
      tracking: item.exercise.tracking,
      prescription: item.prescription,
      setIndex: item.workingSetsDone,
      history: this.historyOf(item.exercise.id),
      session: this.session,
    });
  }

  /** The progression advice for the item's next set; none for a warm-up. */
  adviceFor(item: PlanItem): Advice | null {
    return item.nextSet?.type === "warmup" ? null : this.advise(item);
  }

  /**
   * What the log form starts with: what the user actually did for the kind of
   * set that comes next (warm-up, working, drop). Once the exercise has such a
   * set in this session (today, or on the earlier days of a floating day that
   * came back), that is it. Before that, a warm-up starts from the last warm-up
   * logged — warm-ups stay out of progression, but are remembered — or, with
   * none on record, from half the last working load (see
   * ProgressionAdvisor.warmupFrom); any other set starts from the very set the
   * advice compares against, so the form and "Last time" always agree and
   * applying the advice is a visible step up from the form. With nothing to go
   * on it is a starting point for the set.
   */
  startFor(item: PlanItem): Performance {
    const history = this.historyOf(item.exercise.id);
    const type = item.nextSet?.type ?? "working";
    return (
      history.latest(type, this.session) ??
      (type === "warmup" ? this.warmupStart(item, history) : this.advise(item).basis) ??
      this.advisor.startingPoint(item.exercise.tracking, item.nextSet).primary
    );
  }

  /** Where a warm-up of `item` starts, from what is on record; undefined with nothing to go on. */
  private warmupStart(item: PlanItem, history: ExerciseHistory): Performance | undefined {
    const working = history.latest("working");
    return (
      history.latest("warmup") ??
      (working && this.advisor.warmupFrom(item.exercise.tracking, working, item.nextSet))
    );
  }
}
