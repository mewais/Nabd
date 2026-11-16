import { createRoot } from "react-dom/client";
import { isTauri, tauriClient } from "@nabd/ipc-client";
import { createNabdStore } from "@nabd/store";
import { App } from "./app";
import { createDemoClient } from "./demo";

// Under Tauri the real backend; in a plain browser an in-memory seeded one, so
// the UI can be run and inspected without the native shell.
const client = isTauri() ? tauriClient() : createDemoClient();

const store = createNabdStore({
  client,
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
});

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root element");
createRoot(root).render(<App store={store} client={client} />);
