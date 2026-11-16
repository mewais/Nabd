import { APPDATA_VERSION, DEFAULT_SETTINGS } from "@nabd/domain";
import { parseImport } from "@nabd/serialization";

/** An export file of the current version holding `fields`. */
const doc = (fields: object): string =>
  JSON.stringify({ app: "Nabd", version: APPDATA_VERSION, ...fields });

describe("parseImport", () => {
  it("accepts a current export and fills defaults on logged sets", () => {
    const result = parseImport(
      doc({
        settings: DEFAULT_SETTINGS,
        history: [
          {
            id: "s1",
            exId: "bench",
            exercise: "Bench",
            group: "Chest",
            muscles: ["chest"],
            value: 8,
            weight: 40,
            ts: "2026-11-16T10:00:00.000Z",
            date: "2026-11-16",
            trigger: "timer",
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.version).toBe(APPDATA_VERSION);
    expect(result.data.history?.[0]).toMatchObject({ planItemId: null, setType: "working" });
  });

  it("migrates a v1 export: the top-level theme moves into settings", () => {
    const result = parseImport(
      JSON.stringify({ app: "Nabd", version: 1, theme: "light", settings: { interval: 30 } }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { version: APPDATA_VERSION, settings: { theme: "light", interval: 30 } },
    });
    expect(parseImport(JSON.stringify({ app: "Nabd", version: 1, theme: "dark" }))).toMatchObject({
      ok: true,
      data: { settings: { theme: "dark" } },
    });
  });

  it('reads the old "translucent" theme as the dark theme over a glass window', () => {
    const v1 = JSON.stringify({ app: "Nabd", version: 1, theme: "translucent" });
    expect(parseImport(v1)).toMatchObject({
      ok: true,
      data: { settings: { theme: "dark", glass: true } },
    });
    expect(parseImport(doc({ settings: { theme: "translucent", interval: 30 } }))).toMatchObject({
      ok: true,
      data: { settings: { theme: "dark", glass: true, interval: 30 } },
    });
  });

  it("turns an old pool position into the id of the exercise it pointed at", () => {
    const day = { id: "a" };
    const program = { name: "P", type: "cycled", schedule: "floating", days: [day] };
    const fullDay = { ...day, name: "A", weekday: null, exercises: [], slots: [] };
    const result = parseImport(
      doc({ program: { ...program, days: [fullDay] }, rotationState: { chest: 1 } }),
    );
    expect(result).toMatchObject({ ok: true, data: { rotationState: {} } });
  });

  it("refuses a file from a newer version instead of dropping what it cannot read", () => {
    const result = parseImport(JSON.stringify({ app: "Nabd", version: APPDATA_VERSION + 1 }));
    expect(result).toEqual({
      ok: false,
      errors: ["This file was exported by a newer version of Nabd. Update the app to import it."],
    });
  });

  it("turns an old floating position into the id of the day it pointed at", () => {
    const day = (id: string) => ({ id, name: id, weekday: null, exercises: [], slots: [] });
    const program = { name: "P", type: "fixed", schedule: "floating", days: [day("a"), day("b")] };
    const result = parseImport(
      doc({ program, dayState: { date: "2026-11-16", floatingIndex: 3 } }),
    );
    expect(result).toMatchObject({ ok: true, data: { dayState: { dayId: "b" } } });
  });

  it("reads a version 2 export: prescribed sets under their old field names", () => {
    const row = {
      id: "r1",
      exId: "bench_press__barbell",
      repMode: "range",
      intensity: "rpe",
      rest: 90,
      sets: [
        { type: "warmup", a: 10 },
        { type: "working", a: 8, b: 12, val: 8 },
      ],
    };
    const slot = { ...row, id: "s1", exId: undefined, muscle: "chest", pool: [] };
    const day = { id: "d", name: "Push", weekday: 1, exercises: [row], slots: [slot] };
    const program = { name: "P", type: "fixed", schedule: "weekday", days: [day] };
    const result = parseImport(JSON.stringify({ app: "Nabd", version: 2, program }));

    const sets = [
      { type: "warmup", amount: 10 },
      { type: "working", amount: 8, upTo: 12, intensity: 8 },
    ];
    expect(result).toMatchObject({
      ok: true,
      data: {
        version: APPDATA_VERSION,
        program: { days: [{ exercises: [{ sets }], slots: [{ sets }] }] },
      },
    });
  });

  it("drops fields it does not know", () => {
    const result = parseImport(doc({ somethingElse: 1 }));
    expect(result.ok && "somethingElse" in result.data).toBe(false);
  });

  it("rejects text that is not JSON, and JSON that is not an export", () => {
    expect(parseImport("{nope")).toEqual({ ok: false, errors: ["This file is not valid JSON."] });
    expect(parseImport("[1,2]")).toEqual({
      ok: false,
      errors: ["This file is not a Nabd export."],
    });
    expect(parseImport(JSON.stringify({ app: "Other", version: APPDATA_VERSION })).ok).toBe(false);
  });

  it("says where an invalid document is wrong", () => {
    const result = parseImport(doc({ settings: { interval: 1 }, program: { name: 5 } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("settings.interval:"))).toBe(true);
    expect(result.errors.some((e) => e.startsWith("program.name:"))).toBe(true);
  });
});
