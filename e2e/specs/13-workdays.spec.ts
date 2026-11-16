import { EXERCISE, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { MONDAY, at, dayAfter } from "../support/time";

const { bench } = EXERCISE;

const program = plan([day("Push", [planned(bench.id)])]);

const FRIDAY = dayAfter(MONDAY, 4);
const SATURDAY = dayAfter(MONDAY, 5);
const SUNDAY = dayAfter(MONDAY, 6);
const NEXT_MONDAY = dayAfter(MONDAY, 7);

test("a day off is quiet, still takes a set, and the next workday resumes the nudges", async ({
  app,
}) => {
  const { shell, today, logger } = app;
  await app.launch(at("17:00", FRIDAY), { program });
  await expect(shell.status).toContainText("Next nudge at 17:50");

  await app.sleepUntil(at("00:01", SATURDAY));
  await app.sleepUntil(at("11:00", SATURDAY));

  await test.step("Saturday: quiet however long the user is away, until Monday", async () => {
    await expect(shell.topBar).toContainText("SATURDAY · Nov 21");
    await expect(shell.status).toContainText("Quiet until Mon 09:00");
    await expect(today.screen).toContainText("Quiet until Mon 09:00");
    await app.idleFor(120);
    await expect(shell.toast).toBeHidden();
  });

  await test.step("the day's plan is there, and a set can be logged", async () => {
    await expect(today.row(bench.name)).toContainText("0/2 sets");
    await today.startSet.click();
    await logger.log({ reps: 8, weight: 20 });
    await logger.done();
    await expect(today.row(bench.name)).toContainText("1/2 sets");
    await app.idleFor(120);
    await expect(shell.toast).toBeHidden();
  });

  await app.sleepUntil(at("00:01", SUNDAY));

  await test.step("Sunday: tomorrow is a workday, so that is when it resumes", async () => {
    await expect(shell.status).toContainText("Quiet until 09:00");
    await expect(today.row(bench.name)).toContainText("1/2 sets");
  });

  await app.sleepUntil(at("00:01", NEXT_MONDAY));
  await app.sleepUntil(at("09:50", NEXT_MONDAY));

  await test.step("Monday: the plan did not move on in between, and the timer is nudging again", async () => {
    await expect(shell.status).toContainText("Interval's up");
    await expect(shell.toast).toContainText(bench.name);
    await expect(shell.toast).toContainText("Chest · Set 2 of 2");
  });
});

test("the working days are a setting, and at least one of them stays", async ({ app }) => {
  const { shell, settings } = app;
  await app.launch(at("09:30", SATURDAY), { program });
  await expect(shell.status).toContainText("Quiet until Mon 09:00");
  await shell.button("Settings").click();

  await test.step("Monday to Friday by default, in the order of the week", async () => {
    const days = settings.row("Working days").getByRole("button");
    await expect(days).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    await expect(settings.option("Working days", "Mon")).toHaveAttribute("aria-pressed", "true");
    await expect(settings.option("Working days", "Sat")).toHaveAttribute("aria-pressed", "false");
  });

  await test.step("a Saturday that is worked is nudged like any other day", async () => {
    await settings.option("Working days", "Sat").click();
    await expect(settings.option("Working days", "Sat")).toHaveAttribute("aria-pressed", "true");
    await expect(shell.status).toContainText("Next nudge at 10:20");
  });

  await test.step("the last day left cannot be switched off", async () => {
    for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      await settings.option("Working days", weekday).click();
    }
    await settings.option("Working days", "Sat").click();
    await expect(settings.option("Working days", "Sat")).toHaveAttribute("aria-pressed", "true");
    await expect(shell.status).toContainText("Next nudge at 10:20");
  });
});
