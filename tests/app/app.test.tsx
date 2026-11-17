import { nov } from "../support/builders";
import { createMemoryBackend } from "@nabd/ipc-client";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { BootSnapshot, TrayAction } from "@nabd/ipc-client";
import { App } from "@nabd/app/app";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createNabdStore } from "@nabd/store";
import { createDemoClient } from "@nabd/app/demo";
import { DEMO_PROGRAM } from "@nabd/app/demo-data";

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

describe("App before and after loading", () => {
  it("shows no screen until what is stored has been read", async () => {
    const { client } = createMemoryBackend({ program: DEMO_PROGRAM });
    let finishLoading = (): void => {};
    const loaded = new Promise<void>((resolve) => {
      finishLoading = resolve;
    });
    const { loadAll } = client;
    client.loadAll = async (): Promise<BootSnapshot> => {
      await loaded;
      return loadAll();
    };
    const store = createNabdStore({ client, now: () => new Date(), newId: () => "id" });
    render(<App store={store} client={client} />);

    // The shell is there; a Today drawn from the empty state would claim there is no plan.
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.queryByText("No plan yet")).toBeNull();
    expect(screen.getByRole("main")).toBeEmptyDOMElement();

    await act(async () => finishLoading());
    expect(await screen.findByText(`of ${FIRST_DAY_SETS} sets`)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Barbell Bench Press");
  });
});

describe("App asks before deleting", () => {
  it("a day is only deleted once the question is answered with yes", async () => {
    const store = await renderApp();
    fireEvent.click(navButton("Plan"));
    const days = (): number => store.getState().program.days.length;

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    const question = screen.getByRole("dialog", { name: "Delete Push?" });
    expect(days()).toBe(DEMO_PROGRAM.days.length);
    fireEvent.click(within(question).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(days()).toBe(DEMO_PROGRAM.days.length);

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Delete Push?" })).getByRole("button", {
        name: "Delete day",
      }),
    );
    expect(days()).toBe(DEMO_PROGRAM.days.length - 1);
    expect(screen.getByLabelText("Day name")).toHaveValue("Pull");
  });
});

describe("App tells the desktop about a waiting nudge", () => {
  /** The app on a Monday morning, on a clock the test moves, with the window out of focus or in it. */
  async function renderAt(focused: boolean) {
    const { client } = createMemoryBackend({ program: DEMO_PROGRAM, settings: DEFAULT_SETTINGS });
    const notifyNudge = vi.spyOn(client, "notifyNudge");
    vi.spyOn(document, "hasFocus").mockReturnValue(focused);
    const clock = { now: nov(16, 9) };
    const store = createNabdStore({ client, now: () => clock.now, newId: () => "id" });
    render(<App store={store} client={client} />);
    await screen.findByText(`of ${FIRST_DAY_SETS} sets`);
    const advanceTo = (at: Date): void =>
      act(() => {
        clock.now = at;
        store.getState().tick(0, true);
      });
    return { notifyNudge, advanceTo };
  }

  it("once when it fires, then once per interval for as long as it is ignored", async () => {
    const { notifyNudge, advanceTo } = await renderAt(false);
    advanceTo(nov(16, 9, 49));
    expect(notifyNudge).not.toHaveBeenCalled();
    advanceTo(nov(16, 9, 50));
    expect(notifyNudge).toHaveBeenCalledTimes(1);
    expect(notifyNudge).toHaveBeenLastCalledWith({
      title: "Time to move",
      body: "Barbell Bench Press — Interval's up",
    });

    advanceTo(nov(16, 10, 39));
    expect(notifyNudge).toHaveBeenCalledTimes(1);
    advanceTo(nov(16, 10, 40));
    expect(notifyNudge).toHaveBeenCalledTimes(2);
    advanceTo(nov(16, 11, 30));
    expect(notifyNudge).toHaveBeenCalledTimes(3);
    // In the window there is still the one toast.
    expect(screen.getAllByText("Time to move")).toHaveLength(1);
  });

  it("never while the window, which shows the toast, has the focus", async () => {
    const { notifyNudge, advanceTo } = await renderAt(true);
    advanceTo(nov(16, 9, 50));
    advanceTo(nov(16, 10, 40));
    expect(screen.getByText("Time to move")).toBeInTheDocument();
    expect(notifyNudge).not.toHaveBeenCalled();
  });
});

describe("App follows the tray menu", () => {
  it("Quit saves what is still waiting to be saved, then exits", async () => {
    const { client } = createMemoryBackend({ program: DEMO_PROGRAM, settings: DEFAULT_SETTINGS });
    let chooseFromTray = (_action: TrayAction): void => {};
    client.onTrayAction = async (handler) => {
      chooseFromTray = handler;
      return () => {};
    };
    const quit = vi.spyOn(client, "quit");
    const appendSet = vi.spyOn(client, "appendSet").mockRejectedValueOnce(new Error("disk full"));
    const store = createNabdStore({ client, now: () => nov(16, 9), newId: () => "id" });
    render(<App store={store} client={client} />);
    await screen.findByText(`of ${FIRST_DAY_SETS} sets`);

    await act(async () => {
      store.getState().openSession();
      await store.getState().logSet();
    });
    expect(store.getState().unsavedSets).toEqual(["id"]);

    await act(async () => chooseFromTray("quit"));
    await vi.waitFor(() => expect(quit).toHaveBeenCalledTimes(1));
    expect(appendSet).toHaveBeenCalledTimes(2);
    expect(store.getState().unsavedSets).toEqual([]);
  });
});
