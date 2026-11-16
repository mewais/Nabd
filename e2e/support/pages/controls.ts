// The design system's controls that have no role of their own to be found by.

import type { Locator } from "@playwright/test";

/** A headline figure ("Streak 3 days"), found by its label inside `scope`. */
export function statTile(scope: Locator, label: string): Locator {
  return scope.getByText(label, { exact: true }).locator("xpath=..");
}

/** Press a stepper's − or + `times` times; `stepper` is the group around its two buttons. */
export async function step(
  stepper: Locator,
  direction: "increase" | "decrease",
  times = 1,
): Promise<void> {
  const button = stepper.getByRole("button", { name: direction });
  for (let pressed = 0; pressed < times; pressed++) await button.click();
}
