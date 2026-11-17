import type { Locator, Page } from "@playwright/test";
import { ScreenObject } from "./region";

/** The Plan screen: the program header, the week board and the editor of the selected day. */
export class Planner extends ScreenObject {
  readonly dayName: Locator;
  readonly addExercise: Locator;

  constructor(page: Page) {
    super(page);
    this.dayName = this.screen.getByRole("textbox", { name: "Day name" });
    this.addExercise = this.screen.getByRole("button", { name: "+ Add exercise" });
  }

  /** An option of the program header: "Fixed"/"Cycled" (Plan type), "Weekdays"/"Floating" (Schedule). */
  option(group: "Plan type" | "Schedule", name: string): Locator {
    return this.screen.getByRole("radiogroup", { name: group }).getByRole("radio", { name });
  }

  /** A day's tile on the board; pressing it opens the day in the editor. */
  dayCard(name: string): Locator {
    return this.screen
      .getByRole("group", { name: "Days" })
      .getByRole("button")
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The card of an exercise (fixed plan) or of a muscle slot (cycled plan) in the editor. */
  card(name: string): Locator {
    return this.screen.getByRole("region", { name, exact: true });
  }

  /** A button of a card: "Move earlier", "Superset ↓", "Unlink", "Remove exercise". */
  cardButton(card: string, name: string): Locator {
    return this.card(card).getByRole("button", { name, exact: true });
  }

  /** A choice of a card's prescription: "Range"/"Fixed" (Rep mode), "None"/"RPE"/"%1RM" (Load). */
  cardChoice(card: string, name: string): Locator {
    return this.card(card).getByRole("radio", { name, exact: true });
  }

  /** The exercise (or slot) cards of the editor, top to bottom. */
  cards(): Locator {
    return this.screen.getByRole("region", { name: "Day editor" }).getByRole("region");
  }

  /** A stepper of a card: "Set 1 reps", "Set 1 top of range", "Rest". */
  stepper(card: string, name: string): Locator {
    return this.card(card).getByRole("group", { name, exact: true });
  }
}
