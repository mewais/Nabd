import { MAX_LOAD_KG, dateKey, kgFromDisplay } from "@nabd/domain";
import type { Exercise, SetSpec, TrackingType } from "@nabd/domain";
import { ProgressionAdvisor } from "@nabd/progression";
import { exercise, logged, nov, prescription, working } from "../support/builders";
import { advise } from "./fixtures";

describe("double progression on a weighted exercise", () => {
  const curl = exercise();

  it("inside the range: one more rep, or the same reps with more load", () => {
    const advice = advise(curl, [logged(curl, nov(9), 8, 25)]);
    expect(advice.kind).toBe("add_reps");
    expect(advice.primary).toEqual({ reps: 9, weight: 25 });
    expect(advice.alternative).toEqual({ reps: 8, weight: 27.5 });
    expect(advice.basis).toEqual({ reps: 8, weight: 25 });
  });

  it("at the top of the range: more load from the bottom of the range, or one more rep", () => {
    const advice = advise(curl, [logged(curl, nov(9), 12, 25)]);
    expect(advice.kind).toBe("add_load");
    expect(advice.primary).toEqual({ reps: 8, weight: 27.5 });
    expect(advice.alternative).toEqual({ reps: 13, weight: 25 });
  });

  it("below the range: hold the load and reach the bottom of the range", () => {
    const advice = advise(curl, [logged(curl, nov(9), 6, 25)]);
    expect(advice.kind).toBe("reach_range");
    expect(advice.primary).toEqual({ reps: 8, weight: 25 });
    expect(advice.alternative).toBeNull();
  });

  it("below the range two sessions running: back the load off one step", () => {
    const advice = advise(curl, [logged(curl, nov(5), 6, 25), logged(curl, nov(9), 5, 25)]);
    expect(advice.kind).toBe("deload");
    expect(advice.primary).toEqual({ reps: 8, weight: 22.5 });
  });

  it("never backs off below one step of a load that has to be picked", () => {
    const bar = exercise({ equipment: "barbell" });
    const light = [logged(bar, nov(5), 6, 2.5), logged(bar, nov(9), 6, 2.5)];
    const advice = advise(bar, light);
    expect(advice.kind).toBe("reach_range");
    expect(advice.primary).toEqual({ reps: 8, weight: 2.5 });
  });

  it("never suggests more load than a set can record", () => {
    const advice = advise(curl, [logged(curl, nov(9), 12, MAX_LOAD_KG)]);
    expect(advice.kind).toBe("beyond_range");
    expect(advice.primary).toEqual({ reps: 13, weight: MAX_LOAD_KG });
  });

  it("one bad session after a good one is not a stall", () => {
    const advice = advise(curl, [logged(curl, nov(5), 9, 25), logged(curl, nov(9), 6, 25)]);
    expect(advice.kind).toBe("reach_range");
  });

  it("uses the user's own increment — 25 lb goes to 27.5 lb with a 2.5 lb step", () => {
    const stepKg = kgFromDisplay(2.5, "lb");
    const last = kgFromDisplay(25, "lb");
    const advice = advise(curl, [logged(curl, nov(9), 8, last)], { stepKg });
    expect(advice.alternative?.weight).toBeCloseTo(kgFromDisplay(27.5, "lb"), 3);
  });

  it("with no history: start at the bottom of the range and find a load", () => {
    const advice = advise(curl, []);
    expect(advice).toEqual({
      kind: "start",
      primary: { reps: 8, weight: 0 },
      alternative: null,
      basis: null,
      intensity: null,
    });
  });
});

describe("which past set a set is compared against", () => {
  const press = exercise();
  const lastSession = [
    logged(press, nov(9, 10), 12, 30),
    logged(press, nov(9, 11), 10, 30),
    logged(press, nov(9, 12), 8, 30),
  ];

  it("set N is compared with set N of the previous session", () => {
    expect(advise(press, lastSession, { setIndex: 0 }).kind).toBe("add_load");
    expect(advise(press, lastSession, { setIndex: 1 }).primary).toEqual({ reps: 11, weight: 30 });
    expect(advise(press, lastSession, { setIndex: 2 }).primary).toEqual({ reps: 9, weight: 30 });
  });

  it("falls back to the last set when the previous session was shorter", () => {
    expect(advise(press, lastSession, { setIndex: 5 }).basis).toEqual({ reps: 8, weight: 30 });
  });

  it("ignores what was already logged today", () => {
    const withToday = [...lastSession, logged(press, nov(16, 9), 3, 50)];
    expect(advise(press, withToday).basis).toEqual({ reps: 12, weight: 30 });
  });

  it("ignores warm-ups", () => {
    const sets = [logged(press, nov(9, 9), 15, 10, { setType: "warmup" }), ...lastSession];
    expect(advise(press, sets).basis).toEqual({ reps: 12, weight: 30 });
  });

  describe("on a floating day that came back, which is one session over several days", () => {
    const MONDAY = dateKey(nov(16));
    /** Monday's first working set, and the next one logged on Tuesday, in Monday's session. */
    const visit = [
      logged(press, nov(16, 10), 6, 40),
      logged(press, nov(17, 10), 7, 40, { session: MONDAY }),
    ];

    it("compares the rest with the session before the visit, not with the visit's own sets", () => {
      const sets = [...lastSession, visit[0]!];
      const advice = advise(press, sets, { setIndex: 1, session: MONDAY });
      expect(advice.basis).toEqual({ reps: 10, weight: 30 });
      expect(advice.kind).toBe("add_reps");
    });

    it("counts its days as one session, so two short days are not a stall", () => {
      const sets = [...lastSession, ...visit];
      // Wednesday's session looks back at Monday's visit, and the one before it: no stall.
      const advice = advise(press, sets, { session: dateKey(nov(18)) });
      expect(advice.kind).toBe("reach_range");
      expect(advice.basis).toEqual({ reps: 6, weight: 40 });
    });

    it("leaves the next visit to compare set N with set N of the whole visit", () => {
      const next = (setIndex: number) =>
        advise(press, [...lastSession, ...visit], { setIndex, session: dateKey(nov(18)) }).basis;
      expect(next(0)).toEqual({ reps: 6, weight: 40 });
      expect(next(1)).toEqual({ reps: 7, weight: 40 });
    });

    it("estimates the max of the session before the visit, whatever the visit's days did", () => {
      const plan = prescription([working(8, 12, 70)], { intensity: "pct" });
      const advice = advise(press, [...lastSession, visit[0]!], { plan, session: MONDAY });
      // The previous session's best set: 12 × 30 kg, an estimate of 42 kg.
      expect(advice.intensity).toEqual({ kind: "pct", value: 70, max: 42 });
    });
  });
});

