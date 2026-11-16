import { fireEvent, render, screen, within } from "@testing-library/react";
import { createNabdStore } from "@nabd/store";
import { App } from "../../packages/app/src/app";
import { createDemoClient } from "../../packages/app/src/demo";
import { DEMO_PROGRAM } from "../../packages/app/src/demo-data";

/** The demo opens on the first day of its floating plan. */
const FIRST_DAY_SETS = (DEMO_PROGRAM.days[0]?.exercises ?? []).reduce(
  (sets, row) => sets + row.sets.length,
  0,
);

/** The whole app over the in-memory demo backend, once it has loaded. */
async function renderApp() {
  const client = createDemoClient();
  let ids = 0;
  const store = createNabdStore({ client, now: () => new Date(), newId: () => `id-${++ids}` });
  render(<App store={store} client={client} />);
  await screen.findByText(`of ${FIRST_DAY_SETS} sets`);
  return store;
}

const navButton = (name: string): HTMLElement =>
  within(screen.getByRole("navigation")).getByRole("button", { name });

describe("App over the demo backend", () => {
  it("boots into Today with the demo plan's sets to do", async () => {
    await renderApp();
    expect(navButton("Today")).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByText("Barbell Bench Press").length).toBeGreaterThan(0);
  });

  it("switches screens from the sidebar", async () => {
    const store = await renderApp();
    fireEvent.click(navButton("Plan"));
    expect(store.getState().screen).toBe("planner");
    expect(navButton("Plan")).toHaveAttribute("aria-current", "page");
    expect(navButton("Today")).not.toHaveAttribute("aria-current");
  });

  it("pauses nudges from the top bar, which then offers Resume", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(await screen.findByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getAllByText("Nudges paused").length).toBeGreaterThan(0);
  });

  it("offers Glass, which the demo supports, and applies it", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Glass" }));
    expect(await screen.findByRole("button", { name: "Glass", pressed: true })).toBeInTheDocument();
    expect(document.querySelector("[data-theme]")).toHaveAttribute("data-glass", "on");
  });
});
