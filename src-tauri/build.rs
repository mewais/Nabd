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

fn main() {
    assert_versions_agree();
    tauri_build::build();
}
