/** @nabd/today — buildTodayVM, the stat tiles and the note on empty muscle targets. */

import type { TodayVM } from "@nabd/today";
import { nov, working } from "../support/builders";
import { did, mondayProgram, planRow, pushDay } from "../support/programs";
import { todayVM } from "./fixtures";

describe("buildTodayVM · muscle targets without exercises", () => {
  const slot = (id: string, muscle: "chest" | "lats" | "abs", pool: string[]) => ({
    id,
    muscle,
    pool,
    repMode: "range" as const,
    intensity: "none" as const,
    rest: 90,
    sets: [working(8, 12)],
  });
  const cycled = (slots: ReturnType<typeof slot>[]) => ({
    ...mondayProgram([]),
    type: "cycled" as const,
    days: [{ id: "mon", name: "Full body", weekday: 1, exercises: [], slots }],
  });

  it("says which cycled targets were left out because their pool is empty", () => {
    const vm = todayVM({
      program: cycled([
        slot("s1", "chest", ["bench"]),
        slot("s2", "lats", []),
        slot("s3", "abs", []),
      ]),
    });
    expect(vm.queue.rows.map((row) => row.exercise)).toEqual(["Bench Press"]);
    expect(vm.emptySlotsNote).toBe("2 muscle targets have no exercises yet: Lats, Abs");

    const one = todayVM({ program: cycled([slot("s2", "lats", [])]) });
    expect(one.emptySlotsNote).toBe("1 muscle target has no exercises yet: Lats");
  });

  it("says nothing when every target has an exercise", () => {
    expect(
      todayVM({ program: cycled([slot("s1", "chest", ["bench"])]) }).emptySlotsNote,
    ).toBeNull();
    expect(todayVM({ program: pushDay() }).emptySlotsNote).toBeNull();
  });
});

describe("buildTodayVM · stats", () => {
  const history = () => [
    did(null, "bench", 8, 60, { at: nov(14, 12, 0) }),
    did(null, "bench", 8, 60, { at: nov(15, 12, 0) }),
    did("p-bench", "bench", 10, 40, { setType: "warmup" }),
    did("p-bench", "bench", 9, 60),
  ];
  const figures = (vm: TodayVM) =>
    Object.fromEntries(vm.stats.map((tile) => [tile.label, `${tile.value} ${tile.unit}`]));

  it("reports the streak, this week's sets and the load moved today, warm-ups left out", () => {
    const vm = todayVM({ program: pushDay(), history: history() });
    // Sat + Sun + today; only today's two sets fall in the week that starts this Monday.
    // Lifted: the working set's 9 × 60 kg, not the warm-up's 10 × 40 kg.
    expect(figures(vm)).toEqual({
      Streak: "3 days",
      "This week": "2 sets",
      "Lifted today": "540 kg",
    });
  });

  it("converts today's volume to pounds for lb users, grouping the digits", () => {
    const vm = todayVM({ program: pushDay(), history: history() }, { unit: "lb" });
    expect(figures(vm)).toMatchObject({ "Lifted today": "1,190 lb" });
  });

  it("counts nothing lifted for bodyweight work", () => {
    const program = mondayProgram([planRow("p-pushup", "pushup", [working(10, 15)])]);
    const vm = todayVM({ program, history: [did("p-pushup", "pushup", 12, null)] });
    expect(figures(vm)).toMatchObject({ "Lifted today": "0 kg", "This week": "1 sets" });
  });
});
