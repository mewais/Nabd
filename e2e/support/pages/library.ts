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

  /** A chip of the muscle-group filter: "All", "Chest", "Back"… */
  group(name: string): Locator {
    return this.dialog.getByRole("group", { name: "Muscle group" }).getByRole("button", { name });
  }

  /** The row that adds `exercise`. */
  row(exercise: string): Locator {
    return this.dialog.getByRole("button", { name: `Add ${exercise}`, exact: true });
  }

  /** Every row on show. */
  get rows(): Locator {
    return this.dialog.getByRole("button", { name: /^Add / });
  }

  /** Find `exercise` by typing `text`, and pick it. */
  async add(exercise: string, text: string = exercise): Promise<void> {
    await this.search.fill(text);
    await this.row(exercise).click();
  }

  async close(): Promise<void> {
    await this.dialog.getByRole("button", { name: "Close", exact: true }).click();
  }
}
