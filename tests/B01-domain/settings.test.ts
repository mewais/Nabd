import { describe, it, expect } from "vitest";
import { SettingsSchema, DEFAULT_SETTINGS, DEFAULTS, ThemeSchema, WallpaperSchema } from "@nabd/domain";

describe("settings.ts", () => {
  it("DEFAULT_SETTINGS parses against SettingsSchema", () => {
    const result = SettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
  });

  it("DEFAULT_SETTINGS has expected values", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("translucent");
    expect(DEFAULT_SETTINGS.opacity).toBe(0.55);
    expect(DEFAULT_SETTINGS.wallpaper).toBe("aurora");
    expect(DEFAULT_SETTINGS.openAtStartup).toBe(true);
    expect(DEFAULT_SETTINGS.minimizedByDefault).toBe(false);
    expect(DEFAULT_SETTINGS.interval).toBe(50);
    expect(DEFAULT_SETTINGS.idleNudge).toBe(30);
  });

  it("opacity below 0.2 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.1 });
    expect(result.success).toBe(false);
  });

  it("opacity above 0.9 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.95 });
    expect(result.success).toBe(false);
  });

  it("opacity at boundary 0.2 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.2 });
    expect(result.success).toBe(true);
  });

  it("opacity at boundary 0.9 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.9 });
    expect(result.success).toBe(true);
  });

  it("interval below 20 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, interval: 19 });
    expect(result.success).toBe(false);
  });

  it("interval above 90 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, interval: 91 });
    expect(result.success).toBe(false);
  });

  it("interval at boundary 20 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, interval: 20 });
    expect(result.success).toBe(true);
  });

  it("interval at boundary 90 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, interval: 90 });
    expect(result.success).toBe(true);
  });

  it("interval non-integer is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, interval: 45.5 });
    expect(result.success).toBe(false);
  });

  it("idleNudge below 10 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, idleNudge: 9 });
    expect(result.success).toBe(false);
  });

  it("idleNudge above 180 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, idleNudge: 181 });
    expect(result.success).toBe(false);
  });

  it("idleNudge at boundary 10 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, idleNudge: 10 });
    expect(result.success).toBe(true);
  });

  it("idleNudge at boundary 180 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, idleNudge: 180 });
    expect(result.success).toBe(true);
  });

  it("idleNudge non-integer is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, idleNudge: 30.5 });
    expect(result.success).toBe(false);
  });

  it("DEFAULTS.startMin is 570 (09:30 as minutes from midnight)", () => {
    expect(DEFAULTS.startMin).toBe(9 * 60 + 30);
  });

  it("DEFAULTS.intervalMin is present", () => {
    expect(DEFAULTS.intervalMin).toBeDefined();
    expect(typeof DEFAULTS.intervalMin).toBe("number");
  });

  it("DEFAULTS.idleNudgeSec is present", () => {
    expect(DEFAULTS.idleNudgeSec).toBeDefined();
    expect(typeof DEFAULTS.idleNudgeSec).toBe("number");
  });

  it("DEFAULTS.coveragePerSet is present", () => {
    expect(DEFAULTS.coveragePerSet).toBeDefined();
    expect(typeof DEFAULTS.coveragePerSet).toBe("number");
  });

  it("DEFAULTS.snoozeSec is present", () => {
    expect(DEFAULTS.snoozeSec).toBeDefined();
    expect(typeof DEFAULTS.snoozeSec).toBe("number");
  });

  describe("ThemeSchema", () => {
    it("accepts translucent", () =>
      expect(ThemeSchema.safeParse("translucent").success).toBe(true));
    it("accepts light", () => expect(ThemeSchema.safeParse("light").success).toBe(true));
    it("accepts dark", () => expect(ThemeSchema.safeParse("dark").success).toBe(true));
    it("rejects invalid", () => expect(ThemeSchema.safeParse("midnight").success).toBe(false));
  });

  describe("WallpaperSchema", () => {
    it("accepts aurora", () => expect(WallpaperSchema.safeParse("aurora").success).toBe(true));
    it("accepts dusk", () => expect(WallpaperSchema.safeParse("dusk").success).toBe(true));
    it("accepts mesh", () => expect(WallpaperSchema.safeParse("mesh").success).toBe(true));
    it("accepts slate", () => expect(WallpaperSchema.safeParse("slate").success).toBe(true));
    it("rejects invalid", () => expect(WallpaperSchema.safeParse("forest").success).toBe(false));
  });
});
