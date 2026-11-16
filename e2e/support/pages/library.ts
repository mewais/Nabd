import type { Locator, Page } from "@playwright/test";

/** The exercise library, whatever it was opened for. */
export class Library {
  readonly dialog: Locator;
  readonly search: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole("dialog", {
      name: /^(Add Exercise|Add to Pool|Log Something Else)/,
    });
    this.search = this.dialog.getByRole("searchbox", { name: "Search exercises" });
  }

  /** A button of the dialog by its exact name: "Close", "Create custom exercise", "Delete custom exercise". */
  button(name: string): Locator {
    return this.dialog.getByRole("button", { name, exact: true });
  }

  /** A chip of the muscle-group filter: "All", "Chest", "Back"… */
  group(name: string): Locator {
    return this.dialog.getByRole("group", { name: "Muscle group" }).getByRole("button", { name });
  }

  /** The row that adds `exercise`. */
  row(exercise: string): Locator {
    return this.dialog.getByRole("button", { name: `Add ${exercise}`, exact: true });
  }

  /** Find `exercise` by typing `text`, and pick it. */
  async add(exercise: string, text: string = exercise): Promise<void> {
    await this.search.fill(text);
    await this.row(exercise).click();
  }

  /** Create a custom exercise counted in reps alone, which then appears in the list. */
  async createCustom(name: string, primaryMuscle: string): Promise<void> {
    await this.button("Create custom exercise").click();
    await this.dialog.getByRole("textbox", { name: "Exercise name" }).fill(name);
    const muscles = this.dialog.getByRole("region", { name: "Primary muscles" });
    await muscles.getByRole("button", { name: primaryMuscle }).click();
    await this.button("How to track it").click();
    await this.dialog.getByRole("option", { name: "Reps only" }).click();
    await this.button("Create").click();
  }

  async close(): Promise<void> {
    await this.button("Close").click();
  }
}
