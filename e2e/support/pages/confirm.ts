import type { Page } from "@playwright/test";
import { DialogObject } from "./region";

/** The question asked before something that cannot be undone: "Delete Push?", "Replace your data?". */
export class Confirm extends DialogObject {
  constructor(page: Page) {
    super(
      page,
      page
        .getByRole("dialog")
        .filter({ has: page.getByRole("button", { name: "Cancel", exact: true }) }),
    );
  }

  /** Say yes, on the button that names what will happen: "Delete day", "Import". */
  async accept(label: string): Promise<void> {
    await this.button(label).click();
  }

  async cancel(): Promise<void> {
    await this.button("Cancel").click();
  }
}
