import { dateKey } from "@nabd/domain";
import { ExerciseHistory, ProgressionAdvisor } from "@nabd/progression";
import { describeAdvice, formatPerformance, formatTarget } from "@nabd/session";
import { exercise, logged, nov, prescription, working } from "../support/builders";
import { TODAY, curl, curlRow, plankRow, itemsFor, coachFor } from "./fixtures";

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
    const advisor = new ProgressionAdvisor(2.5);
    const pullUp = exercise({ name: "Pull-Up", tracking: "weighted_bodyweight" });
    const advice = (reps: number) =>
      describeAdvice(
        advisor.advise({
          tracking: pullUp.tracking,
          prescription: prescription([working(8, 12)]),
          setIndex: 0,
          history: new ExerciseHistory([logged(pullUp, nov(9), reps, 0)], pullUp.id),
          date: dateKey(TODAY),
        }),
        pullUp.tracking,
        "kg",
      );
    expect(advice(10)).toMatchObject({ primary: "11 reps", basis: "Last time: 10 reps" });
    expect(advice(12)).toMatchObject({
      primary: "8 + 2.5 kg",
      alternative: "13 reps",
      basis: "Last time: 12 reps",
    });
  });

  it("describes what a prescribed set asks for", () => {
    const ranged = prescription([working(8, 12)], { intensity: "rpe" });
    expect(formatTarget({ type: "working", amount: 8, upTo: 12, intensity: 8 }, ranged)).toBe(
      "Working set · 8–12 reps · RPE 8",
    );
    expect(formatTarget({ type: "warmup", amount: 12 }, ranged)).toBe("Warm-up · 12 reps");
    const pct = prescription([working(5)], { repMode: "fixed", intensity: "pct" });
    expect(formatTarget({ type: "drop", amount: 5, intensity: 70 }, pct)).toBe(
      "Drop set · 5 reps · 70% 1RM",
    );
    expect(formatTarget({ type: "working", amount: 45 }, plankRow)).toBe("Working set · 45 s");
  });

  it("puts advice into words, with the alternative and what it was based on", () => {
    const history = [logged(curl, nov(9), 8, 25)];
    const warmUp = logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" });
    const all = [...history, warmUp];
    const real = coachFor(all).adviceFor(itemsFor(all).curlItem);
    expect(describeAdvice(real, "weight_reps", "kg")).toEqual({
      primary: "9 × 25 kg",
      alternative: "8 × 27.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 25 kg",
    });
    expect(describeAdvice(null, "weight_reps", "kg")).toBeNull();
  });

  describe("when the plan prescribes an intensity", () => {
    // 8 × 60 kg last week: an estimated max of 76 kg.
    const history = [logged(curl, nov(9), 8, 60)];
    const wording = (intensity: "pct" | "rpe", value: number, sessions = history) =>
      describeAdvice(
        new ProgressionAdvisor(2.5).advise({
          tracking: "weight_reps",
          prescription: prescription([working(8, 12, value)], { intensity }),
          setIndex: 0,
          history: new ExerciseHistory(sessions, curl.id),
          date: dateKey(TODAY),
        }),
        "weight_reps",
        "kg",
      )!;

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
      const advice = new ProgressionAdvisor(2.5).advise({
        tracking: "weight_reps",
        prescription: prescription([working(8, 12, 70)], { intensity: "pct" }),
        setIndex: 0,
        history: new ExerciseHistory(history, curl.id),
        date: dateKey(TODAY),
      });
      expect(describeAdvice(advice, "weight_reps", "lb")!.reason).toBe(
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
  });

  it("counts a single rep as one rep", () => {
    expect(formatPerformance({ reps: 1, weight: null }, "bodyweight_reps", "kg")).toBe("1 rep");
    expect(formatTarget({ type: "working", amount: 1 }, prescription([]))).toBe(
      "Working set · 1 rep",
    );
    expect(formatTarget({ type: "working", amount: 1, upTo: 3 }, prescription([]))).toBe(
      "Working set · 1–3 reps",
    );
  });

  it("asks for a starting weight instead of suggesting zero the first time", () => {
    const first = new ProgressionAdvisor(2.5).startingPoint("weight_reps", working(8, 12));
    expect(describeAdvice(first, "weight_reps", "kg")).toMatchObject({
      primary: "8 reps — pick a starting weight",
      basis: null,
    });
    const hold = new ProgressionAdvisor(2.5).startingPoint("weight_duration", working(30));
    expect(describeAdvice(hold, "weight_duration", "kg")!.primary).toBe(
      "30 s — pick a starting weight",
    );
    // An unweighted first time has nothing to pick.
    const reps = new ProgressionAdvisor(2.5).startingPoint("bodyweight_reps", working(8, 12));
    expect(describeAdvice(reps, "bodyweight_reps", "kg")!.primary).toBe("8 reps");
    // Nor does a bodyweight exercise that can take weight: it starts without any.
    for (const tracking of ["weighted_bodyweight", "assisted_bodyweight"] as const) {
      const start = new ProgressionAdvisor(2.5).startingPoint(tracking, working(8, 12));
      expect(describeAdvice(start, tracking, "kg")!.primary).toBe("8 reps");
    }
  });
});
