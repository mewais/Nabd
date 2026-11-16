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
  const invoke = (window as never as { __TAURI_INTERNALS__: { invoke: (c: string, a?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__.invoke;
  const log = (message: string): void => void invoke("debug_log", { message });
  const tryCall = (name: string, call: () => Promise<unknown>): Promise<void> =>
    call().then((r) => log(`${name} -> ok ${JSON.stringify(r)}`), (e) => log(`${name} -> ERR ${String(e)}`));
  document.addEventListener("securitypolicyviolation", (e) => log(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
  window.addEventListener("error", (e) => log(`error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) => log(`rejection: ${String(e.reason)}`));
  store.subscribe((s, prev) => {
    if (s.now !== prev.now) log(`tick idle=${s.idleSeconds} caps=${JSON.stringify(s.capabilities)} notice=${s.appNotice?.text ?? "-"} focus=${document.hasFocus()} hidden=${document.hidden}`);
  });
  setTimeout(() => {
    void (async () => {
      await tryCall("export#1", () => client.exportData());
      await tryCall("export#2", () => client.exportData());
      await tryCall("autostart", () => client.setAutostart(true));
      await tryCall("glass", () => client.setGlass(true));
      await tryCall("tray", () => client.updateTray({ nextExercise: "Bench", done: -1, total: 6.2, paused: true }));
      await tryCall("saveMany", () => client.saveMany({ rotationState: { smoke: 1 }, dayLog: [] }));
      await tryCall("badKey", () => invoke("save_singleton", { key: "nope", value: "1" }));
      await tryCall("testNotification", () => client.sendTestNotification());
    })();
  }, 2000);
  setTimeout(() => void tryCall("notify", () => client.notify("timer", "Bench")), 7000);
}
