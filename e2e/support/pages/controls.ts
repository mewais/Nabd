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
  // Each button is named for what it steps: "Decrease reps", "Increase interval".
  const button = stepper.getByRole("button", { name: new RegExp(`^${direction} `, "i") });
  for (let pressed = 0; pressed < times; pressed++) await button.click();
}

/** The controls of `scope` — buttons, fields, options — that overlap another one, as "A ✕ B". */
export function overlappingControls(scope: Locator): Promise<string[]> {
  return scope.evaluate((root) => {
    const controls = [...root.querySelectorAll("button, input, textarea, select")];
    const named = controls.map((control) => ({
      name: control.getAttribute("aria-label") ?? control.textContent?.trim() ?? control.tagName,
      box: control.getBoundingClientRect(),
    }));
    const overlaps: string[] = [];
    named.forEach((a, i) => {
      for (const b of named.slice(i + 1)) {
        const width = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
        const height = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
        if (width > 0.5 && height > 0.5) overlaps.push(`${a.name} ✕ ${b.name}`);
      }
    });
    return overlaps;
  });
}
