import type { Locator, Page } from "@playwright/test";

/** The question asked before something that cannot be undone: "Delete Push?", "Replace your data?". */
export class Confirm {
  readonly dialog: Locator;

  constructor(page: Page) {
    this.dialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("button", { name: "Cancel", exact: true }) });
  }

  /** Say yes, on the button that names what will happen: "Delete day", "Import". */
  async accept(label: string): Promise<void> {
    await this.dialog.getByRole("button", { name: label, exact: true }).click();
  }

  async cancel(): Promise<void> {
    await this.dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  }
}