describe("other ways of tracking", () => {
  const ofType = (tracking: TrackingType): Exercise => exercise({ tracking });

  it("bodyweight reps: keep adding reps, even past the range (there is no load to add)", () => {
    const pushUp = ofType("bodyweight_reps");
    expect(advise(pushUp, [logged(pushUp, nov(9), 9, null)]).primary).toEqual({
      reps: 10,
      weight: null,
    });
    const topped = advise(pushUp, [logged(pushUp, nov(9), 12, null)]);
    expect(topped.kind).toBe("beyond_range");
    expect(topped.primary).toEqual({ reps: 13, weight: null });
    expect(topped.alternative).toBeNull();
  });

  it("weighted bodyweight: the first added load is one step above zero", () => {
    const pullUp = ofType("weighted_bodyweight");
    const advice = advise(pullUp, [logged(pullUp, nov(9), 12, 0)]);
    expect(advice.primary).toEqual({ reps: 8, weight: 2.5 });
  });

  it("assisted: progressing means less assistance; deloading means more", () => {
    const assisted = ofType("assisted_bodyweight");
    expect(advise(assisted, [logged(assisted, nov(9), 12, 20)]).primary).toEqual({
      reps: 8,
      weight: 17.5,
    });
    const stalled = [logged(assisted, nov(5), 4, 20), logged(assisted, nov(9), 4, 20)];
    expect(advise(assisted, stalled).primary).toEqual({ reps: 8, weight: 22.5 });
  });

  it("assisted with no assistance left behaves like bodyweight", () => {
    const assisted = ofType("assisted_bodyweight");
    expect(advise(assisted, [logged(assisted, nov(9), 12, 0)]).kind).toBe("beyond_range");
  });

  it("holds: five more seconds until the target time is reached, then keep going", () => {
    const plank = ofType("duration");
    const plan = prescription([{ type: "working", amount: 45 }], { repMode: "time" });
    expect(advise(plank, [logged(plank, nov(9), 30, null)], { plan }).primary.reps).toBe(45);
    expect(advise(plank, [logged(plank, nov(9), 45, null)], { plan }).primary.reps).toBe(50);
  });

  it("loaded holds trade time for load at the target", () => {
    const carry = ofType("weight_duration");
    const plan = prescription([{ type: "working", amount: 40 }], { repMode: "time" });
    expect(advise(carry, [logged(carry, nov(9), 40, 20)], { plan }).primary).toEqual({
      reps: 40,
      weight: 22.5,
    });
  });
});

describe("the goal a set is measured against", () => {
  it("is the bottom of a range, a fixed count, or a sensible default when nothing is prescribed", () => {
    const start = (spec: SetSpec | null, tracking: TrackingType): number =>
      new ProgressionAdvisor(2.5).startingPoint(tracking, spec).primary.reps;
    expect(start(working(8, 12), "weight_reps")).toBe(8);
    expect(start(working(5), "weight_reps")).toBe(5);
    expect(start(null, "weight_reps")).toBe(8);
    expect(start(null, "duration")).toBe(30);
  });

  it("an unplanned exercise uses the default window", () => {
    const ex = exercise();
    expect(advise(ex, [logged(ex, nov(9), 12, 10)], { plan: null }).kind).toBe("add_load");
  });
});

describe("where a first warm-up starts", () => {
  const advisor = new ProgressionAdvisor(2.5);
  const warmup: SetSpec = { type: "warmup", amount: 12 };

  it("is half the last working load, on the load step, for the reps the warm-up asks", () => {
    expect(advisor.warmupFrom("weight_reps", { reps: 8, weight: 60 }, warmup)).toEqual({
      reps: 12,
      weight: 30,
    });
    // Half of 52.5 kg is 26.25 kg, which no 2.5 kg plate jump reaches: 27.5 kg is the nearest.
    expect(advisor.warmupFrom("weight_reps", { reps: 8, weight: 52.5 }, warmup).weight).toBe(27.5);
    expect(
      new ProgressionAdvisor(1.134).warmupFrom("weight_reps", { reps: 8, weight: 11.34 }, warmup),
    ).toEqual({
      reps: 12,
      weight: 5.67,
    });
  });

  it("keeps the working reps when no warm-up is prescribed", () => {
    expect(advisor.warmupFrom("weight_reps", { reps: 8, weight: 60 }, null).reps).toBe(8);
  });

  it("has no load to halve on an unweighted exercise, and leaves assistance as it was", () => {
    expect(
      advisor.warmupFrom("bodyweight_reps", { reps: 12, weight: null }, warmup).weight,
    ).toBeNull();
    expect(advisor.warmupFrom("assisted_bodyweight", { reps: 6, weight: 20 }, warmup).weight).toBe(
      20,
    );
  });
});
