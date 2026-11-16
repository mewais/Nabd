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

// TEMP-SMOKE
if (isTauri()) {
  const log = (message: string): void =>
    void (window as never as { __TAURI_INTERNALS__: { invoke: (c: string, a: unknown) => Promise<void> } }).__TAURI_INTERNALS__.invoke("debug_log", { message });
  document.addEventListener("securitypolicyviolation", (e) =>
    log(`CSP violation: ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}`),
  );
  window.addEventListener("error", (e) => log(`error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) => log(`rejection: ${String(e.reason)}`));
  void client.platformCapabilities().then((c) => log(`capabilities ${JSON.stringify(c)}`));
  store.subscribe((s, prev) => {
    if (s.now !== prev.now) log(`tick now=${s.now.toISOString()} idle=${s.idleSeconds} booted=${s.booted} fonts=${document.fonts.size} bg=${getComputedStyle(document.querySelector("[data-theme]") ?? document.body).backgroundColor}`);
  });
}
