/**
 * B10 · @nabd/serialization — Vitest test suite
 *
 * Every exported function is exercised so that coverage hits 100% of src/index.ts
 * even though all bodies throw "not implemented".  All tests are expected to be
 * RED until the code agent fills in the bodies.
 */

import { describe, it, expect } from "vitest";
import {
  serialize,
  serializeToJson,
  deserialize,
  deserializeJson,
  migrate,
} from "@nabd/serialization";
import type { SnapshotInput } from "@nabd/serialization";
import { APPDATA_VERSION } from "@nabd/domain";
import type { Program, Exercise, Settings, LoggedSet, RotationState, Theme } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const MINIMAL_PROGRAM: Program = {
  name: "Test Program",
  type: "fixed",
  schedule: "weekday",
  days: [
    {
      id: "day-1",
      name: "Monday",
      weekday: 1,
      exercises: [
        {
          id: "ex-pres-1",
          exId: "bench-press",
          repMode: "range",
          intensity: "rpe",
          rest: 90,
          sets: [{ type: "working", a: 8, b: 12, val: 8 }],
        },
      ],
      slots: [],
    },
  ],
};

const MINIMAL_EXERCISE: Exercise = {
  id: "bench-press",
  name: "Bench Press",
  group: "Chest",
  primary: ["chest"],
  secondary: ["triceps", "front_delts"],
  equipment: "barbell",
  tracking: "weight_reps",
};

const MINIMAL_SETTINGS: Settings = {
  theme: "translucent",
  opacity: 0.55,
  wallpaper: "aurora",
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  idleNudge: 30,
};

const MINIMAL_HISTORY: LoggedSet[] = [
  {
    id: "log-1",
    exId: "bench-press",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 80,
    ts: "2024-01-15T10:00:00.000Z",
    date: "2024-01-15",
    trigger: "timer",
  },
];

const MINIMAL_ROTATION: RotationState = { "slot-1": 0 };

