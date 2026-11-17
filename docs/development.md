# Development

## Prerequisites

Node ≥ 20 with pnpm (the version in `package.json`'s `packageManager`; `corepack enable`
provides it) and stable Rust (`rustup`), plus per platform:

- **Linux** (Debian/Ubuntu names):

  ```bash
  sudo apt install build-essential curl wget file pkg-config libssl-dev \
    libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
  ```

  `rpm` as well if you build the `.rpm` bundle. At run time the app needs
  `libwebkit2gtk-4.1-0` (WebKitGTK 2.40 or later), `libgtk-3-0` and
  `libayatana-appindicator3-1`; the `.deb`/`.rpm` bundles declare them.

- **Windows 10/11**: the Microsoft C++ Build Tools ("Desktop development with C++"
  workload) and the WebView2 runtime, version 111 or later — part of Windows 11,
  installed by the Nabd installer on Windows 10 if it is missing, and kept up to date
  by Windows.

- **macOS 11 (Big Sur) or later**, with Safari 16.2 or later: the Xcode command line
  tools (`xcode-select --install`), and both Rust targets for the universal binary CI
  builds (`rustup target add aarch64-apple-darwin x86_64-apple-darwin`, then
  `pnpm tauri build --target universal-apple-darwin`). The WebView is the system's
  WKWebView: built into macOS 13.1 and later at the version the app needs, and brought
  up to it on macOS 11 and 12 by Safari's own updates (Software Update).

The minimum web views are what the UI needs: every tint and shade is mixed with
`color-mix()` in OKLCH, and the app uses `structuredClone`, `crypto.randomUUID` and
`Array.prototype.at` — all there from Safari 16.2, Chromium 111 (WebView2) and
WebKitGTK 2.40. There are no fallbacks for older engines; the bundles declare the
macOS minimum (`bundle.macOS.minimumSystemVersion`), and a supported Linux distribution
gets WebKitGTK 2.40 or later through its updates (Ubuntu 22.04, Debian 12 and Fedora 38
on).

## Quick start

```bash
pnpm install
pnpm tauri dev          # the desktop app (needs a desktop session + webkit2gtk-4.1 on Linux)
pnpm dev                # just the UI in a browser, on an in-memory sample plan (http://localhost:1420)
pnpm tauri build        # production bundle
```

## Checks

```bash
pnpm test               # TypeScript suites (Vitest); one package: pnpm --filter @nabd/nudge test
pnpm test:rust          # Rust crates
pnpm typecheck          # packages and tests, one strict tsconfig
pnpm lint               # ESLint + Prettier
pnpm lint:rust          # rustfmt + clippy, over the whole Cargo workspace
pnpm check              # all of the above
pnpm check:windows      # from Linux: clippy, a full build and the Rust crates' tests for Windows
pnpm lint:sh            # shellcheck over the smoke test's shell scripts
```

`pnpm check:windows` cross-compiles for `x86_64-pc-windows-gnu` (`rustup target add
x86_64-pc-windows-gnu`, apt `mingw-w64`) and runs the crates' tests under Wine (apt `wine`):
clippy with `-D warnings`, `nabd.exe` built in full, and the persistence, native and ipc
suites. Under Wine the built `nabd.exe` gets as far as opening its database (schema version
3, in `%APPDATA%\com.mewais.nabd`, given a display: `xvfb-run`) and then waits for a WebView2
runtime Wine does not have; what is on screen is left to the Windows smoke test
([smoke-test.md](smoke-test.md)).

Besides the usual rules, ESLint enforces four things about this code base
(`eslint.config.js`, `scripts/eslint/`, with their own tests in `tests/scripts/`):

- the dependency direction between packages described in [architecture.md](architecture.md), and
  that a package — or a test — reaches another only through its entry point
  `@nabd/<name>`, never a file inside it, by alias or by relative path (a plain-data
  JSON file the package publishes in its `exports` aside); the end-to-end
  specs may use only what does not draw (`scripts/eslint/layers.js`);
- one import style: types come in their own `import type { … }` statement, and a module
  is imported once per kind;
- that styling stays in the design system (`scripts/eslint/styling.js`). Outside it
  there is no `style` attribute (nor one passed in a spread); no colour spelled out
  (`var(--…)`, `color-mix(…)`, hex, `rgb(…)`, `oklch(…)`, or a word such as `"red"` for a
  colour property or attribute); no CSS length, track list or function in a string
  (`"8px"`, `"1fr"`, `"minmax(…)"`); no number or string for a size, spacing, radius,
  weight or position of a style property, however its key is written; no number for a
  sizing attribute (`size={14}`, `width={540}`); and no raw `<button>`, `<input>`,
  `<select>` or `<textarea>`, nor any other element made clickable with `onClick`.
- that a component writes no words of its own (`scripts/eslint/wording.js`): in the
  packages that draw (the design system, the body map, the screens) no JSX text, and no
  string given to a prop that labels (`title`, `ariaLabel`, `placeholder`, `hint`…), has a
  letter in it — the words come from the package's `wording.ts` or its view-model.

