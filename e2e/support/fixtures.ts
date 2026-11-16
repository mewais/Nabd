import { test as base, expect } from "@playwright/test";
import { App } from "./app";

/**
 * `app` is the application under test; a spec starts it with `app.launch(...)`.
 * An exception thrown inside the page fails the test that caused it.
 */
export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await use(new App(page));
    expect(pageErrors, "exceptions thrown inside the page").toEqual([]);
  },
});

export { expect };
