import type { Program } from "@nabd/domain";
import { BENCH, FLY, ROW, benchRow, boot } from "./harness";

describe("the plan drives today", () => {
  it("shows the floating day's exercises", async () => {
    const app = await boot();
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY]);
  });

  it("plan edits reach today immediately and are saved", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.addExercise("push", ROW));
    app.get().editProgram((e) => e.addSet("push", { kind: "ex", id: benchRow.id }));
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY, ROW]);
    expect(app.plan().item(benchRow.id)!.planned).toBe(4);
    expect((app.data.program as Program).days[0]!.exercises).toHaveLength(3);
  });
});
