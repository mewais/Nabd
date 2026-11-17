// How the capture photographs a state: where the pictures go, in which
// themes, and the app on its sample data.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { App } from "../support/app";
import { MONDAY, at, dayAfter } from "../support/time";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/** Where `pnpm visual` saves every state (OUT=<dir> for elsewhere). */
const SHOTS = process.env.OUT ?? here("./shots/");
/** Where `pnpm screenshots` saves the pictures the README shows (OUT=<dir> for elsewhere). */
export const README_SHOTS = process.env.OUT ?? here("../../docs/screenshots/");

export const THEMES = ["dark", "light"] as const;
export type ThemeName = (typeof THEMES)[number];

/** Saves `<dir>/<name>.png` once the clock has moved past every transition. */
export function shooterInto(page: Page, dir: string): (name: string) => Promise<void> {
  mkdirSync(dir, { recursive: true });
  return async (name: string): Promise<void> => {
    await page.clock.runFor(700);
    await page.screenshot({ path: join(dir, `${name}.png`), animations: "disabled" });
  };
}

/** Saves `<theme>-<name>.png` into `pnpm visual`'s folder. */
export function shooter(page: Page, theme: ThemeName): (name: string) => Promise<void> {
  const shoot = shooterInto(page, SHOTS);
  return (name: string) => shoot(`${theme}-${name}`);
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
