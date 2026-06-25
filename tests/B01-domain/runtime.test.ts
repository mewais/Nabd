import { describe, it, expect } from "vitest";
import {
  SlotSchema,
  SlotStatusSchema,
  TriggerSchema,
  LoggedSetSchema,
  CoverageSchema,
  RotationStateSchema,
  DayStateSchema,
} from "@nabd/domain";

const validSlot = {
  id: "slot-1",
  exId: "bench-press",
  exercise: "Bench Press",
  group: "Chest",
  muscles: ["chest", "triceps"],
  min: 570,
  timeStr: "09:30",
  sets: 3,
  done: 1,
  status: "now",
  result: "",
};

const validLoggedSet = {
  id: "log-1",
  exId: "bench-press",
  exercise: "Bench Press",
  group: "Chest",
  muscles: ["chest"],
  value: 8,
  weight: 80,
  ts: "2024-01-15T09:30:00.000Z",
  date: "2024-01-15",
  trigger: "manual",
};

describe("runtime.ts", () => {
  describe("SlotStatusSchema", () => {
    it("accepts done", () => expect(SlotStatusSchema.safeParse("done").success).toBe(true));
    it("accepts now", () => expect(SlotStatusSchema.safeParse("now").success).toBe(true));
    it("accepts upcoming", () => expect(SlotStatusSchema.safeParse("upcoming").success).toBe(true));
    it("accepts skipped", () => expect(SlotStatusSchema.safeParse("skipped").success).toBe(true));
    it("rejects invalid status", () =>
      expect(SlotStatusSchema.safeParse("invalid").success).toBe(false));
  });

  describe("SlotSchema", () => {
    it("valid slot parses", () => {
      const result = SlotSchema.safeParse(validSlot);
      expect(result.success).toBe(true);
    });

    it("invalid status in slot is rejected", () => {
      const result = SlotSchema.safeParse({ ...validSlot, status: "invalid" });
      expect(result.success).toBe(false);
    });

    it("negative sets is rejected", () => {
      const result = SlotSchema.safeParse({ ...validSlot, sets: 0 });
      expect(result.success).toBe(false);
    });

    it("negative done is rejected", () => {
      const result = SlotSchema.safeParse({ ...validSlot, done: -1 });
      expect(result.success).toBe(false);
    });

    it("bad muscle key is rejected", () => {
      const result = SlotSchema.safeParse({ ...validSlot, muscles: ["pecs"] });
      expect(result.success).toBe(false);
    });

    it("all slot statuses accepted", () => {
      for (const status of ["done", "now", "upcoming", "skipped"]) {
        const result = SlotSchema.safeParse({ ...validSlot, status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("TriggerSchema", () => {
    it("accepts idle", () => expect(TriggerSchema.safeParse("idle").success).toBe(true));
    it("accepts timer", () => expect(TriggerSchema.safeParse("timer").success).toBe(true));
    it("accepts manual", () => expect(TriggerSchema.safeParse("manual").success).toBe(true));
    it("rejects invalid trigger", () =>
      expect(TriggerSchema.safeParse("auto").success).toBe(false));
  });

  describe("LoggedSetSchema", () => {
    it("valid logged set parses", () => {
      const result = LoggedSetSchema.safeParse(validLoggedSet);
      expect(result.success).toBe(true);
    });

    it("null weight is accepted (unweighted)", () => {
      const result = LoggedSetSchema.safeParse({ ...validLoggedSet, weight: null });
      expect(result.success).toBe(true);
    });

    it("invalid trigger is rejected", () => {
      const result = LoggedSetSchema.safeParse({ ...validLoggedSet, trigger: "auto" });
      expect(result.success).toBe(false);
    });

    it("bad muscle key is rejected", () => {
      const result = LoggedSetSchema.safeParse({ ...validLoggedSet, muscles: ["pecs"] });
      expect(result.success).toBe(false);
    });

    it("all trigger values accepted", () => {
      for (const trigger of ["idle", "timer", "manual"]) {
        const result = LoggedSetSchema.safeParse({ ...validLoggedSet, trigger });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("CoverageSchema", () => {
    it("accepts a valid coverage map", () => {
      const coverage = {
        chest: 75,
        lats: 50,
        triceps: 25,
      };
      const result = CoverageSchema.safeParse(coverage);
      expect(result.success).toBe(true);
    });

    it("accepts an empty coverage map", () => {
      const result = CoverageSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts a full coverage map with all muscles", () => {
      const coverage: Record<string, number> = {};
      const muscles = [
        "front_delts",
        "side_delts",
        "rear_delts",
        "neck",
        "upper_traps",
        "rhomboids",
        "lower_traps",
        "lats",
        "lower_back",
        "chest",
        "abs",
        "obliques",
        "quads",
        "hamstrings",
        "glutes",
        "abductors",
        "adductors",
        "calves",
        "tibialis",
        "hip_flexors",
        "biceps",
        "triceps",
        "forearms",
      ];
      for (const m of muscles) {
        coverage[m] = 100;
      }
      const result = CoverageSchema.safeParse(coverage);
      expect(result.success).toBe(true);
    });
  });

  describe("RotationStateSchema", () => {
    it("accepts a valid rotation state map", () => {
      const result = RotationStateSchema.safeParse({
        "slot-1": 2,
        "slot-2": 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts an empty rotation state map", () => {
      const result = RotationStateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects non-integer values", () => {
      const result = RotationStateSchema.safeParse({ "slot-1": 1.5 });
      expect(result.success).toBe(false);
    });

    it("rejects negative values", () => {
      const result = RotationStateSchema.safeParse({ "slot-1": -1 });
      expect(result.success).toBe(false);
    });
  });

  describe("DayStateSchema", () => {
    it("valid DayState parses", () => {
      const result = DayStateSchema.safeParse({
        date: "2024-01-15",
        floatingIndex: 0,
        slots: [validSlot],
      });
      expect(result.success).toBe(true);
    });

    it("negative floatingIndex is rejected", () => {
      const result = DayStateSchema.safeParse({
        date: "2024-01-15",
        floatingIndex: -1,
        slots: [],
      });
      expect(result.success).toBe(false);
    });

    it("non-integer floatingIndex is rejected", () => {
      const result = DayStateSchema.safeParse({
        date: "2024-01-15",
        floatingIndex: 1.5,
        slots: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
