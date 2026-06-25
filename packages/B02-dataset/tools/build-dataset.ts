/**
 * tools/build-dataset.ts
 *
 * Offline runner: reads data/source/free-exercise-db.json, runs buildDataset
 * (with the handoff seed), validates every entry, and writes
 * data/exercises.json.
 *
 * Run with: npx tsx tools/build-dataset.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildDataset, seed } from "../src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = join(__dirname, "..");

const rawPath = join(pkg, "data", "source", "free-exercise-db.json");
const outPath = join(pkg, "data", "exercises.json");

const rawFreeDb: unknown = JSON.parse(readFileSync(rawPath, "utf-8"));

const result = buildDataset(rawFreeDb, seed());

writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");

console.log(`Written ${result.length} exercises to data/exercises.json`);
