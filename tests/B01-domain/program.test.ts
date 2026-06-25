import { describe, it, expect } from "vitest";
import {
  SetSpecSchema,
  ExercisePrescriptionSchema,
  CycledSlotSchema,
  DaySchema,
  ProgramSchema,
  RepModeSchema,
  IntensitySchema,
  SetTypeSchema,
  ProgramTypeSchema,
  ScheduleSchema,
} from "@nabd/domain";

const validSetSpec = {
  type: "working",
  a: 8,
};

const validSetSpecFull = {
  type: "warmup",
  a: 5,
  b: 10,
  val: 70,
};

const validPrescription = {
  id: "p1",
  exId: "bench-press",
  repMode: "range",
  intensity: "pct",
  rest: 120,
  sets: [validSetSpec],
};

const validCycledSlot = {
  id: "slot1",
  group: "Chest",
  pool: ["bench-press", "incline-press"],
  repMode: "fixed",
  intensity: "none",
  rest: 90,
  sets: [validSetSpec],
};

const validDay = {
  id: "day1",
  name: "Day 1",
  weekday: 1,
  exercises: [validPrescription],
  slots: [],
};

const validProgram = {
  name: "My Program",
  type: "fixed",
  schedule: "weekday",
  days: [validDay],
};

describe("program.ts", () => {
  describe("SetSpecSchema", () => {
    it("valid set spec parses", () => {
      const result = SetSpecSchema.safeParse(validSetSpec);
      expect(result.success).toBe(true);
    });

    it("full set spec with optional fields parses", () => {
      const result = SetSpecSchema.safeParse(validSetSpecFull);
      expect(result.success).toBe(true);
    });

    it("missing type is rejected", () => {
      const { type: _type, ...noType } = validSetSpec;
      const result = SetSpecSchema.safeParse(noType);
      expect(result.success).toBe(false);
    });

    it("invalid type is rejected", () => {
      const result = SetSpecSchema.safeParse({ ...validSetSpec, type: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("ExercisePrescriptionSchema", () => {
    it("valid prescription parses", () => {
      const result = ExercisePrescriptionSchema.safeParse(validPrescription);
      expect(result.success).toBe(true);
    });

    it("optional fields (notes, supersetId) are accepted", () => {
      const result = ExercisePrescriptionSchema.safeParse({
        ...validPrescription,
        notes: "Keep elbows tucked",
        supersetId: "superset-1",
      });
      expect(result.success).toBe(true);
    });

    it("negative rest is rejected", () => {
      const result = ExercisePrescriptionSchema.safeParse({ ...validPrescription, rest: -1 });
      expect(result.success).toBe(false);
    });

    it("non-integer rest is rejected", () => {
      const result = ExercisePrescriptionSchema.safeParse({ ...validPrescription, rest: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe("CycledSlotSchema", () => {
    it("valid cycled slot parses", () => {
      const result = CycledSlotSchema.safeParse(validCycledSlot);
      expect(result.success).toBe(true);
    });

    it("optional notes field is accepted", () => {
      const result = CycledSlotSchema.safeParse({
        ...validCycledSlot,
        notes: "Go heavy",
      });
      expect(result.success).toBe(true);
    });

    it("invalid group is rejected", () => {
      const result = CycledSlotSchema.safeParse({ ...validCycledSlot, group: "InvalidGroup" });
      expect(result.success).toBe(false);
    });
  });

  describe("DaySchema", () => {
    it("valid day parses", () => {
      const result = DaySchema.safeParse(validDay);
      expect(result.success).toBe(true);
    });

    it("weekday 0 (Sunday) is accepted", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: 0 });
      expect(result.success).toBe(true);
    });

    it("weekday 6 (Saturday) is accepted", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: 6 });
      expect(result.success).toBe(true);
    });

    it("weekday 7 is rejected (out of 0-6)", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: 7 });
      expect(result.success).toBe(false);
    });

    it("weekday -1 is rejected", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: -1 });
      expect(result.success).toBe(false);
    });

    it("weekday null is accepted (floating)", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: null });
      expect(result.success).toBe(true);
    });

    it("non-integer weekday is rejected", () => {
      const result = DaySchema.safeParse({ ...validDay, weekday: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe("ProgramSchema", () => {
    it("valid program parses", () => {
      const result = ProgramSchema.safeParse(validProgram);
      expect(result.success).toBe(true);
    });

    it("cycled type + floating schedule parses", () => {
      const result = ProgramSchema.safeParse({
        ...validProgram,
        type: "cycled",
        schedule: "floating",
        days: [{ ...validDay, weekday: null, exercises: [], slots: [validCycledSlot] }],
      });
      expect(result.success).toBe(true);
    });

    it("invalid type is rejected", () => {
      const result = ProgramSchema.safeParse({ ...validProgram, type: "invalid" });
      expect(result.success).toBe(false);
    });

    it("invalid schedule is rejected", () => {
      const result = ProgramSchema.safeParse({ ...validProgram, schedule: "daily" });
      expect(result.success).toBe(false);
    });
  });

  describe("RepModeSchema", () => {
    it("accepts range", () => expect(RepModeSchema.safeParse("range").success).toBe(true));
    it("accepts fixed", () => expect(RepModeSchema.safeParse("fixed").success).toBe(true));
    it("accepts time", () => expect(RepModeSchema.safeParse("time").success).toBe(true));
    it("rejects invalid", () => expect(RepModeSchema.safeParse("invalid").success).toBe(false));
  });

  describe("IntensitySchema", () => {
    it("accepts none", () => expect(IntensitySchema.safeParse("none").success).toBe(true));
    it("accepts rpe", () => expect(IntensitySchema.safeParse("rpe").success).toBe(true));
    it("accepts pct", () => expect(IntensitySchema.safeParse("pct").success).toBe(true));
    it("rejects invalid", () => expect(IntensitySchema.safeParse("invalid").success).toBe(false));
  });

  describe("SetTypeSchema", () => {
    it("accepts warmup", () => expect(SetTypeSchema.safeParse("warmup").success).toBe(true));
    it("accepts working", () => expect(SetTypeSchema.safeParse("working").success).toBe(true));
    it("accepts drop", () => expect(SetTypeSchema.safeParse("drop").success).toBe(true));
    it("rejects invalid", () => expect(SetTypeSchema.safeParse("invalid").success).toBe(false));
  });

  describe("ProgramTypeSchema", () => {
    it("accepts fixed", () => expect(ProgramTypeSchema.safeParse("fixed").success).toBe(true));
    it("accepts cycled", () => expect(ProgramTypeSchema.safeParse("cycled").success).toBe(true));
    it("rejects invalid", () => expect(ProgramTypeSchema.safeParse("invalid").success).toBe(false));
  });

  describe("ScheduleSchema", () => {
    it("accepts weekday", () => expect(ScheduleSchema.safeParse("weekday").success).toBe(true));
    it("accepts floating", () => expect(ScheduleSchema.safeParse("floating").success).toBe(true));
    it("rejects invalid", () => expect(ScheduleSchema.safeParse("daily").success).toBe(false));
  });
});
