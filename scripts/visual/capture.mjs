import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP_URL = process.env.URL || "http://localhost:4399";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const drive = async (page, fn, arg) => {
  await page.evaluate(fn, arg);
  await page.waitForTimeout(350);
};
const shot = (page, name, full = false) =>
  page.screenshot({ path: OUT + name + ".png", fullPage: full });

const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERR:", e.message));
await page.goto(APP_URL, { waitUntil: "networkidle" });
// wait for store + hydrate
await page.waitForFunction(() => !!window.__nabdStore && window.__nabdStore.getState().booted, null, {
  timeout: 15000,
});
await page.waitForTimeout(500);

const setTheme = (t, glass, wp = "aurora") =>
  drive(page, ([t, glass, wp]) => {
    const s = window.__nabdStore.getState();
    s.setTheme(t);
    if (s.setScreen) {/*noop*/}
    const cur = window.__nabdStore.getState().settings.glass;
    if (cur !== glass) window.__nabdStore.getState().toggleGlass();
    if (glass) window.__nabdStore.getState().setWallpaper(wp);
  }, [t, glass, wp]);

const screen = (name) => drive(page, (n) => window.__nabdStore.getState().setScreen(n), name);

// ---- screens across theme/glass ----
for (const [t, glass, tag] of [
  ["dark", false, "dark"],
  ["light", false, "light"],
  ["dark", true, "darkglass"],
  ["light", true, "lightglass"],
]) {
  await setTheme(t, glass);
  for (const sc of ["today", "planner", "progress"]) {
    await screen(sc);
    await shot(page, `${sc}-${tag}`);
  }
}

// ---- modals (dark solid) ----
await setTheme("dark", false);
await screen("today");
await drive(page, () => window.__nabdStore.getState().startNext());
await shot(page, "modal-session");
await drive(page, () => window.__nabdStore.getState().closeActive());
await drive(page, () => window.__nabdStore.getState().openSettings());
await shot(page, "modal-settings");
await drive(page, () => {
  const s = window.__nabdStore.getState();
  s.setTheme("dark");
  if (!s.settings.glass) s.toggleGlass();
});
await shot(page, "modal-settings-glass");
await drive(page, () => window.__nabdStore.getState().closeSettings());
await drive(page, () => {
  const s = window.__nabdStore.getState();
  if (s.settings.glass) s.toggleGlass();
});
await screen("planner");
await drive(page, () => {
  const s = window.__nabdStore.getState();
  s.libOpen({ kind: "ex", dayId: s.program.days[0].id });
});
await shot(page, "modal-library");
await drive(page, () => window.__nabdStore.getState().libClose());
await screen("progress");
await drive(page, () => window.__nabdStore.getState().openProgChart(0));
await shot(page, "modal-chart");

// ---- fluid resize check (wide + narrow) ----
await screen("today");
await drive(page, () => window.__nabdStore.getState().closeProgChart());
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(300);
await shot(page, "today-wide");
await page.setViewportSize({ width: 820, height: 760 });
await page.waitForTimeout(300);
await shot(page, "today-narrow");

await b.close();
console.log("CAPTURE DONE");
