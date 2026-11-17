// What every page object has in common: the part of the page it stands for,
// and its buttons, found the way a person finds them — by name.

import type { Locator, Page } from "@playwright/test";

export abstract class PageRegion {
  constructor(
    protected readonly page: Page,
    private readonly scope: Locator,
  ) {}

  /** A button of this part of the page, by its exact name. */
  button(name: string): Locator {
    return this.scope.getByRole("button", { name, exact: true });
  }
}

/** A screen: whatever the app shows as its main content. */
export abstract class ScreenObject extends PageRegion {
  readonly screen: Locator;

  constructor(page: Page) {
    const screen = page.getByRole("main");
    super(page, screen);
    this.screen = screen;
  }
}

/** A dialog over the screen. */
export abstract class DialogObject extends PageRegion {
  constructor(
    page: Page,
    readonly dialog: Locator,
  ) {
    super(page, dialog);
  }
}
