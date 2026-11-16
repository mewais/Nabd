use std::fs;

/// The app's version is written twice — `package.json` (which `tauri.conf.json`
/// reads) and this workspace's `Cargo.toml` — and Cargo cannot read the former,
/// so the build refuses to go on when the two differ.
fn assert_versions_agree() {
    const PACKAGE_JSON: &str = "../package.json";
    println!("cargo:rerun-if-changed={PACKAGE_JSON}");
    let manifest = fs::read_to_string(PACKAGE_JSON).expect("package.json is readable");
    let manifest: serde_json::Value =
        serde_json::from_str(&manifest).expect("package.json is JSON");
    let cargo = env!("CARGO_PKG_VERSION");
    let package = manifest["version"]
        .as_str()
        .expect("package.json has a version");
    assert_eq!(
        cargo, package,
        "src-tauri/Cargo.toml says version {cargo} but package.json says {package}: make them the same"
    );
}

/// The window's title is the page's: `<title>` in the frontend's index.html,
/// handed to the binary as `NABD_WINDOW_TITLE`.
fn export_window_title() {
    const INDEX_HTML: &str = "../packages/app/index.html";
    println!("cargo:rerun-if-changed={INDEX_HTML}");
    let page = fs::read_to_string(INDEX_HTML).expect("index.html is readable");
    let title = page
        .split_once("<title>")
        .and_then(|(_, rest)| rest.split_once("</title>"))
        .map(|(title, _)| title.trim())
        .expect("index.html has a <title>");
    println!("cargo:rustc-env=NABD_WINDOW_TITLE={title}");
}

fn main() {
    assert_versions_agree();
    export_window_title();
    tauri_build::build();
}
