import { describe, it, expect } from "vitest";
import { THEMES, WALLPAPERS, GLASS_FROST, glassTint, GLASS_TINT_RGB } from "@nabd/domain";

describe("theme-tokens.ts", () => {
  const MATERIAL_KEYS = ["light", "dark", "lightGlass", "darkGlass"] as const;

  it("THEMES has exactly 4 keys: light, dark, lightGlass, darkGlass", () => {
    const keys = Object.keys(THEMES);
    expect(keys).toContain("light");
    expect(keys).toContain("dark");
    expect(keys).toContain("lightGlass");
    expect(keys).toContain("darkGlass");
    expect(keys.length).toBe(4);
  });

  it("each material has --accent key", () => {
    for (const key of MATERIAL_KEYS) {
      expect(THEMES[key]).toHaveProperty("--accent");
      expect(typeof THEMES[key]["--accent"]).toBe("string");
      expect(THEMES[key]["--accent"].length).toBeGreaterThan(0);
    }
  });

  it("each material has --bg key", () => {
    for (const key of MATERIAL_KEYS) {
      expect(THEMES[key]).toHaveProperty("--bg");
      expect(typeof THEMES[key]["--bg"]).toBe("string");
      expect(THEMES[key]["--bg"].length).toBeGreaterThan(0);
    }
  });

  it("each material has --surface key", () => {
    for (const key of MATERIAL_KEYS) {
      expect(THEMES[key]).toHaveProperty("--surface");
      expect(typeof THEMES[key]["--surface"]).toBe("string");
      expect(THEMES[key]["--surface"].length).toBeGreaterThan(0);
    }
  });

  it("each material has --glow key", () => {
    for (const key of MATERIAL_KEYS) {
      expect(THEMES[key]).toHaveProperty("--glow");
      expect(typeof THEMES[key]["--glow"]).toBe("string");
    }
  });

  it("each material has --cardshadow key", () => {
    for (const key of MATERIAL_KEYS) {
      expect(THEMES[key]).toHaveProperty("--cardshadow");
      expect(typeof THEMES[key]["--cardshadow"]).toBe("string");
      expect(THEMES[key]["--cardshadow"].length).toBeGreaterThan(0);
    }
  });

  it("each material has expected CSS custom properties", () => {
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
      "--glow",
      "--cardshadow",
      "--modal-bg",
    ];
    for (const material of MATERIAL_KEYS) {
      for (const key of expectedKeys) {
        expect(THEMES[material]).toHaveProperty(key);
        expect(typeof THEMES[material][key]).toBe("string");
      }
    }
  });

  it("each material exposes --modal-bg with correct value", () => {
    expect(THEMES.light["--modal-bg"]).toBe("oklch(1 0 0)");
    expect(THEMES.dark["--modal-bg"]).toBe("oklch(0.25 0.016 265)");
    expect(THEMES.lightGlass["--modal-bg"]).toBe("rgba(244,246,251,0.95)");
    expect(THEMES.darkGlass["--modal-bg"]).toBe("rgba(22,24,32,0.94)");
  });

  it("all materials have the same set of CSS keys", () => {
    const lightKeys = Object.keys(THEMES.light).sort();
    const darkKeys = Object.keys(THEMES.dark).sort();
    const lightGlassKeys = Object.keys(THEMES.lightGlass).sort();
    const darkGlassKeys = Object.keys(THEMES.darkGlass).sort();
    expect(darkKeys).toEqual(lightKeys);
    expect(lightGlassKeys).toEqual(lightKeys);
    expect(darkGlassKeys).toEqual(lightKeys);
  });

  it("WALLPAPERS has exactly 7 keys", () => {
    const keys = Object.keys(WALLPAPERS);
    expect(keys.length).toBe(7);
  });

  it("WALLPAPERS has all 7 expected keys", () => {
    expect(WALLPAPERS).toHaveProperty("aurora");
    expect(WALLPAPERS).toHaveProperty("dusk");
    expect(WALLPAPERS).toHaveProperty("mesh");
    expect(WALLPAPERS).toHaveProperty("slate");
    expect(WALLPAPERS).toHaveProperty("sand");
    expect(WALLPAPERS).toHaveProperty("frost");
    expect(WALLPAPERS).toHaveProperty("mixed");
  });

  it("all WALLPAPERS values are non-empty strings", () => {
    for (const [_key, value] of Object.entries(WALLPAPERS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("GLASS_FROST is a non-empty string", () => {
    expect(typeof GLASS_FROST).toBe("string");
    expect(GLASS_FROST.length).toBeGreaterThan(0);
  });

  describe("GLASS_TINT_RGB", () => {
    it('GLASS_TINT_RGB.light is "244,246,251"', () => {
      expect(GLASS_TINT_RGB.light).toBe("244,246,251");
    });

    it('GLASS_TINT_RGB.dark is "15,17,24"', () => {
      expect(GLASS_TINT_RGB.dark).toBe("15,17,24");
    });
  });

  describe("glassTint", () => {
    it('glassTint("dark", 0.3) passes through as-is → "rgba(15,17,24,0.3)"', () => {
      expect(glassTint("dark", 0.3)).toBe("rgba(15,17,24,0.3)");
    });

    it('glassTint("light", 1) passes through at max → "rgba(244,246,251,1)"', () => {
      expect(glassTint("light", 1)).toBe("rgba(244,246,251,1)");
    });

    it('glassTint("light", 0.7) passes through as-is → "rgba(244,246,251,0.7)"', () => {
      expect(glassTint("light", 0.7)).toBe("rgba(244,246,251,0.7)");
    });

    it('glassTint("dark", 1) passes through at max → "rgba(15,17,24,1)"', () => {
      expect(glassTint("dark", 1)).toBe("rgba(15,17,24,1)");
    });

    it('glassTint("light", 0.1) passes through at floor → "rgba(244,246,251,0.1)"', () => {
      expect(glassTint("light", 0.1)).toBe("rgba(244,246,251,0.1)");
    });

    it('glassTint("dark", 0.05) clamps to floor 0.1 → "rgba(15,17,24,0.1)"', () => {
      expect(glassTint("dark", 0.05)).toBe("rgba(15,17,24,0.1)");
    });

    it('glassTint("light", 1.5) clamps to max 1 → "rgba(244,246,251,1)"', () => {
      expect(glassTint("light", 1.5)).toBe("rgba(244,246,251,1)");
    });
  });
});
