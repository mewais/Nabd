// The app icon's source image, rendered from the in-app brand mark, so the icon
// and the logo in the sidebar are one drawing. Not part of `pnpm visual`: run it
// on its own, then let Tauri derive the icon set from it.
//
//   pnpm exec playwright test --config e2e/visual --project icon   → src-tauri/icons/source.png
//   pnpm tauri icon src-tauri/icons/source.png

import { expect, test } from "@playwright/test";
import { APP_NAME } from "@nabd/domain";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../../src-tauri/icons/source.png", import.meta.url));
/** The side of the source image, in px. */
const ICON_SIZE = 1024;

test("app icon", async ({ browser, baseURL }) => {
  const page = await browser.newPage({ baseURL });
  await page.goto("/");
  const box = await page.getByRole("img", { name: APP_NAME }).boundingBox();
  expect(box).not.toBeNull();
  await page.close();

  // The same page again, magnified so that the mark is exactly the icon's size, cut out at
  // its own box (which need not sit on whole pixels).
  const magnified = await browser.newPage({ baseURL, deviceScaleFactor: ICON_SIZE / box!.width });
  await magnified.goto("/");
  // Whatever the mark sits on is left out, so the tile's rounded corners stay see-through.
  const behind = `html, *:has([aria-label="${APP_NAME}"]) { background: transparent !important; }`;
  await magnified.screenshot({ path: OUT, clip: box!, omitBackground: true, style: behind });
  await magnified.close();
});
