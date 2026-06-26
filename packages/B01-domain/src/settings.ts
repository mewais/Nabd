import { z } from "zod";

/** The two real themes (translucency is a separate modifier, not a theme). */
export const ThemeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

/** Preview wallpapers (used behind the glass material). */
export const WallpaperSchema = z.enum([
  "aurora",
  "dusk",
  "slate",
  "mesh",
  "sand",
  "frost",
  "mixed",
]);
export type Wallpaper = z.infer<typeof WallpaperSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  /** Translucency on/off (the "Glass" toggle). When true the matching glass material is used. */
  glass: z.boolean(),
  /** Glass tint strength (0.1–1.0). */
  opacity: z.number().min(0.1).max(1),
  wallpaper: WallpaperSchema,
  openAtStartup: z.boolean(),
  minimizedByDefault: z.boolean(),
  /** Minutes between sets (timer length). */
  interval: z.number().int().min(5).max(180),
  /** Seconds of idle before a nudge. */
  idleNudge: z.number().int().min(5).max(600),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  glass: false,
  opacity: 0.7,
  wallpaper: "aurora",
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  idleNudge: 30,
};

/** Per-theme glass opacity bounds (floors relaxed — user controls legibility). */
export const GLASS_OPACITY: Record<Theme, { floor: number; max: number }> = {
  light: { floor: 0.1, max: 1 },
  dark: { floor: 0.1, max: 1 },
};

/** The material key for a theme + glass flag. */
export type Material = "light" | "dark" | "lightGlass" | "darkGlass";
export function materialKey(theme: Theme, glass: boolean): Material {
  return glass ? ((theme + "Glass") as Material) : theme;
}

/** Scheduling + behavior defaults. */
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
