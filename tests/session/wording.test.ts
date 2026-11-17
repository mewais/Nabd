import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { describeNextSet, formatPerformance } from "@nabd/session";
import { exercise, logged, nov, prescription, warmup, working } from "../support/builders";
import { curl, curlRow, plank, itemsFor, coachFor, wordedNextSet } from "./fixtures";

/** What a set prescribed as `spec` (in `prescribed`'s way) asks for, in words. */
const targetOf = (spec: SetSpec, overrides: Partial<Prescription> = {}, ex = curl) =>
  wordedNextSet(ex, prescription([spec], overrides)).target;

describe("wording", () => {
  it("describes a performed set for each way of tracking", () => {
    expect(formatPerformance({ reps: 9, weight: 25 }, "weight_reps", "kg")).toBe("9 × 25 kg");
    expect(formatPerformance({ reps: 9, weight: 11.34 }, "weight_reps", "lb")).toBe("9 × 25 lb");
    expect(formatPerformance({ reps: 12, weight: null }, "bodyweight_reps", "kg")).toBe("12 reps");
    expect(formatPerformance({ reps: 8, weight: 10 }, "weighted_bodyweight", "kg")).toBe(
      "8 + 10 kg",
    );
    expect(formatPerformance({ reps: 8, weight: 20 }, "assisted_bodyweight", "kg")).toBe(
      "8 − 20 kg assist",
    );
    expect(formatPerformance({ reps: 45, weight: null }, "duration", "kg")).toBe("45 s");
    expect(formatPerformance({ reps: 8, weight: 21.25 }, "weight_reps", "kg")).toBe("8 × 21.25 kg");
    expect(formatPerformance({ reps: 40, weight: 20 }, "weight_duration", "kg")).toBe(
      "40 s · 20 kg",
    );
  });

  it("a bodyweight exercise with nothing added or taken off is worded as plain reps", () => {
    expect(formatPerformance({ reps: 12, weight: 0 }, "weighted_bodyweight", "kg")).toBe("12 reps");
    expect(formatPerformance({ reps: 8, weight: 0 }, "assisted_bodyweight", "kg")).toBe("8 reps");
    // A bar with nothing on it is still a load to state.
    expect(formatPerformance({ reps: 8, weight: 0 }, "weight_reps", "kg")).toBe("8 × 0 kg");
  });

  it("advises an unloaded bodyweight exercise in reps first, then in added weight", () => {
    const pullUp = exercise({ name: "Pull-Up", tracking: "weighted_bodyweight" });
    const advice = (reps: number) =>
      wordedNextSet(pullUp, prescription([working(8, 12)]), [logged(pullUp, nov(9), reps, 0)])
        .advice;
    expect(advice(10)).toMatchObject({ primary: "11 reps", basis: "Last time: 10 reps" });
    expect(advice(12)).toMatchObject({
      primary: "8 + 2.5 kg",
      alternative: "13 reps",
      basis: "Last time: 12 reps",
    });
  });

  it("describes what a prescribed set asks for", () => {
    expect(
      targetOf({ type: "working", amount: 8, upTo: 12, intensity: 8 }, { intensity: "rpe" }),
    ).toBe("Working set · 8–12 reps · RPE 8");
    expect(targetOf(warmup(12), { intensity: "rpe" })).toBe("Warm-up · 12 reps");
    expect(
      targetOf({ type: "drop", amount: 5, intensity: 70 }, { repMode: "fixed", intensity: "pct" }),
    ).toBe("Drop set · 5 reps · 70% 1RM");
    expect(targetOf(working(45), { repMode: "time" }, plank)).toBe("Working set · 45 s");
  });

  it("puts advice into words, with the alternative and what it was based on", () => {
    const history = [logged(curl, nov(9), 8, 25)];
    const warmUp = logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" });
    const all = [...history, warmUp];
    const advice = (sets: typeof all) =>
      describeNextSet(itemsFor(sets).curlItem, coachFor(sets), "kg").advice;
    expect(advice(all)).toEqual({
      primary: "9 × 25 kg",
      alternative: "8 × 27.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 25 kg",
    });
    // The warm-up comes first, which is not something to progress on.
    expect(advice(history)).toBeNull();
  });

  describe("when the plan prescribes an intensity", () => {
    // 8 × 60 kg last week: an estimated max of 76 kg.
    const history = [logged(curl, nov(9), 8, 60)];
    const wording = (
      intensity: "pct" | "rpe",
      value: number,
      sessions = history,
      tracking: TrackingType = "weight_reps",
    ) =>
      wordedNextSet(
        { ...curl, tracking },
        prescription([working(8, 12, value)], { intensity }),
        sessions,
      ).advice!;

    it("says a %1RM load is that share of the estimated max", () => {
      expect(wording("pct", 70)).toEqual({
        primary: "8 × 52.5 kg",
        alternative: "9 × 60 kg",
        reason: "70% of your estimated max (76 kg).",
        basis: "Last time: 8 × 60 kg",
      });
    });

    it("says an RPE is reps in reserve", () => {
      expect(wording("rpe", 8)).toMatchObject({
        primary: "8 × 57.5 kg",
        reason: "RPE 8 ≈ 2 reps in reserve.",
      });
      expect(wording("rpe", 9).reason).toBe("RPE 9 ≈ 1 rep in reserve.");
      expect(wording("rpe", 7.5).reason).toBe("RPE 7.5 ≈ 2.5 reps in reserve.");
    });

    it("shows the weight in the user's unit", () => {
      const prescribed = prescription([working(8, 12, 70)], { intensity: "pct" });
      expect(wordedNextSet(curl, prescribed, history, "lb").advice!.reason).toBe(
        "70% of your estimated max (167.6 lb).",
      );
    });

    it("says the intensity will apply once there is history, and otherwise words the advice as ever", () => {
      expect(wording("pct", 70, [])).toMatchObject({
        primary: "8 reps — pick a starting weight",
        reason:
          "First time — start light and find your level. 70% 1RM applies once there is history.",
      });
      expect(wording("rpe", 8, []).reason).toMatch(/RPE 8 applies once there is history\.$/);
    });

    it("says, when there is history but no load in it, that the intensity waits for a load", () => {
      const unloaded = [logged(curl, nov(9), 6, 0)];
      expect(wording("rpe", 8, unloaded).reason).toBe(
        "Below your range last time — same load, reach the range first. " +
          "RPE 8 applies once you log it with weight.",
      );
    });

    it("tells a bodyweight exercise to set the body weight first, whatever its history", () => {
      const bodyweight = [logged(curl, nov(9), 10, 0)];
      for (const tracking of ["weighted_bodyweight", "assisted_bodyweight"] as const) {
        expect(wording("pct", 70, bodyweight, tracking).reason).toBe(
          "Inside your range — beat last time. Set your body weight in Settings to use %1RM here.",
        );
        expect(wording("rpe", 8, [], tracking).reason).toMatch(/to use RPE here\.$/);
      }
    });
  });

  it("counts a single rep as one rep", () => {
    expect(formatPerformance({ reps: 1, weight: null }, "bodyweight_reps", "kg")).toBe("1 rep");
    expect(targetOf(working(1))).toBe("Working set · 1 rep");
    expect(targetOf(working(1, 3))).toBe("Working set · 1–3 reps");
  });

  it("asks for a starting weight instead of suggesting zero the first time", () => {
    const first = (tracking: TrackingType, sets = [working(8, 12)]) =>
      wordedNextSet({ ...curl, tracking }, prescription(sets)).advice!;
    expect(first("weight_reps")).toMatchObject({
      primary: "8 reps — pick a starting weight",
      basis: null,
    });
    const hold = wordedNextSet(
      { ...plank, tracking: "weight_duration" },
      prescription([working(30)], { repMode: "time" }),
    );
    expect(hold.advice!.primary).toBe("30 s — pick a starting weight");
    // An unweighted first time has nothing to pick.
    expect(first("bodyweight_reps").primary).toBe("8 reps");
    // Nor does a bodyweight exercise that can take weight: it starts without any.
    for (const tracking of ["weighted_bodyweight", "assisted_bodyweight"] as const) {
      expect(first(tracking).primary).toBe("8 reps");
    }
  });
});
