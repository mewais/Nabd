import type { Program } from "@nabd/domain";
import { dayIdAfterEdit, rotationAfterEdit, plannerDayAfterEdit } from "@nabd/scheduling";
import { nov } from "../support/builders";
import { EX } from "../support/exercises";
import { cycledPlan, floatingPushPull, pushPull } from "../support/programs";
import { MONDAY } from "./fixtures";

describe("a floating plan across plan edits", () => {
  it("stays on its day when the days around it are edited", () => {
    const [mon, wed] = floatingPushPull.days as [Program["days"][0], Program["days"][0]];
    const reordered: Program = { ...floatingPushPull, days: [{ ...wed, id: "new" }, wed, mon] };
    expect(dayIdAfterEdit(floatingPushPull, reordered, null, MONDAY)).toBe("mon");
    expect(dayIdAfterEdit(floatingPushPull, reordered, "wed", MONDAY)).toBe("wed");
  });

  it("removing the current floating day lands on the day that took its place", () => {
    const only = (index: number): Program => ({
      ...floatingPushPull,
      days: [floatingPushPull.days[index]!],
    });
    expect(dayIdAfterEdit(floatingPushPull, only(1), "mon", MONDAY)).toBe("wed");
    expect(dayIdAfterEdit(floatingPushPull, only(0), "wed", MONDAY)).toBe("mon");
    expect(
      dayIdAfterEdit(floatingPushPull, { ...floatingPushPull, days: [] }, "wed", MONDAY),
    ).toBeNull();
  });
});

describe("today's day across a switch of schedule", () => {
  it("a weekday plan going floating starts on today's day, not on a position left from before", () => {
    // Wednesday is Pull day; "mon" is where an earlier floating spell had stopped.
    expect(dayIdAfterEdit(pushPull, floatingPushPull, "mon", nov(18))).toBe("wed");
    expect(dayIdAfterEdit(pushPull, floatingPushPull, null, MONDAY)).toBe("mon");
  });

  it("on a rest day it starts from the first day", () => {
    expect(dayIdAfterEdit(pushPull, floatingPushPull, "wed", nov(17))).toBeNull();
  });

  it("a weekday plan remembers no floating day", () => {
    expect(dayIdAfterEdit(floatingPushPull, pushPull, "wed", MONDAY)).toBeNull();
    expect(dayIdAfterEdit(pushPull, { ...pushPull, days: [] }, "wed", MONDAY)).toBeNull();
  });
});

describe("the day open in the planner across plan edits", () => {
  const [mon, wed] = floatingPushPull.days as [Program["days"][0], Program["days"][0]];
  const added: Program["days"][0] = { ...wed, id: "new" };

  it("a day the edit added is opened", () => {
    expect(
      plannerDayAfterEdit(
        floatingPushPull,
        { ...floatingPushPull, days: [mon, wed, added] },
        "mon",
      ),
    ).toBe("new");
  });

  it("the open day stays open when it moves", () => {
    expect(
      plannerDayAfterEdit(floatingPushPull, { ...floatingPushPull, days: [wed, mon] }, "mon"),
    ).toBe("mon");
  });

  it("deleting the open day opens its neighbour", () => {
    const three: Program = { ...floatingPushPull, days: [mon, wed, added] };
    expect(plannerDayAfterEdit(three, { ...three, days: [mon, added] }, "wed")).toBe("new");
    expect(plannerDayAfterEdit(three, { ...three, days: [mon, wed] }, "new")).toBe("wed");
    expect(
      plannerDayAfterEdit(floatingPushPull, { ...floatingPushPull, days: [] }, "mon"),
    ).toBeNull();
  });

  it("with no day open, none is opened by an edit that adds none", () => {
    expect(
      plannerDayAfterEdit(floatingPushPull, { ...floatingPushPull, name: "Renamed" }, null),
    ).toBeNull();
  });
});

describe("the rotation across plan edits", () => {
  const withPool = (pool: string[]): Program => ({
    ...cycledPlan,
    days: cycledPlan.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
    })),
  });
  const three = withPool([EX.bench.id, EX.fly.id, EX.dip.id]);

  it("is the same rotation when no pool lost the exercise it was about to give", () => {
    const rotation = { chest: EX.fly.id };
    expect(rotationAfterEdit(three, withPool([EX.fly.id, EX.dip.id]), rotation)).toBe(rotation);
    expect(rotationAfterEdit(three, withPool([EX.dip.id, EX.fly.id, EX.bench.id]), rotation)).toBe(
      rotation,
    );
  });

  it("a pool that lost the exercise it was about to give moves on to the one after it", () => {
    expect(
      rotationAfterEdit(three, withPool([EX.bench.id, EX.dip.id]), { chest: EX.fly.id }),
    ).toEqual({
      chest: EX.dip.id,
    });
    // After the pool's last exercise comes its first.
    expect(
      rotationAfterEdit(three, withPool([EX.bench.id, EX.fly.id]), { chest: EX.dip.id }),
    ).toEqual({
      chest: EX.bench.id,
    });
  });

  it("forgets a pool that was emptied, and a slot that is gone", () => {
    expect(rotationAfterEdit(three, withPool([]), { chest: EX.fly.id })).toEqual({});
    expect(rotationAfterEdit(three, three, { chest: EX.fly.id, removed: EX.bench.id })).toEqual({
      chest: EX.fly.id,
    });
  });
});
