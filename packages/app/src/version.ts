// The app's version has one source: the workspace manifest, which the Tauri
// config reads too (and the Rust build checks Cargo.toml against).
export { version as APP_VERSION } from "../../../package.json";
