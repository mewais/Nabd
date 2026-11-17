import type { Locator, Page } from "@playwright/test";
import { PageRegion } from "./region";

type Screen = "Today" | "Plan" | "Progress";

/** The app chrome — sidebar, top bar, and the nudge toast that floats over every screen; its buttons are the top bar's. */
export class Shell extends PageRegion {
  readonly topBar: Locator;
  /** The clock and where nudging stands: "09:00 Next nudge at 09:50, sooner if you go idle". */
  readonly status: Locator;
  /** The sidebar ring; its name reads "2 of 7 sets done today". */
  readonly ring: Locator;
  /** The words of the nudge toast: title, reason, exercise and set. */
  readonly toast: Locator;
  /** The app-wide notice under the top bar: unreadable data, a failed save, settings put back. */
  readonly notice: Locator;
  readonly letsGo: Locator;
  readonly snooze: Locator;
  /** The root element, which carries the theme. */
  readonly root: Locator;

  constructor(page: Page) {
    const topBar = page
      .getByRole("banner")
      .filter({ has: page.getByRole("radiogroup", { name: "Theme" }) });
    super(page, topBar);
    this.topBar = topBar;
    this.status = this.topBar.getByRole("status");
    this.ring = page.getByRole("img", { name: /done today$/ });
    this.toast = page.getByRole("status").filter({ hasText: "Time to move" });
    this.notice = page
      .getByRole("status")
      .or(page.getByRole("alert"))
      .filter({ has: page.getByRole("button", { name: "Dismiss" }) });
    this.letsGo = page.getByRole("button", { name: "Let's go" });
    this.snooze = page.getByRole("button", { name: "Snooze", exact: true });
    this.root = page.locator("[data-theme]");
  }

  async goTo(screen: Screen): Promise<void> {
    await this.page.getByRole("navigation").getByRole("button", { name: screen }).click();
  }

  /** The top bar's theme choice: "Light" or "Dark". */
  theme(name: "Light" | "Dark"): Locator {
    return this.topBar.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name });
  }
}
