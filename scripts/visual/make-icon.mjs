// Renders the app icon's source image from the in-app brand mark, so the icon
// and the logo in the sidebar are one drawing. `pnpm tauri icon` then derives
// the full icon set from it.
//
//   pnpm build
//   pnpm --filter @nabd/app exec vite preview --port 4399   (leave running; second terminal:)
//   node scripts/visual/make-icon.mjs                       → src-tauri/icons/source.png
//   pnpm tauri icon src-tauri/icons/source.png

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const APP_URL = process.env.URL ?? "http://localhost:4399";
const OUT = fileURLToPath(new URL("../../src-tauri/icons/source.png", import.meta.url));
const ICON_SIZE = 1024;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(APP_URL, { waitUntil: "networkidle" });
const mark = page.getByRole("img", { name: "Nabd" });
const { width } = await mark.boundingBox();
await page.close();

// The same page again, magnified so that the mark is exactly the icon's size.
const magnified = await browser.newPage({ deviceScaleFactor: ICON_SIZE / width });
await magnified.goto(APP_URL, { waitUntil: "networkidle" });
await magnified.getByRole("img", { name: "Nabd" }).screenshot({ path: OUT, omitBackground: true });
await browser.close();
console.log(`Wrote ${OUT}`);
