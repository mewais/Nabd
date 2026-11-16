import type { Locator, Page } from "@playwright/test";
import { DialogObject } from "./region";

/** What to type into the set form before logging; a field left out keeps what the form shows. */
export interface SetEntry {
  reps?: number;
  weight?: number;
}

/** The set logger ("This break"): today's exercises on the left, one set at a time on the right. */
export class Logger extends DialogObject {
  /** The exercise the form is on. */
  readonly exercise: Locator;
  /** Reps, or seconds for a timed exercise. */
  readonly reps: Locator;
  /** The load, in the display unit, and the − / + stepper around it. */
  readonly weight: Locator;
  readonly weightStepper: Locator;
  /** The coach's targets, each a button that puts it in the form: ["9 × 25 lb", "8 × 27.5 lb"]. */
  readonly suggestions: Locator;
  /** "Rest 2:00" while resting. */
  readonly rest: Locator;
  /** This exercise's sets logged today, one list item each. */
  readonly loggedSets: Locator;

  constructor(page: Page) {
    super(page, page.getByRole("dialog", { name: "This break" }));
    this.exercise = this.dialog.getByRole("heading", { level: 3 });
    this.reps = this.dialog.getByRole("spinbutton", { name: /^(Reps|Sec)$/ });
    this.weightStepper = this.dialog
      .getByRole("group")
      .filter({ has: page.getByRole("spinbutton", { name: /\((kg|lb)\)$/ }) });
    this.weight = this.weightStepper.getByRole("spinbutton");
    this.suggestions = this.dialog.getByTitle("Use this");
    this.rest = this.dialog.getByRole("timer");
    this.loggedSets = this.dialog
      .getByRole("region", { name: "Logged today" })
      .getByRole("listitem");
  }

  /** An exercise in the left-hand list; its text ends with its progress, "1/3". */
  listRow(exercise: string): Locator {
    return this.dialog
      .getByRole("navigation", { name: "Today's exercises" })
      .getByRole("button")
      .filter({ hasText: exercise });
  }

  /** Log one set of the exercise the form is on. */
  async log(entry: SetEntry = {}): Promise<void> {
    if (entry.reps !== undefined) await this.reps.fill(String(entry.reps));
    if (entry.weight !== undefined) await this.weight.fill(String(entry.weight));
    await this.button("Log this set").click();
  }

  async done(): Promise<void> {
    await this.button("Done").click();
  }
}
