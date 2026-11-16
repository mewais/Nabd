// How the specs find and work the design system's controls.

import type { Locator } from "@playwright/test";

/** A headline figure ("Streak 3 days"), found by its label inside `scope`. */
export function statTile(scope: Locator, label: string): Locator {
  return scope.getByRole("region", { name: label, exact: true });
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
