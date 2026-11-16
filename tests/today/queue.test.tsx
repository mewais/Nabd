/**
 * @nabd/today — the day's queue: what each row shows and what its
 * buttons ask for.
 */

import { fireEvent, screen } from "@testing-library/react";
import type { TodayVM } from "@nabd/today";
import { working } from "../support/builders";
import { did, mondayProgram, planRow } from "../support/programs";
import { todayVM } from "./fixtures";
import { queueCard, queueRow, renderToday } from "./render";

/** Bench done, a superset under way, rows skipped, and an untouched extra. */
const mixedDay = (): TodayVM =>
  todayVM({
    program: mondayProgram([
      planRow("p-bench", "bench", [working(8, 12)]),
      planRow("p-pushup", "pushup", [working(10, 15), working(10, 15)], { supersetId: "ss1" }),
      planRow("p-dip", "dip", [working(6, 10)], { supersetId: "ss1" }),
      planRow("p-row", "row", [working(8, 12)]),
    ]),
    skipped: ["p-row"],
    extras: [{ id: "x-curl", exId: "curl" }],
    history: [did("p-bench", "bench", 10, 60), did("p-pushup", "pushup", 12, null)],
  });

describe("Today · queue", () => {
  it("shows the day's name and each exercise with its progress", () => {
    renderToday(mixedDay());
    expect(queueCard().getByText("Push")).toBeInTheDocument();
    expect(queueRow("Bench Press").getByText("1/1 set")).toBeInTheDocument();
    expect(queueRow("Push-Up").getByText("1/2 sets")).toBeInTheDocument();
    expect(queueRow("Barbell Row").getByText("Skipped")).toBeInTheDocument();
    expect(queueRow("Dumbbell Curl").getByText("0 sets")).toBeInTheDocument();
  });

  it("numbers rows by position, except superset members which show their tag", () => {
    renderToday(mixedDay());
    expect(queueRow("Bench Press").getByText("01")).toBeInTheDocument();
    expect(queueRow("Push-Up").getByText("A1")).toBeInTheDocument();
    expect(queueRow("Weighted Dip").getByText("A2")).toBeInTheDocument();
    expect(queueRow("Barbell Row").getByText("04")).toBeInTheDocument();
  });

  it("any unfinished exercise can be started, whatever the order", () => {
    const { actions } = renderToday(mixedDay());
    fireEvent.click(queueRow("Weighted Dip").getByRole("button", { name: "Start" }));
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(actions.start).toHaveBeenCalledWith("p-dip");
  });

  it("a finished exercise offers More instead of Start, and no Skip", () => {
    const { actions } = renderToday(mixedDay());
    const bench = queueRow("Bench Press");
    expect(bench.queryByRole("button", { name: "Start" })).toBeNull();
    expect(bench.queryByRole("button", { name: "Skip" })).toBeNull();
    fireEvent.click(bench.getByRole("button", { name: "More" }));
    expect(actions.start).toHaveBeenCalledWith("p-bench");
  });

  it("Skip asks to skip that exercise", () => {
    const { actions } = renderToday(mixedDay());
    fireEvent.click(queueRow("Push-Up").getByRole("button", { name: "Skip" }));
    expect(actions.toggleSkip).toHaveBeenCalledWith("p-pushup");
    expect(actions.start).not.toHaveBeenCalled();
  });

  it("a skipped exercise can only be restored", () => {
    const { actions } = renderToday(mixedDay());
    const skipped = queueRow("Barbell Row");
    expect(skipped.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(skipped.getByRole("button", { name: "Restore" }));
    expect(actions.toggleSkip).toHaveBeenCalledWith("p-row");
  });

  it("an untouched extra can be started or removed", () => {
    const { actions } = renderToday(mixedDay());
    const extra = queueRow("Dumbbell Curl");
    fireEvent.click(extra.getByRole("button", { name: "Remove" }));
    expect(actions.toggleSkip).toHaveBeenCalledWith("x-curl");
    fireEvent.click(extra.getByRole("button", { name: "Start" }));
    expect(actions.start).toHaveBeenCalledWith("x-curl");
  });
});

describe("Today · muscle targets without exercises", () => {
  const cycled = (pool: string[]) => ({
    ...mondayProgram([]),
    type: "cycled" as const,
    days: [
      {
        id: "mon",
        name: "Full body",
        weekday: 1,
        exercises: [],
        slots: [
          {
            id: "s1",
            muscle: "lats" as const,
            pool,
            repMode: "range" as const,
            intensity: "none" as const,
            rest: 90,
            sets: [working(8, 12)],
          },
        ],
      },
    ],
  });

  it("says which targets were left out of the queue", () => {
    renderToday(todayVM({ program: cycled([]) }));
    expect(screen.getByText("1 muscle target has no exercises yet: Lats")).toBeInTheDocument();
  });

  it("says nothing when every target has an exercise", () => {
    renderToday(todayVM({ program: cycled(["row"]) }));
    expect(screen.queryByText(/no exercises yet/)).toBeNull();
  });
});
