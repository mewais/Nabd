import React from "react";
import { createRoot } from "react-dom/client";
import { createNabdStore } from "@nabd/store";
import { defaultClient, isTauri } from "@nabd/ipc-client";
import { defaultLibrary } from "@nabd/dataset";
import { App } from "./App";
import { createDemoClient } from "./demo";

// Under Tauri use the real IPC client; in a plain browser (visual testing / web
// demo) use an in-memory seeded client so every screen renders populated.
const client = isTauri() ? defaultClient() : createDemoClient();

const store = createNabdStore({
  client,
  library: defaultLibrary(),
  now: () => new Date(),
  newId: () => "i" + Math.random().toString(36).slice(2, 9),
});

// Expose the store for local visual inspection (no effect under Tauri usage).
(globalThis as unknown as { __nabdStore?: unknown }).__nabdStore = store;

const rootEl = document.getElementById("root")!;
const root = createRoot(rootEl);
root.render(React.createElement(App, { store, client }));
