import { describe, it, expect } from "vitest";
import { AppDataSchema, APPDATA_VERSION } from "@nabd/domain";

describe("appdata.ts", () => {
  it("minimal {app:'Nabd', version:1} parses successfully", () => {
    const result = AppDataSchema.safeParse({ app: "Nabd", version: 1 });
    expect(result.success).toBe(true);
  });

  it("wrong app value is rejected", () => {
    const result = AppDataSchema.safeParse({ app: "OtherApp", version: 1 });
    expect(result.success).toBe(false);
  });

  it("wrong app type is rejected", () => {
    const result = AppDataSchema.safeParse({ app: 123, version: 1 });
    expect(result.success).toBe(false);
  });

  it("non-integer version is rejected", () => {
    const result = AppDataSchema.safeParse({ app: "Nabd", version: 1.5 });
    expect(result.success).toBe(false);
  });

  it("non-positive version is rejected", () => {
    const result = AppDataSchema.safeParse({ app: "Nabd", version: 0 });
    expect(result.success).toBe(false);
  });

  it("partial settings is allowed (settings is partial in schema)", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      settings: { theme: "dark" },
    });
    expect(result.success).toBe(true);
  });

  it("optional fields are accepted when present", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      exportedAt: "2024-01-15T09:30:00.000Z",
      program: {
        name: "My Program",
        type: "fixed",
        schedule: "weekday",
        days: [],
      },
      customExercises: [],
      settings: { opacity: 0.6 },
      theme: "dark",
      history: [],
      rotationState: {},
    });
    expect(result.success).toBe(true);
  });

  it("APPDATA_VERSION is 1", () => {
    expect(APPDATA_VERSION).toBe(1);
  });

  it("invalid settings value is rejected (opacity out of range)", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      settings: { opacity: 2.0 },
    });
    expect(result.success).toBe(false);
  });

  it("invalid theme value is rejected", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      theme: "midnight",
    });
    expect(result.success).toBe(false);
  });

  it("full settings partial parses when all fields are valid", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      settings: {
        theme: "dark",
        glass: false,
        opacity: 0.7,
        wallpaper: "aurora",
        openAtStartup: true,
        minimizedByDefault: false,
        interval: 50,
        idleNudge: 30,
      },
    });
    expect(result.success).toBe(true);
  });

  it("theme translucent is rejected in appdata", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      theme: "translucent",
    });
    expect(result.success).toBe(false);
  });

  it("theme light is accepted in appdata", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      theme: "light",
    });
    expect(result.success).toBe(true);
  });

  it("settings.theme translucent is rejected", () => {
    const result = AppDataSchema.safeParse({
      app: "Nabd",
      version: 1,
      settings: { theme: "translucent" },
    });
    expect(result.success).toBe(false);
  });
});
