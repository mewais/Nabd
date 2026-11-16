import { createRoot } from "react-dom/client";
import { isTauri, tauriClient } from "@nabd/ipc-client";
import { createNabdStore } from "@nabd/store";
import { App } from "./App";
import { createDemoClient } from "./demo";

// Under Tauri the real backend; in a plain browser an in-memory seeded one, so
// the UI can be run and inspected without the native shell.
const client = isTauri() ? tauriClient() : createDemoClient();

const store = createNabdStore({
  client,
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
});

createRoot(document.getElementById("root")!).render(<App store={store} client={client} />);
