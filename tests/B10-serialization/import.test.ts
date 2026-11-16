import { APPDATA_VERSION, DEFAULT_SETTINGS } from "@nabd/domain";
import { parseImport } from "@nabd/serialization";

const doc = (fields: object): string => JSON.stringify({ app: "Nabd", version: 2, ...fields });

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
    expect(parseImport(JSON.stringify({ app: "Other", version: 2 })).ok).toBe(false);
  });

  it("says where an invalid document is wrong", () => {
    const result = parseImport(doc({ settings: { interval: 1 }, program: { name: 5 } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("settings.interval:"))).toBe(true);
    expect(result.errors.some((e) => e.startsWith("program.name:"))).toBe(true);
  });
});
