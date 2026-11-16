import type { Locator, Page } from "@playwright/test";
import { statTile } from "./controls";

/** The Progress screen, and the full-history chart a progression row opens. */
export class Progress {
  readonly screen: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByRole("main");
  }

  /** "Current streak", "Completion this wk", "Sets this week" or "Active days 30d". */
  kpi(label: string): Locator {
    return statTile(this.screen, label);
  }

  /** "Calendar" or "Weekly". */
  tab(name: string): Locator {
    return this.screen
      .getByRole("group", { name: "Consistency view" })
      .getByRole("button", { name });
  }

  /** The bars of a chart: "Sets per week", "Completion by day", "Sets by hour". */
  bars(chart: string): Locator {
    return this.screen.getByRole("list", { name: chart }).getByRole("listitem");
  }

  /** A line of "What prompts a set": "Idle detected", "Timer" or "Manual", with its share. */
  trigger(label: string): Locator {
    return this.screen.getByText(label, { exact: true }).locator("xpath=..");
  }

  /** An exercise's line in "Progression & records". */
  progressionRow(exercise: string): Locator {
    return this.screen.getByRole("button").filter({ hasText: exercise });
  }

  /** The full-history dialog of `exercise`. */
  history(exercise: string): Locator {
    return this.page.getByRole("dialog", { name: exercise });
  }
}
