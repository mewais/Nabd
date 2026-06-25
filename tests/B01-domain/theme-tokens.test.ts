import { describe, it, expect } from "vitest";
import { THEMES, WALLPAPERS, TRANSLUCENT_FROST } from "@nabd/domain";

describe("theme-tokens.ts", () => {
  it("THEMES has exactly 3 keys: translucent, light, dark", () => {
    const keys = Object.keys(THEMES);
    expect(keys).toContain("translucent");
    expect(keys).toContain("light");
    expect(keys).toContain("dark");
    expect(keys.length).toBe(3);
  });

  it("each theme has --accent key", () => {
    for (const theme of ["translucent", "light", "dark"] as const) {
      expect(THEMES[theme]).toHaveProperty("--accent");
    }
  });

  it("each theme has --bg key", () => {
    for (const theme of ["translucent", "light", "dark"] as const) {
      expect(THEMES[theme]).toHaveProperty("--bg");
    }
  });

  it("each theme has --surface key", () => {
    for (const theme of ["translucent", "light", "dark"] as const) {
      expect(THEMES[theme]).toHaveProperty("--surface");
    }
  });

  it("all themes have the same set of CSS keys", () => {
    const translucentKeys = Object.keys(THEMES.translucent).sort();
    const lightKeys = Object.keys(THEMES.light).sort();
    const darkKeys = Object.keys(THEMES.dark).sort();
    expect(translucentKeys).toEqual(lightKeys);
    expect(translucentKeys).toEqual(darkKeys);
  });

  it("each theme has expected CSS custom properties", () => {
    const expectedKeys = [
      "--bg",
      "--surface",
      "--surface2",
      "--line",
      "--text",
      "--text2",
      "--text3",
      "--accent",
      "--accent2",
      "--accent3",
      "--map-muscle",
    ];
    for (const theme of ["translucent", "light", "dark"] as const) {
      for (const key of expectedKeys) {
        expect(THEMES[theme]).toHaveProperty(key);
        expect(typeof THEMES[theme][key]).toBe("string");
        expect(THEMES[theme][key].length).toBeGreaterThan(0);
      }
    }
  });

  it("WALLPAPERS has exactly 4 keys", () => {
    const keys = Object.keys(WALLPAPERS);
    expect(keys.length).toBe(4);
  });

  it("WALLPAPERS has aurora, dusk, mesh, slate", () => {
    expect(WALLPAPERS).toHaveProperty("aurora");
    expect(WALLPAPERS).toHaveProperty("dusk");
    expect(WALLPAPERS).toHaveProperty("mesh");
    expect(WALLPAPERS).toHaveProperty("slate");
  });

  it("all WALLPAPERS values are non-empty strings", () => {
    for (const [_key, value] of Object.entries(WALLPAPERS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("TRANSLUCENT_FROST is a non-empty string", () => {
    expect(typeof TRANSLUCENT_FROST).toBe("string");
    expect(TRANSLUCENT_FROST.length).toBeGreaterThan(0);
  });
});
