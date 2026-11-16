import { dateKey, kgFromDisplay } from "@nabd/domain";
import type { Exercise, LoggedSet, SetSpec, TrackingType } from "@nabd/domain";
import { ExerciseHistory, ProgressionAdvisor } from "@nabd/progression";
import { exercise, logged, nov, prescription, threeSets, working } from "../support/builders";

const TODAY = dateKey(nov(16));
const range8to12 = prescription(threeSets());

function advise(
  ex: Exercise,
  sets: LoggedSet[],
  options: { setIndex?: number; stepKg?: number; plan?: typeof range8to12 | null } = {},
) {
  const { setIndex = 0, stepKg = 2.5, plan = range8to12 } = options;
  return new ProgressionAdvisor(stepKg).advise({
    tracking: ex.tracking,
    prescription: plan,
    setIndex,
    history: new ExerciseHistory(sets, ex.id),
    date: TODAY,
  });
}

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
      intensity: { kind: "pct", value: 70, max: null },
    });
    const unloaded = [logged(bench, nov(9), 10, null)];
    expect(advise(bench, unloaded, { plan }).intensity).toMatchObject({ max: null });
  });

  it("never suggests less than one step of a load that has to be picked", () => {
    const feather = [logged(bench, nov(9), 5, 1)];
    expect(advise(bench, feather, { plan: asked("pct", 40) }).primary.weight).toBe(2.5);
  });

  it("leaves a bodyweight exercise reps-first while the load would be nothing", () => {
    const dip = exercise({ tracking: "weighted_bodyweight" });
    const plan = asked("pct", 50);
    // Unloaded so far: no estimate, so the plain advice stands.
    const bare = advise(dip, [logged(dip, nov(9), 12, 0)], { plan });
    expect(bare).toMatchObject({ kind: "add_load", intensity: { max: null } });
    // A little added load that rounds to nothing is not worth suggesting either.
    const light = advise(dip, [logged(dip, nov(9), 10, 1)], { plan });
    expect(light.intensity).toBeNull();
    expect(light.primary).toEqual({ reps: 11, weight: 1 });
    // Enough added load, and it is suggested like any other.
    const loaded = advise(dip, [logged(dip, nov(9), 10, 10)], { plan });
    expect(loaded.primary).toEqual({ reps: 8, weight: 7.5 });
  });

  it("is ignored where there is no load to lift: holds, assistance and bodyweight reps", () => {
    for (const tracking of [
      "duration",
      "weight_duration",
      "assisted_bodyweight",
      "bodyweight_reps",
    ] as const) {
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
