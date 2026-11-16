import type { Locator, Page } from "@playwright/test";
import { DialogObject } from "./region";

/** The Settings dialog: one named row per setting. */
export class Settings extends DialogObject {
  /** The outcome of the last import or export. */
  readonly notice: Locator;

  constructor(page: Page) {
    super(page, page.getByRole("dialog", { name: "Settings" }));
    this.notice = this.dialog.getByRole("status");
  }

  /** A setting by its title ("Interval", "Weight unit"…): its text holds the value, its buttons change it. */
  row(title: string): Locator {
    return this.dialog.getByRole("group", { name: title, exact: true });
  }

  /** One of the chips of a setting that takes several: "Dumbbells" of "My equipment", "Sat" of "Working days". */
  option(title: string, name: string): Locator {
    return this.row(title).getByRole("button", { name, exact: true });
  }

  /** The choice of a setting that takes one: "lb" of "Weight unit", "Light" of "Theme". */
  choice(title: string, name: string): Locator {
    return this.row(title).getByRole("radio", { name, exact: true });
  }

  async exportData(): Promise<void> {
    await this.button("Export data").click();
  }

  /** Choose a file holding `text` to import; a valid one then has to be confirmed. */
  async importData(text: string): Promise<void> {
    const chooser = this.page.waitForEvent("filechooser");
    await this.button("Import data").click();
    const file = {
      name: "nabd-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    };
    await (await chooser).setFiles(file);
  }

  async close(): Promise<void> {
    await this.button("Close").click();
  }
}
