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
  /** The nudge toast's Skip today (the top bar's nudge menu has one of its own). */
  readonly skipFromToast: Locator;
  /**
   * The top bar's one nudge control: a menu button that says where nudging
   * stands ("Pause", "Paused", "Skipped", "Nudging") and holds the pause and
   * today's choice (see {@link fromNudgeMenu}).
   */
  readonly nudgeMenu: Locator;
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
    // The innermost box holding both the toast's words and its buttons: the toast itself.
    this.skipFromToast = page
      .locator("div")
      .filter({ has: this.toast })
      .filter({ has: this.snooze })
      .last()
      .getByRole("button", { name: "Skip today", exact: true });
    this.nudgeMenu = this.topBar.locator('button[aria-haspopup="menu"]');
    this.root = page.locator("[data-theme]");
  }

  /** An entry of the open nudge menu: "Pause nudges", "Skip today", "Nudge me today"… */
  menuItem(name: string): Locator {
    return this.topBar.getByRole("menu").getByRole("menuitem", { name, exact: true });
  }

  /** Open the nudge menu and pick `item` from it, which closes it. */
  async fromNudgeMenu(item: string): Promise<void> {
    await this.nudgeMenu.click();
    await this.menuItem(item).click();
  }

  async goTo(screen: Screen): Promise<void> {
    await this.page.getByRole("navigation").getByRole("button", { name: screen }).click();
  }

  /** The top bar's theme choice: "Light" or "Dark". */
  theme(name: "Light" | "Dark"): Locator {
    return this.topBar.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name });
  }
}
