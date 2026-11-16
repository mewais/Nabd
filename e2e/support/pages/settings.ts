import type { Locator, Page } from "@playwright/test";

/** The Settings dialog: one named row per setting. */
export class Settings {
  readonly dialog: Locator;
  /** The outcome of the last import or export. */
  readonly notice: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole("dialog", { name: "Settings" });
    this.notice = this.dialog.getByRole("status");
  }

  /** A setting by its title ("Interval", "Weight unit"…): its text holds the value, its buttons change it. */
  row(title: string): Locator {
    return this.dialog.getByRole("group", { name: title, exact: true });
  }

  /** A choice within a setting: "lb" of "Weight unit", "Dumbbells" of "My equipment". */
  option(title: string, name: string): Locator {
    return this.row(title).getByRole("button", { name, exact: true });
  }

  async exportData(): Promise<void> {
    await this.dialog.getByRole("button", { name: "Export data" }).click();
  }

  /** Choose a file holding `text` to import; a valid one then has to be confirmed. */
  async importData(text: string): Promise<void> {
    const chooser = this.page.waitForEvent("filechooser");
    await this.dialog.getByRole("button", { name: "Import data" }).click();
    const file = {
      name: "nabd-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    };
    await (await chooser).setFiles(file);
  }

  async close(): Promise<void> {
    await this.dialog.getByRole("button", { name: "Close", exact: true }).click();
  }
}
