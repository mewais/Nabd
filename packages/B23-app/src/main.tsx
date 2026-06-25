import React from "react";
import { createRoot } from "react-dom/client";
import { createNabdStore } from "@nabd/store";
import { defaultClient } from "@nabd/ipc-client";
import { defaultLibrary } from "@nabd/dataset";
import { App } from "./App";

const client = defaultClient();

const store = createNabdStore({
  client,
  library: defaultLibrary(),
  now: () => new Date(),
  newId: () => "i" + Math.random().toString(36).slice(2, 9),
});

const rootEl = document.getElementById("root")!;
const root = createRoot(rootEl);
root.render(React.createElement(App, { store, client }));
