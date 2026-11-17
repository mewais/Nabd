// How `pnpm visual` photographs a state: where the pictures go, in which
// themes, and the app on its sample data.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { App } from "../support/app";
import { MONDAY, at, dayAfter } from "../support/time";

const OUT = process.env.OUT ?? fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

export const THEMES = ["dark", "light"] as const;
type ThemeName = (typeof THEMES)[number];

/** Saves `<theme>-<name>.png` once the clock has moved past every transition. */
export function shooter(page: Page, theme: ThemeName): (name: string) => Promise<void> {
  return async (name: string): Promise<void> => {
    await page.clock.runFor(700);
    await page.screenshot({ path: join(OUT, `${theme}-${name}.png`), animations: "disabled" });
  };
}
export const settingsOf = (theme: ThemeName): typeof DEFAULT_SETTINGS => ({
  ...DEFAULT_SETTINGS,
  theme,
});

/** The app on its sample plan and history (no snapshot handed over), Wednesday at 10:30. */
export async function launchDemo(app: App, page: Page, theme: ThemeName): Promise<void> {
  const when = at("10:30", dayAfter(MONDAY, 2));
  await page.clock.install({ time: when });
  await page.clock.pauseAt(when);
  await page.goto("/");
  if (theme === "light") await app.shell.theme("Light").click();
}
