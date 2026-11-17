import { exercise, day, plan, planned } from "../support/data";
import { expect, test } from "../support/fixtures";
import { at } from "../support/time";

const dumbbellBench = exercise("dumbbellBench");
const curl = exercise("curl");

const program = plan([day("Push", [planned(dumbbellBench.id), planned(curl.id)])]);

test("a segmented choice is one tab stop, chosen with the arrow keys", async ({ app, page }) => {
  const { shell, settings } = app;
  await app.launch(at("10:00"), { program });

  await test.step("the theme in the top bar", async () => {
    await shell.theme("Dark").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(shell.theme("Light")).toBeChecked();
    await expect(shell.theme("Light")).toBeFocused();
    await expect(shell.root).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("End");
    await expect(shell.theme("Dark")).toBeChecked();
  });

  await test.step("the weight unit in Settings, Tab leaving the group from its chosen option", async () => {
    await shell.button("Settings").click();
    await settings.choice("Weight unit", "kg").focus();
    await page.keyboard.press("ArrowRight");
    await expect(settings.choice("Weight unit", "lb")).toBeChecked();
    await expect(settings.row("Weight increment")).toContainText("5 lb");
    await expect(settings.choice("Weight unit", "kg")).toHaveAttribute("tabindex", "-1");
    await expect(settings.choice("Weight unit", "lb")).toHaveAttribute("tabindex", "0");
  });
});

test("a dropdown is a listbox: arrows, Home and End, a letter, Enter and Escape", async ({
  app,
  page,
}) => {
  const { today, library } = app;
  await app.launch(at("10:00"), { program });
  await today.logSomethingElse.click();
  await library.button("Create custom exercise").click();
  const tracking = library.button("How to track it");
  const option = (name: string) => library.dialog.getByRole("option", { name, exact: true });

  await test.step("↓ opens it on the chosen option", async () => {
    await expect(tracking).toHaveText("Weight & reps");
    await tracking.focus();
    await page.keyboard.press("ArrowDown");
    await expect(option("Weight & reps")).toBeFocused();
  });

  await test.step("the keys move between options without choosing", async () => {
    await page.keyboard.press("ArrowDown");
    await expect(option("Bodyweight reps")).toBeFocused();
    await page.keyboard.press("End");
    await expect(option("Reps only")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(option("Weight & reps")).toBeFocused();
    await page.keyboard.press("d");
    await expect(option("Duration / hold")).toBeFocused();
    await expect(tracking).toHaveText("Weight & reps");
  });

  await test.step("Enter picks, and focus goes back to the dropdown", async () => {
    await page.keyboard.press("Enter");
    await expect(tracking).toHaveText("Duration / hold");
    await expect(tracking).toBeFocused();
  });

  await test.step("Escape closes it without picking, and leaves the library open", async () => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(library.dialog.getByRole("listbox")).toBeHidden();
    await expect(tracking).toHaveText("Duration / hold");
    await expect(library.dialog).toBeVisible();
  });
});

test("the nudge menu is a menu button: Enter or ↓ opens it, the arrows move, Enter acts, Escape closes", async ({
  app,
  page,
}) => {
  const { shell } = app;
  await app.launch(at("10:00"), { program });

  await test.step("Enter opens it on its first item; Escape closes it and gives focus back", async () => {
    await shell.nudgeMenu.focus();
    await page.keyboard.press("Enter");
    await expect(shell.menuItem("Pause nudges")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(shell.topBar.getByRole("menu")).toBeHidden();
    await expect(shell.nudgeMenu).toBeFocused();
    await expect(shell.nudgeMenu).toHaveText("Pause");
  });

  await test.step("↓ opens it, the arrows move, and Enter acts and closes it", async () => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(shell.menuItem("Skip today")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(shell.topBar.getByRole("menu")).toBeHidden();
    await expect(shell.nudgeMenu).toHaveText("Skipped");
    await expect(shell.nudgeMenu).toBeFocused();
  });
});

test("every stepper button and row button says what it acts on", async ({ app }) => {
  const { shell, today, settings } = app;
  await app.launch(at("10:00"), { program });

  await expect(today.rowButton(dumbbellBench.name, "Start")).toBeVisible();
  await expect(today.rowButton(curl.name, "Skip")).toBeVisible();
  await shell.button("Settings").click();
  const interval = settings.row("Interval");
  await expect(interval.getByRole("button", { name: "Decrease interval" })).toBeVisible();
  await expect(interval.getByRole("button", { name: "Increase interval" })).toBeVisible();
});
