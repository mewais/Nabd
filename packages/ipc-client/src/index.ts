// @nabd/ipc-client — the typed boundary to the native backend: the client
// interface, its Tauri implementation, and an in-memory one for the browser
// demo and the tests.

export type { BootSnapshot, IpcClient, Singletons, Tick, TrayAction } from "./client";
export { createIpcClient, isTauri, tauriClient } from "./tauri-client";
export type { Invoke, Listen } from "./tauri-client";
export { createMemoryBackend } from "./memory-backend";
export type { MemoryBackend } from "./memory-backend";
