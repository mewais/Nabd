import type { Program } from "@nabd/domain";
import {
  carriedAfterEdit,
  dayIdAfterEdit,
  plannerDayAfterEdit,
  rotationAfterEdit,
} from "@nabd/scheduling";
import { carry, nov, visit } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, floatingPushPull, flyRow, pushPull } from "../support/programs";
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

describe("what an unfinished floating day has behind it, across plan edits", () => {
  const carried = visit(nov(13), {
    [benchRow.id]: carry(EX.bench.id, { warmup: 1, working: 1 }),
    [flyRow.id]: carry(EX.fly.id, { working: 1 }),
  });
  const [push, pull] = floatingPushPull.days as [Program["days"][0], Program["days"][0]];

  it("is the same while every item is still on the day", () => {
    const renamed: Program = { ...floatingPushPull, name: "Renamed" };
    expect(carriedAfterEdit(renamed, "mon", carried)).toBe(carried);
  });

  it("loses the sets of an item that was deleted, and keeps the visit's start", () => {
    const withoutFly: Program = {
      ...floatingPushPull,
      days: [{ ...push, exercises: push.exercises.filter((item) => item.id !== flyRow.id) }, pull],
    };
    expect(carriedAfterEdit(withoutFly, "mon", carried)).toEqual({
      startedOn: carried.startedOn,
      items: { [benchRow.id]: carried.items[benchRow.id] },
    });
  });

  it("is dropped with a deleted day, which the day that took its place starts clean of", () => {
    expect(carriedAfterEdit({ ...floatingPushPull, days: [pull] }, "wed", carried)).toBeNull();
    expect(carriedAfterEdit({ ...floatingPushPull, days: [] }, null, carried)).toBeNull();
  });

  it("is kept, unused, while the plan is on weekdays, so a same-day switch back finds it", () => {
    expect(carriedAfterEdit(pushPull, null, carried)).toBe(carried);
    const backToFloating = dayIdAfterEdit(pushPull, floatingPushPull, null, nov(16));
    expect(carriedAfterEdit(floatingPushPull, backToFloating, carried)).toBe(carried);
  });

  it("belongs to the day it was earned on: another day's items are not carried", () => {
    expect(carriedAfterEdit(floatingPushPull, "wed", carried)).toBeNull();
  });

  it("stays nothing when there was nothing", () => {
    expect(carriedAfterEdit(floatingPushPull, "mon", null)).toBeNull();
  });
});
