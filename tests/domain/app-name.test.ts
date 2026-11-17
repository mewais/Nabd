import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_NAME } from "@nabd/domain";

describe("APP_NAME", () => {
  it("is the product name the Tauri app is configured with, which Rust stamps into exports", () => {
    const config = JSON.parse(
      readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
    );
    expect(config.productName).toBe(APP_NAME);
  });
});
