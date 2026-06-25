import { describe, it, expect } from "vitest";
import {
  SettingsSchema,
  DEFAULT_SETTINGS,
  DEFAULTS,
  ThemeSchema,
  WallpaperSchema,
  GLASS_OPACITY,
  materialKey,
} from "@nabd/domain";

describe("settings.ts", () => {
  it("DEFAULT_SETTINGS parses against SettingsSchema", () => {
    const result = SettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
  });

  it("DEFAULT_SETTINGS has expected values", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("dark");
    expect(DEFAULT_SETTINGS.glass).toBe(false);
    expect(DEFAULT_SETTINGS.opacity).toBe(0.7);
    expect(DEFAULT_SETTINGS.wallpaper).toBe("aurora");
    expect(DEFAULT_SETTINGS.openAtStartup).toBe(true);
    expect(DEFAULT_SETTINGS.minimizedByDefault).toBe(false);
    expect(DEFAULT_SETTINGS.interval).toBe(50);
    expect(DEFAULT_SETTINGS.idleNudge).toBe(30);
  });

  it("DEFAULT_SETTINGS.opacity is within [0.2, 0.92]", () => {
    expect(DEFAULT_SETTINGS.opacity).toBeGreaterThanOrEqual(0.2);
    expect(DEFAULT_SETTINGS.opacity).toBeLessThanOrEqual(0.92);
  });

  it("Settings has glass field", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, glass: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.glass).toBe(true);
    }
  });

  it("opacity below 0.2 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.1 });
    expect(result.success).toBe(false);
  });

  it("opacity above 0.92 is rejected", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.95 });
    expect(result.success).toBe(false);
  });

  it("opacity at boundary 0.2 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.2 });
    expect(result.success).toBe(true);
  });

  it("opacity at boundary 0.92 is accepted", () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, opacity: 0.92 });
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

  it("DEFAULTS.intervalMin is 50", () => {
    expect(DEFAULTS.intervalMin).toBe(50);
  });

  it("DEFAULTS.idleNudgeSec is 30", () => {
    expect(DEFAULTS.idleNudgeSec).toBe(30);
  });

  it("DEFAULTS.coveragePerSet is 4", () => {
    expect(DEFAULTS.coveragePerSet).toBe(4);
  });

  it("DEFAULTS.snoozeSec is 300 (5 minutes)", () => {
    expect(DEFAULTS.snoozeSec).toBe(300);
  });

  describe("ThemeSchema", () => {
    it("accepts light", () => expect(ThemeSchema.safeParse("light").success).toBe(true));
    it("accepts dark", () => expect(ThemeSchema.safeParse("dark").success).toBe(true));
    it("rejects translucent", () => expect(ThemeSchema.safeParse("translucent").success).toBe(false));
    it("rejects invalid", () => expect(ThemeSchema.safeParse("midnight").success).toBe(false));
  });

  describe("WallpaperSchema", () => {
    it("accepts aurora", () => expect(WallpaperSchema.safeParse("aurora").success).toBe(true));
    it("accepts dusk", () => expect(WallpaperSchema.safeParse("dusk").success).toBe(true));
    it("accepts mesh", () => expect(WallpaperSchema.safeParse("mesh").success).toBe(true));
    it("accepts slate", () => expect(WallpaperSchema.safeParse("slate").success).toBe(true));
    it("accepts sand", () => expect(WallpaperSchema.safeParse("sand").success).toBe(true));
    it("accepts frost", () => expect(WallpaperSchema.safeParse("frost").success).toBe(true));
    it("accepts mixed", () => expect(WallpaperSchema.safeParse("mixed").success).toBe(true));
    it("rejects invalid", () => expect(WallpaperSchema.safeParse("forest").success).toBe(false));
  });

  describe("GLASS_OPACITY", () => {
    it("light has floor 0.6 and max 0.92", () => {
      expect(GLASS_OPACITY.light.floor).toBe(0.6);
      expect(GLASS_OPACITY.light.max).toBe(0.92);
    });

    it("dark has floor 0.5 and max 0.92", () => {
      expect(GLASS_OPACITY.dark.floor).toBe(0.5);
      expect(GLASS_OPACITY.dark.max).toBe(0.92);
    });
  });

  describe("materialKey", () => {
    it('materialKey("light", true) === "lightGlass"', () => {
      expect(materialKey("light", true)).toBe("lightGlass");
    });

    it('materialKey("dark", true) === "darkGlass"', () => {
      expect(materialKey("dark", true)).toBe("darkGlass");
    });

    it('materialKey("light", false) === "light"', () => {
      expect(materialKey("light", false)).toBe("light");
    });

    it('materialKey("dark", false) === "dark"', () => {
      expect(materialKey("dark", false)).toBe("dark");
    });
  });
});
