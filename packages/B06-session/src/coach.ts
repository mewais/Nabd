import type { LoggedSet } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import { ExerciseHistory, ProgressionAdvisor } from "@nabd/progression";
import type { Advice, Performance } from "@nabd/progression";

/**
 * Answers, for any exercise in today's queue, "what should I aim for?" and
 * "what do I pre-fill the form with?".
 */
export class Coach {
  private readonly histories = new Map<string, ExerciseHistory>();

  constructor(
    private readonly history: readonly LoggedSet[],
    private readonly advisor: ProgressionAdvisor,
    /** Today's local date key. */
    private readonly today: string,
  ) {}

  private historyOf(exId: string): ExerciseHistory {
    let history = this.histories.get(exId);
    if (!history) {
      history = new ExerciseHistory(this.history, exId);
      this.histories.set(exId, history);
    }
    return history;
  }

  /** The progression advice for the item's next set; none for a warm-up. */
  adviceFor(item: PlanItem): Advice | null {
    if (item.nextSet?.type === "warmup") return null;
    return this.advisor.advise(
      item.exercise.tracking,
      item.prescription,
      item.workingSetsDone,
      this.historyOf(item.exercise.id),
      this.today,
    );
  }

  /**
   * What the log form starts with: what the user actually did last (their most
   * recent set, today included), or a starting point when there is no history.
   * Advice is only ever a suggestion the user chooses to apply.
   */
  startFor(item: PlanItem): Performance {
    const history = this.historyOf(item.exercise.id);
    return (
      history.latest() ?? this.advisor.startingPoint(item.exercise.tracking, item.nextSet).primary
    );
  }
}
