import type { Locator, Page } from "@playwright/test";
import { statTile } from "./controls";
import { ScreenObject } from "./region";

export type QueueAction = "Start" | "More" | "Skip" | "Restore" | "Remove";

/** The Today screen: the headline card, the day's queue and the day's figures. */
export class Today extends ScreenObject {
  readonly startSet: Locator;
  readonly logSomethingElse: Locator;

  constructor(page: Page) {
    super(page);
    this.startSet = this.screen.getByRole("button", { name: "Start set" });
    this.logSomethingElse = this.screen.getByRole("button", { name: "Log something else" });
  }

  /** An exercise's line in the queue: marker, name, "1/3 sets" badge and its buttons. */
  row(exercise: string): Locator {
    return this.screen
      .getByRole("region", { name: "Today's rhythm" })
      .getByRole("listitem", { name: exercise, exact: true });
  }

  /** A button of an exercise's line, named for what it does to which exercise: "Skip Push-Up". */
  rowButton(exercise: string, action: QueueAction): Locator {
    return this.row(exercise).getByRole("button", { name: `${action} ${exercise}`, exact: true });
  }

  /** "Streak", "This week" or "Lifted today". */
  stat(label: string): Locator {
    return statTile(this.screen, label);
  }
}
