// Shared helpers for the design-system suites.

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

/** Render one primitive and return the element it produced. */
export function renderRoot(ui: ReactElement): HTMLElement {
  const { container } = render(ui);
  return container.firstElementChild as HTMLElement;
}

/** Click the button with this accessible name. */
export function click(name: string | RegExp): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Press a key with focus somewhere on the page. */
export function press(key: string): void {
  fireEvent.keyDown(document.body, { key });
}