A genuine one-off is disabled on its line, with the reason.

The app's version is written in `package.json` (which `tauri.conf.json` and the UI
read) and in `src-tauri/Cargo.toml`; `src-tauri/build.rs` refuses to build when the
two differ. The same build script takes the window's title from the page's `<title>`,
and the window's background before the page has painted from the design system's
`prepaint.json` — the dark theme's background, which the theme, the page's own prepaint
(Vite, through `@nabd/design-system/prepaint.json`) and the build script all read.

## End-to-end tests

```bash
pnpm exec playwright install chromium   # once: the browser Playwright drives
pnpm e2e                                # build, serve with `vite preview`, run every spec headless
pnpm e2e specs/03-suggestions.spec.ts   # one spec; any `playwright test` argument can follow
```

`e2e/` holds Playwright specs that use the whole UI the way a person does — build a plan
in the planner, get nudged, log sets, change settings, read Progress — in a browser, on
the in-memory backend of `pnpm dev`. Two things make them deterministic:

- **the clock** is Playwright's fake one, installed before the page loads and frozen:
  time passes only when a spec says so, either with nobody at the keyboard
  (`app.idleFor`) or with the mouse moving in the window (`app.busyFor`) — in a browser
  the app takes its idle time from activity inside the page;
- **the data** a spec starts from is handed to the demo backend through
  `window.__NABD_E2E_SNAPSHOT__` (`packages/app/src/demo.ts`), the one seam the tests
  have. It is read only where the demo backend is built, which the desktop app never does.

`e2e/support/` has the fixture (`app`), one page object per screen and modal (each a
`ScreenObject` or a `DialogObject`, `pages/region.ts`), and the plans and history the
specs start from — built with the unit suites' fixture kit (`tests/support/builders.ts`
and the catalog ids of `tests/support/exercises.ts`), so an exercise or a prescription
means the same in both. `e2e/base.config.ts` is what the specs and the screenshot capture
share: the browser, and the served build it drives. The browser runs in a non-UTC time
zone so "today" is tested as the user's calendar day. Page objects find things the way a person does — by
role and name — never by style. A spec marked `test.fail` documents designed behaviour
the app does not have yet: it starts failing the day the app is fixed, and the mark comes
off. No spec is marked at present.

## Screenshots and icons

`pnpm visual` (`e2e/visual/`) photographs every screen, modal and overlay state in both
themes, on the e2e fixture and its fake clock, into `e2e/visual/shots/` (`OUT=<dir>` for
elsewhere, `URL=<app>` for an app already being served) — for comparing two builds by
eye; `pnpm e2e` does not run it. Its pictures are scratch output: `e2e/visual/shots/` is
not committed.

`pnpm screenshots` takes the pictures the README shows (`e2e/visual/readme.spec.ts`) into
`docs/screenshots/`: a Push / Pull / Legs plan two and a half weeks in, at the desktop
window's size (1280 × 820) and twice its pixel density, on the same fixture and fake clock,
so two runs of one build give the same pictures. Run it when a screen's look changes, view
the PNGs, and commit them with the change (`OUT=<dir>` writes them elsewhere instead).

The same capture, as its own project
(`pnpm exec playwright test --config e2e/visual --project icon`), renders the app icon's
source image (`src-tauri/icons/source.png`) from the in-app logo. To regenerate the icons
after a theme or logo change:

```bash
pnpm exec playwright test --config e2e/visual --project icon
pnpm tauri icon src-tauri/icons/source.png -o <scratch dir>
# keep only what tauri.conf.json lists (32x32.png, 128x128.png, 128x128@2x.png, icon.icns,
# icon.ico): copy those into src-tauri/icons/ and drop the mobile sets. tray-template.png is
# drawn by hand and stays.
```

## Cutting a release

`.github/workflows/release.yml` builds the installers on Linux, Windows and macOS when a
tag `v<version>` is pushed — with the same setup and bundle steps as CI
(`.github/actions/setup`, `.github/actions/bundle`) — and attaches them to a draft
GitHub Release for that tag. It fails before building when the tag is not `v` followed
by `package.json`'s version. It does not run the checks again, so tag a commit CI passed
on.

1. Bump the version in `package.json` and in `src-tauri/Cargo.toml`'s `[workspace.package]`
   (the build refuses to run while they differ; `cargo check --manifest-path src-tauri/Cargo.toml` brings
   `Cargo.lock` along), and merge that to `main`.
2. Tag the merged commit and push the tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Wait for the Release workflow, then open the draft under Releases: check that the
   `.deb`, `.rpm`, `.exe`, `.msi` and `.dmg` are attached, and edit the generated notes.
4. Publish it. The README's download link (`releases/latest`) points at it from then on.

The builds are unsigned (no signing identity or certificate is configured), so Windows
SmartScreen and macOS Gatekeeper warn on first launch. To run the workflow again for the
same tag, delete its draft first.
