import { z } from "zod";

export const ThemeSchema = z.enum(["translucent", "light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const WallpaperSchema = z.enum(["aurora", "dusk", "mesh", "slate"]);
export type Wallpaper = z.infer<typeof WallpaperSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  /** Translucent tint strength, 0.2–0.9. */
  opacity: z.number().min(0.2).max(0.9),
  wallpaper: WallpaperSchema,
  openAtStartup: z.boolean(),
  minimizedByDefault: z.boolean(),
  /** Minutes between sets (timer length). */
  interval: z.number().int().min(20).max(90),
  /** Seconds of idle before a nudge. */
  idleNudge: z.number().int().min(10).max(180),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: "translucent",
  opacity: 0.55,
  wallpaper: "aurora",
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  idleNudge: 30,
};

/** Scheduling defaults. */
export const DEFAULTS = {
  /** First slot of the workday: 09:30 as minutes from midnight. */
  startMin: 9 * 60 + 30,
  intervalMin: 50,
  idleNudgeSec: 30,
  /** Coverage bump applied per logged set. */
  coveragePerSet: 4,
  /** Snooze length in seconds. */
  snoozeSec: 5 * 60,
} as const;