/** Build a fully populated SnapshotInput fixture. */
function makeInput(overrides: Partial<SnapshotInput> = {}): SnapshotInput {
  return {
    program: MINIMAL_PROGRAM,
    customExercises: [MINIMAL_EXERCISE],
    settings: MINIMAL_SETTINGS,
    theme: "translucent" as Theme,
    history: MINIMAL_HISTORY,
    rotationState: MINIMAL_ROTATION,
    exportedAt: "2024-01-15T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

describe("serialize", () => {
  it("returns an object with app='Nabd'", () => {
    const result = serialize(makeInput());
    expect(result.app).toBe("Nabd");
  });

  it("stamps version with APPDATA_VERSION", () => {
    const result = serialize(makeInput());
    expect(result.version).toBe(APPDATA_VERSION);
  });

  it("preserves exportedAt from input", () => {
    const exportedAt = "2024-06-01T08:00:00.000Z";
    const result = serialize(makeInput({ exportedAt }));
    expect(result.exportedAt).toBe(exportedAt);
  });

  it("preserves program from input", () => {
    const result = serialize(makeInput());
    expect(result.program).toEqual(MINIMAL_PROGRAM);
  });

  it("preserves customExercises from input", () => {
    const result = serialize(makeInput());
    expect(result.customExercises).toEqual([MINIMAL_EXERCISE]);
  });

  it("preserves settings from input", () => {
    const result = serialize(makeInput());
    expect(result.settings).toEqual(MINIMAL_SETTINGS);
  });

  it("preserves theme from input", () => {
    const result = serialize(makeInput());
    expect(result.theme).toBe("translucent");
  });

  it("preserves history from input", () => {
    const result = serialize(makeInput());
    expect(result.history).toEqual(MINIMAL_HISTORY);
  });

  it("preserves rotationState from input", () => {
    const result = serialize(makeInput());
    expect(result.rotationState).toEqual(MINIMAL_ROTATION);
  });

  it("returns an object with all required AppData envelope fields", () => {
    const result = serialize(makeInput());
    expect(result).toHaveProperty("app");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("exportedAt");
    expect(result).toHaveProperty("program");
    expect(result).toHaveProperty("customExercises");
    expect(result).toHaveProperty("settings");
    expect(result).toHaveProperty("theme");
    expect(result).toHaveProperty("history");
    expect(result).toHaveProperty("rotationState");
  });
});

// ---------------------------------------------------------------------------
// serializeToJson
// ---------------------------------------------------------------------------

describe("serializeToJson", () => {
  it("returns a string", () => {
    const result = serializeToJson(makeInput());
    expect(typeof result).toBe("string");
  });

  it("is 2-space indented JSON", () => {
    const result = serializeToJson(makeInput());
    // Every non-empty line after the first should start with 2-space multiples
    const lines = result.split("\n");
    const indentedLines = lines.slice(1).filter((l) => l.trim().length > 0);
    expect(indentedLines.length).toBeGreaterThan(0);
    for (const line of indentedLines) {
      const leadingSpaces = line.match(/^( *)/)?.[1].length ?? 0;
      expect(leadingSpaces % 2).toBe(0);
    }
  });

  it("re-parses to the same value as serialize(input)", () => {
    const input = makeInput();
    const json = serializeToJson(input);
    const parsed = JSON.parse(json);
    const envelope = serialize(input);
    expect(parsed).toEqual(envelope);
  });

  it("includes app field in the JSON string", () => {
    const result = serializeToJson(makeInput());
    const parsed = JSON.parse(result);
    expect(parsed.app).toBe("Nabd");
  });

  it("includes version field in the JSON string", () => {
    const result = serializeToJson(makeInput());
    const parsed = JSON.parse(result);
    expect(parsed.version).toBe(APPDATA_VERSION);
  });

  it("produces valid JSON that JSON.parse does not throw on", () => {
    const result = serializeToJson(makeInput());
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deserialize — valid full document
// ---------------------------------------------------------------------------

describe("deserialize – valid full document", () => {
  it("returns ok:true for a valid full AppData envelope", () => {
    const envelope = serialize(makeInput());
    const result = deserialize(envelope);
    expect(result.ok).toBe(true);
  });

  it("returns empty errors array on success", () => {
    const envelope = serialize(makeInput());
    const result = deserialize(envelope);
    expect(result.errors).toEqual([]);
  });

  it("data.program equals the input program on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.program).toEqual(input.program);
  });

  it("data.customExercises equals the input on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.customExercises).toEqual(input.customExercises);
  });

  it("data.settings equals the input settings on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.settings).toEqual(input.settings);
  });

  it("data.theme equals the input theme on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.theme).toBe(input.theme);
  });

  it("data.history equals the input history on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.history).toEqual(input.history);
  });

  it("data.rotationState equals the input rotationState on round-trip", () => {
    const input = makeInput();
    const envelope = serialize(input);
    const result = deserialize(envelope);
    expect(result.data.rotationState).toEqual(input.rotationState);
  });
});

// ---------------------------------------------------------------------------
// deserialize — partial document (only program)
// ---------------------------------------------------------------------------

describe("deserialize – partial document (program only)", () => {
  it("returns ok:true for a doc containing only program", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.ok).toBe(true);
  });

  it("data.program is present when only program was supplied", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.data.program).toEqual(MINIMAL_PROGRAM);
  });

  it("data.history is absent or undefined when only program was supplied", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.data.history).toBeUndefined();
  });

  it("data.settings is absent or undefined when only program was supplied", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.data.settings).toBeUndefined();
  });

  it("data.customExercises is absent or undefined when only program was supplied", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.data.customExercises).toBeUndefined();
  });

  it("returns empty errors for a valid partial doc", () => {
    const partial = { app: "Nabd", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(partial);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deserialize — wrong app field
// ---------------------------------------------------------------------------

describe("deserialize – wrong app field", () => {
  it("returns ok:false when app is not 'Nabd'", () => {
    const bad = { app: "OtherApp", version: APPDATA_VERSION, program: MINIMAL_PROGRAM };
    const result = deserialize(bad);
    expect(result.ok).toBe(false);
  });

  it("returns non-empty errors when app is wrong", () => {
    const bad = { app: "OtherApp", version: APPDATA_VERSION };
    const result = deserialize(bad);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns empty data object when app is wrong", () => {
    const bad = { app: "OtherApp", version: APPDATA_VERSION };
    const result = deserialize(bad);
    expect(result.data).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// deserialize — missing version
// ---------------------------------------------------------------------------

describe("deserialize – missing version", () => {
  it("returns ok:false when version is absent", () => {
    const bad = { app: "Nabd", program: MINIMAL_PROGRAM };
    const result = deserialize(bad);
    expect(result.ok).toBe(false);
  });

  it("returns non-empty errors when version is missing", () => {
    const bad = { app: "Nabd" };
    const result = deserialize(bad);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns empty data when version is missing", () => {
    const bad = { app: "Nabd" };
    const result = deserialize(bad);
    expect(result.data).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// deserialize — extra / junk fields are ignored
// ---------------------------------------------------------------------------

describe("deserialize – extra junk fields ignored", () => {
  it("returns ok:true when extra unknown fields are present", () => {
    const withJunk = {
      app: "Nabd",
      version: APPDATA_VERSION,
      program: MINIMAL_PROGRAM,
      unknownFieldA: "garbage",
      anotherJunk: 12345,
    };
    const result = deserialize(withJunk);
    expect(result.ok).toBe(true);
  });

  it("extra fields do not appear in data", () => {
    const withJunk = {
      app: "Nabd",
      version: APPDATA_VERSION,
      program: MINIMAL_PROGRAM,
      unknownFieldA: "garbage",
    };
    const result = deserialize(withJunk);
    expect((result.data as Record<string, unknown>)["unknownFieldA"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deserialize — partial settings (merged / partial)
// ---------------------------------------------------------------------------

describe("deserialize – partial settings merged", () => {
  it("returns ok:true for a doc with only some settings fields", () => {
    // AppDataSchema.settings is SettingsSchema.partial().optional() so partial is valid
    const partialSettings = {
      app: "Nabd",
      version: APPDATA_VERSION,
      settings: { theme: "dark" as const, opacity: 0.7 },
    };
    const result = deserialize(partialSettings);
    expect(result.ok).toBe(true);
  });

  it("partial settings fields are preserved in result.data.settings", () => {
    const partialSettings = {
      app: "Nabd",
      version: APPDATA_VERSION,
      settings: { theme: "dark" as const, opacity: 0.7 },
    };
    const result = deserialize(partialSettings);
    expect(result.data.settings?.theme).toBe("dark");
    expect(result.data.settings?.opacity).toBe(0.7);
  });

  it("missing settings fields are absent (not merged with defaults)", () => {
    const partialSettings = {
      app: "Nabd",
      version: APPDATA_VERSION,
      settings: { theme: "light" as const },
    };
    const result = deserialize(partialSettings);
    // wallpaper is not in the partial, so it should be undefined
    expect(result.data.settings?.wallpaper).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deserialize — does not throw on any input
// ---------------------------------------------------------------------------

describe("deserialize – never throws", () => {
  it("does not throw for null input", () => {
    expect(() => deserialize(null)).not.toThrow();
  });

  it("returns ok:false for null input", () => {
    const result = deserialize(null);
    expect(result.ok).toBe(false);
  });

  it("does not throw for undefined input", () => {
    expect(() => deserialize(undefined)).not.toThrow();
  });

  it("returns ok:false for undefined input", () => {
    const result = deserialize(undefined);
    expect(result.ok).toBe(false);
  });

  it("does not throw for an empty object", () => {
    expect(() => deserialize({})).not.toThrow();
  });

  it("returns ok:false for an empty object", () => {
    const result = deserialize({});
    expect(result.ok).toBe(false);
  });

  it("does not throw for a string", () => {
    expect(() => deserialize("not an object")).not.toThrow();
  });

  it("returns ok:false for a plain string", () => {
    const result = deserialize("not an object");
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deserializeJson — bad JSON
// ---------------------------------------------------------------------------

describe("deserializeJson – bad JSON", () => {
  it("returns ok:false for malformed JSON", () => {
    const result = deserializeJson("{bad json}");
    expect(result.ok).toBe(false);
  });

  it("errors contains 'invalid json' for malformed JSON", () => {
    const result = deserializeJson("{bad json}");
    expect(result.errors).toContain("invalid json");
  });

  it("data is {} for malformed JSON", () => {
    const result = deserializeJson("{bad json}");
    expect(result.data).toEqual({});
  });

  it("does not throw for malformed JSON", () => {
    expect(() => deserializeJson("{unterminated")).not.toThrow();
  });

  it("returns ok:false for empty string as JSON", () => {
    const result = deserializeJson("");
    expect(result.ok).toBe(false);
  });

  it("errors contains 'invalid json' for empty string", () => {
    const result = deserializeJson("");
    expect(result.errors).toContain("invalid json");
  });

  it("returns ok:false for a bare number string", () => {
    // "42" is valid JSON but not a valid AppData envelope — delegates to deserialize
    const result = deserializeJson("not-a-number-at-all{{{");
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deserializeJson — good JSON delegates to deserialize
// ---------------------------------------------------------------------------

describe("deserializeJson – valid JSON delegates to deserialize", () => {
  it("returns ok:true for a valid serialized envelope as JSON string", () => {
    const json = serializeToJson(makeInput());
    const result = deserializeJson(json);
    expect(result.ok).toBe(true);
  });

  it("data matches what deserialize would return for the same envelope", () => {
    const input = makeInput();
    const json = serializeToJson(input);
    const fromJson = deserializeJson(json);
    const fromObj = deserialize(serialize(input));
    expect(fromJson.data).toEqual(fromObj.data);
  });

  it("returns ok:false when the parsed JSON has wrong app field", () => {
    const bad = JSON.stringify({ app: "WrongApp", version: APPDATA_VERSION });
    const result = deserializeJson(bad);
    expect(result.ok).toBe(false);
  });

  it("returns ok:false when the parsed JSON is missing version", () => {
    const bad = JSON.stringify({ app: "Nabd" });
    const result = deserializeJson(bad);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// serialize → deserialize round-trip
// ---------------------------------------------------------------------------

describe("round-trip: serialize then deserialize", () => {
  it("full round-trip produces ok:true", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.ok).toBe(true);
  });

  it("round-trip program equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.program).toEqual(input.program);
  });

  it("round-trip customExercises equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.customExercises).toEqual(input.customExercises);
  });

  it("round-trip settings equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.settings).toEqual(input.settings);
  });

  it("round-trip theme equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.theme).toBe(input.theme);
  });

  it("round-trip history equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.history).toEqual(input.history);
  });

  it("round-trip rotationState equals original", () => {
    const input = makeInput();
    const result = deserialize(serialize(input));
    expect(result.data.rotationState).toEqual(input.rotationState);
  });

  it("serializeToJson round-trip also succeeds", () => {
    const input = makeInput();
    const result = deserializeJson(serializeToJson(input));
    expect(result.ok).toBe(true);
    expect(result.data.program).toEqual(input.program);
  });
});

// ---------------------------------------------------------------------------
// migrate
// ---------------------------------------------------------------------------

describe("migrate", () => {
  it("returns an object with version stamped to APPDATA_VERSION", () => {
    const data = {
      app: "Nabd" as const,
      version: APPDATA_VERSION,
      program: MINIMAL_PROGRAM,
    };
    const result = migrate(data);
    expect(result.version).toBe(APPDATA_VERSION);
  });

  it("returns an object with app='Nabd'", () => {
    const data = {
      app: "Nabd" as const,
      version: APPDATA_VERSION,
    };
    const result = migrate(data);
    expect(result.app).toBe("Nabd");
  });

  it("v1 identity: program is preserved unchanged", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
      program: MINIMAL_PROGRAM,
    };
    const result = migrate(data);
    expect(result.program).toEqual(MINIMAL_PROGRAM);
  });

  it("v1 identity: customExercises are preserved unchanged", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
      customExercises: [MINIMAL_EXERCISE],
    };
    const result = migrate(data);
    expect(result.customExercises).toEqual([MINIMAL_EXERCISE]);
  });

  it("v1 identity: history is preserved unchanged", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
      history: MINIMAL_HISTORY,
    };
    const result = migrate(data);
    expect(result.history).toEqual(MINIMAL_HISTORY);
  });

  it("v1 identity: settings are preserved unchanged", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
      settings: MINIMAL_SETTINGS,
    };
    const result = migrate(data);
    expect(result.settings).toEqual(MINIMAL_SETTINGS);
  });

  it("v1 identity: rotationState is preserved unchanged", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
      rotationState: MINIMAL_ROTATION,
    };
    const result = migrate(data);
    expect(result.rotationState).toEqual(MINIMAL_ROTATION);
  });

  it("stamps current APPDATA_VERSION even when input has version=1", () => {
    const data = {
      app: "Nabd" as const,
      version: 1,
    };
    const result = migrate(data);
    expect(result.version).toBe(APPDATA_VERSION);
  });

  it("current version (APPDATA_VERSION) is an identity transform on data", () => {
    const data = {
      app: "Nabd" as const,
      version: APPDATA_VERSION,
      program: MINIMAL_PROGRAM,
      customExercises: [MINIMAL_EXERCISE],
      history: MINIMAL_HISTORY,
      settings: MINIMAL_SETTINGS,
      rotationState: MINIMAL_ROTATION,
    };
    const result = migrate(data);
    expect(result.program).toEqual(MINIMAL_PROGRAM);
    expect(result.customExercises).toEqual([MINIMAL_EXERCISE]);
    expect(result.history).toEqual(MINIMAL_HISTORY);
    expect(result.settings).toEqual(MINIMAL_SETTINGS);
    expect(result.rotationState).toEqual(MINIMAL_ROTATION);
  });
});

// ---------------------------------------------------------------------------
// Additional edge-case / complementary coverage
// ---------------------------------------------------------------------------

describe("serialize – empty collections", () => {
  it("handles empty customExercises array", () => {
    const result = serialize(makeInput({ customExercises: [] }));
    expect(result.customExercises).toEqual([]);
  });

  it("handles empty history array", () => {
    const result = serialize(makeInput({ history: [] }));
    expect(result.history).toEqual([]);
  });

  it("handles empty rotationState", () => {
    const result = serialize(makeInput({ rotationState: {} }));
    expect(result.rotationState).toEqual({});
  });
});

describe("deserialize – alternative theme values", () => {
  it("accepts theme 'dark'", () => {
    const envelope = { app: "Nabd" as const, version: APPDATA_VERSION, theme: "dark" as const };
    const result = deserialize(envelope);
    expect(result.ok).toBe(true);
    expect(result.data.theme).toBe("dark");
  });

  it("accepts theme 'light'", () => {
    const envelope = { app: "Nabd" as const, version: APPDATA_VERSION, theme: "light" as const };
    const result = deserialize(envelope);
    expect(result.ok).toBe(true);
    expect(result.data.theme).toBe("light");
  });
});

describe("deserializeJson – numeric JSON (valid JSON, invalid AppData)", () => {
  it("returns ok:false when parsed JSON is a number (not an object)", () => {
    const result = deserializeJson("42");
    expect(result.ok).toBe(false);
  });
});

describe("deserializeJson – array JSON (valid JSON, invalid AppData)", () => {
  it("returns ok:false when parsed JSON is an array", () => {
    const result = deserializeJson("[1,2,3]");
    expect(result.ok).toBe(false);
  });
});
