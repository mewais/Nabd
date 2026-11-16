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

  private advise(item: PlanItem): Advice {
    return this.advisor.advise({
      tracking: item.exercise.tracking,
      prescription: item.prescription,
      setIndex: item.workingSetsDone,
      history: this.historyOf(item.exercise.id),
      date: this.today,
    });
  }

  /** The progression advice for the item's next set; none for a warm-up. */
  adviceFor(item: PlanItem): Advice | null {
    return item.nextSet?.type === "warmup" ? null : this.advise(item);
  }

  /**
   * What the log form starts with: what the user actually did. Once the
   * exercise has a working set today that is the previous set; before that it
   * is the very set the advice compares against, so the form and "Last time"
   * always agree and applying the advice is a visible step up from the form.
   * With no history it is a starting point for the set that comes next.
   */
  startFor(item: PlanItem): Performance {
    const previous = this.historyOf(item.exercise.id).on(this.today).at(-1);
    return (
      previous ??
      this.advise(item).basis ??
      this.advisor.startingPoint(item.exercise.tracking, item.nextSet).primary
    );
  }
}
