use std::fs;

/// A JSON file of the frontend, which the build follows: it reruns when the file changes.
fn read_json(path: &str) -> serde_json::Value {
    println!("cargo:rerun-if-changed={path}");
    let text = fs::read_to_string(path).unwrap_or_else(|e| panic!("{path} is not readable: {e}"));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("{path} is not JSON: {e}"))
}

/// The app's version is written twice — `package.json` (which `tauri.conf.json`
/// reads) and this workspace's `Cargo.toml` — and Cargo cannot read the former,
/// so the build refuses to go on when the two differ.
fn assert_versions_agree() {
    let manifest = read_json("../package.json");
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

/// The window's background before the page has painted is the dark theme's,
/// which the design system writes in its `prepaint.json` as an OKLCH colour:
/// here it is written out as the sRGB the window API takes, in `background.rs`
/// (see window.rs).
fn export_window_background() {
    let prepaint = read_json("../packages/design-system/prepaint.json");
    let lch: Vec<f64> = prepaint["background"]
        .as_str()
        .and_then(|colour| colour.strip_prefix("oklch(")?.strip_suffix(')'))
        .map(|args| {
            args.split_whitespace()
                .map(|n| n.parse().expect("a number"))
                .collect()
        })
        .expect("prepaint.json has a background, an oklch() colour");
    let [lightness, chroma, hue] = lch[..] else {
        panic!("the prepaint background is oklch(L C H)");
    };
    let [r, g, b] = srgb_of_oklch(lightness, chroma, hue);
    let out = std::path::Path::new(&std::env::var("OUT_DIR").expect("cargo sets OUT_DIR"))
        .join("background.rs");
    let source = format!("tauri::window::Color({r}, {g}, {b}, 0xff)\n");
    fs::write(out, source).expect("OUT_DIR is writable");
}

/// An OKLCH colour as 8-bit sRGB (Björn Ottosson's OKLab matrices).
fn srgb_of_oklch(lightness: f64, chroma: f64, hue: f64) -> [u8; 3] {
    let (a, b) = (
        chroma * hue.to_radians().cos(),
        chroma * hue.to_radians().sin(),
    );
    let l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b).powi(3);
    let m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b).powi(3);
    let s = (lightness - 0.089_484_177_5 * a - 1.291_485_548_0 * b).powi(3);
    let linear = [
        4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
        -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
        -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701_0 * s,
    ];
    linear.map(|c| {
        let encoded = if c <= 0.003_130_8 {
            12.92 * c
        } else {
            1.055 * c.powf(1.0 / 2.4) - 0.055
        };
        (encoded.clamp(0.0, 1.0) * 255.0).round() as u8
    })
}

fn main() {
    assert_versions_agree();
    export_window_title();
    export_window_background();
    tauri_build::build();
}
