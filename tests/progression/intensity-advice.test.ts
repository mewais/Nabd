// The advice for a set prescribed at a %1RM or an RPE.

import { MAX_LOAD_KG } from "@nabd/domain";
import { exercise, logged, nov, prescription, working } from "../support/builders";
import { advise } from "./fixtures";

describe("a prescribed intensity", () => {
  const bench = exercise();
  /** 8 × 50 kg: an estimated max of 50 × (1 + 8/30) = 63.33 kg. */
  const lastSession = [logged(bench, nov(9), 8, 50)];
  const asked = (kind: "pct" | "rpe", value: number, hi = 12) =>
    prescription([working(8, hi, value)], { intensity: kind });

  it("%1RM: that share of the estimated max, on the load step, for the bottom of the range", () => {
    const advice = advise(bench, lastSession, { plan: asked("pct", 70) });
    // 70% of 63.33 kg is 44.33 kg: the nearest 2.5 kg step is 45.
    expect(advice.primary).toEqual({ reps: 8, weight: 45 });
    expect(advice.intensity).toEqual({ kind: "pct", value: 70, max: 50 * (1 + 8 / 30) });
  });

  it("RPE: the load at which the reps leave 10 − RPE in reserve", () => {
    // RPE 8 leaves 2 reps: 8 + 2 reps against a max of 63.33 kg is 63.33 / (1 + 10/30) = 47.5 kg.
    expect(advise(bench, lastSession, { plan: asked("rpe", 8) }).primary).toEqual({
      reps: 8,
      weight: 47.5,
    });
    // RPE 10 is to failure: the load at which the prescribed reps are all there are.
    expect(advise(bench, lastSession, { plan: asked("rpe", 10) }).primary.weight).toBe(50);
    // A half RPE is half a rep: 8.5 reps asked, 1.5 held back.
    expect(advise(bench, lastSession, { plan: asked("rpe", 8.5) }).primary.weight).toBe(47.5);
  });

  it("keeps double progression on offer as the alternative", () => {
    const advice = advise(bench, lastSession, { plan: asked("pct", 70) });
    expect(advice.kind).toBe("add_reps");
    expect(advice.alternative).toEqual({ reps: 9, weight: 50 });
    expect(advice.basis).toEqual({ reps: 8, weight: 50 });
  });

  it("does not offer the same target twice", () => {
    const top = [logged(bench, nov(9), 12, 40)];
    // 76% of 56 kg is 42.56: 42.5 kg, which is what double progression suggests too.
    const advice = advise(bench, top, { plan: asked("pct", 76) });
    expect(advice.primary).toEqual({ reps: 8, weight: 42.5 });
    expect(advice.alternative).toEqual({ reps: 13, weight: 40 });
  });

  it("measures each set against its own intensity", () => {
    const plan = prescription([working(8, 12, 60), working(8, 12, 80)], { intensity: "pct" });
    expect(advise(bench, lastSession, { plan, setIndex: 0 }).primary.weight).toBe(37.5);
    expect(advise(bench, lastSession, { plan, setIndex: 1 }).primary.weight).toBe(50);
  });

  it("waits for an estimate: with no history, or none that moved a load", () => {
    const plan = asked("pct", 70);
    expect(advise(bench, [], { plan })).toMatchObject({
      kind: "start",
      primary: { reps: 8, weight: 0 },
      intensity: { kind: "pct", value: 70, max: null, waitingFor: "history" },
    });
    const unloaded = [logged(bench, nov(9), 10, null)];
    expect(advise(bench, unloaded, { plan }).intensity).toEqual({
      kind: "pct",
      value: 70,
      max: null,
      waitingFor: "load",
    });
  });

  it("never suggests less than one step of a load that has to be picked", () => {
    const feather = [logged(bench, nov(9), 5, 1)];
    expect(advise(bench, feather, { plan: asked("pct", 40) }).primary.weight).toBe(2.5);
  });

  it("never suggests more than a set can record, however big the estimate", () => {
    const typo = [logged(bench, nov(9), 999, MAX_LOAD_KG)];
    expect(advise(bench, typo, { plan: asked("pct", 70) }).primary.weight).toBe(MAX_LOAD_KG);
  });

  describe("on a bodyweight exercise, whose load adds to (or takes off) the user's body weight", () => {
    const dip = exercise({ tracking: "weighted_bodyweight" });
    const assisted = exercise({ tracking: "assisted_bodyweight" });

    it("waits for the body weight, keeping the plain advice", () => {
      const plan = asked("rpe", 8);
      for (const ex of [dip, assisted]) {
        const advice = advise(ex, [logged(ex, nov(9), 10, 10)], { plan });
        expect(advice.intensity).toEqual({
          kind: "rpe",
          value: 8,
          max: null,
          waitingFor: "bodyWeight",
        });
        expect(advice.kind).toBe("add_reps");
      }
    });

    it("measures body weight and load together", () => {
      // 80 kg + 10 kg for 10 reps: an estimated max of 90 × (1 + 10/30) = 120 kg.
      const advice = advise(dip, [logged(dip, nov(9), 10, 10)], {
        plan: asked("rpe", 8),
        bodyWeight: 80,
      });
      // RPE 8 for 8 reps is 10 reps' worth: 120 / (1 + 10/30) = 90 kg in all, so 10 kg added.
      expect(advice.primary).toEqual({ reps: 8, weight: 10 });
      expect(advice.intensity).toEqual({ kind: "rpe", value: 8, max: 120 });
    });

    it("takes assistance off the body weight: harder asks for less of it", () => {
      // 80 kg − 20 kg for 8 reps: 60 × (1 + 8/30) = 76 kg; RPE 8 is 76 / (1 + 10/30) = 57 kg.
      const advice = advise(assisted, [logged(assisted, nov(9), 8, 20)], {
        plan: asked("rpe", 8),
        bodyWeight: 80,
      });
      expect(advice.primary).toEqual({ reps: 8, weight: 22.5 });
    });

    it("stays reps-first while the load would be nothing", () => {
      const plan = asked("pct", 50);
      // 80 kg for 12 reps is a max of 112 kg; half of it is less than the body weight alone.
      const bare = advise(dip, [logged(dip, nov(9), 12, 0)], { plan, bodyWeight: 80 });
      expect(bare.intensity).toBeNull();
      expect(bare.kind).toBe("add_load");
      const light = advise(dip, [logged(dip, nov(9), 10, 1)], { plan, bodyWeight: 80 });
      expect(light.intensity).toBeNull();
      expect(light.primary).toEqual({ reps: 11, weight: 1 });
    });
  });

  it("is ignored where there is no load to lift: holds and bodyweight reps", () => {
    for (const tracking of ["duration", "weight_duration", "bodyweight_reps"] as const) {
      const ex = exercise({ tracking });
      const plan = prescription([working(8, 12, 70)], { intensity: "pct" });
      expect(advise(ex, [logged(ex, nov(9), 8, 20)], { plan }).intensity).toBeNull();
    }
  });

  it("is ignored when the plan prescribes none, or none for this set", () => {
    const plain = advise(bench, lastSession, { plan: prescription([working(8, 12, 70)]) });
    expect(plain.intensity).toBeNull();
    const unset = advise(bench, lastSession, {
      plan: prescription([working(8, 12)], { intensity: "rpe" }),
    });
    expect(unset.intensity).toBeNull();
    expect(unset.primary).toEqual({ reps: 9, weight: 50 });
    expect(advise(bench, lastSession, { plan: null }).intensity).toBeNull();
  });
});
