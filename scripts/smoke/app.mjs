// The app under test, on any desktop: who it is, where it keeps its data and
// its login entry, its database, and its processes. Shared by every platform's
// smoke test (checks.mjs and the entry scripts); linux-smoke.sh reaches the
// database and the login entry through the command line at the bottom.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

/** A file of the smoke kit (this folder), by its path from here. */
export const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const repo = (file) => here(`../../${file}`);
const config = JSON.parse(readFileSync(repo("src-tauri/tauri.conf.json"), "utf8"));

/** The bundle identifier: the name of the app's data folder on every platform. */
export const APP_ID = config.identifier;
/** The product name: the name of the login entry on every platform. */
export const PRODUCT_NAME = config.productName;
/** The value `pattern` captures in a Rust source file: the smoke test keeps no copy of its own. */
const rustValue = (file, pattern) =>
  pattern.exec(readFileSync(repo(`src-tauri/${file}`), "utf8"))[1];

/** The schema version the persistence crate writes today. */
export const SCHEMA_VERSION = Number(
  rustValue("crates/persistence/src/schema.rs", /SCHEMA_VERSION: i64 = (\d+);/),
);
/** What the login entry adds to the command line, so a login launch can be told apart. */
export const AUTOSTART_ARG = rustValue(
  "crates/native/src/launch.rs",
  /AUTOSTART_ARG: &str = "(.+)";/,
);
/** How long a quit waits for the window to save before the app exits regardless. */
export const QUIT_GRACE_MS =
  1000 * Number(rustValue("src/tray.rs", /QUIT_GRACE: Duration = Duration::from_secs\((\d+)\);/));

/** Today's date as the app writes it: the local calendar day. */
export function localDate(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------- failure ---

/** An expectation that was not met: what was expected, and what was found instead. */
export class SmokeFailure extends Error {
  constructor(expectation, found) {
    super(found === undefined ? expectation : `${expectation}\n  found: ${found}`);
  }
}

/** Fail with `expectation` unless `actual` equals `expected` (compared as JSON). */
export function expectEqual(expectation, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new SmokeFailure(
      `${expectation}: expected ${JSON.stringify(expected)}`,
      JSON.stringify(actual),
    );
  }
}

/**
 * Poll `check` until it returns something truthy, and return that. A check
 * that throws has not come true yet. Fail with `expectation` if it never
 * does, saying what `found()` (or the last error) says was there instead.
 */
export async function eventually(expectation, check, { timeoutMs = 15_000, found } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let last;
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      last = error.message;
    }
    if (Date.now() > deadline) {
      let instead = last;
      try {
        instead = (await found?.()) ?? last;
      } catch (error) {
        instead = error.message;
      }
      throw new SmokeFailure(`${expectation} (waited ${timeoutMs / 1000} s)`, instead);
    }
    await sleep(250);
  }
}

// ------------------------------------------------------------ data paths ---

/** Where Tauri's `app_data_dir` is on this platform (the `dirs` crate's data dir, plus the identifier). */
export function dataDir() {
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA, APP_ID);
    case "darwin":
      return join(homedir(), "Library", "Application Support", APP_ID);
    default:
      return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), APP_ID);
  }
}

export const databasePath = () => join(dataDir(), "nabd.sqlite");

// ------------------------------------------------------------- the build ---

/**
 * The build product at `path` (relative to the Cargo target directory's
 * release folder): NABD_SMOKE_BINARY when it names one, else built now with
 * `pnpm tauri build` and `buildArgs`.
 */
export function builtBinary(path, buildArgs = ["--no-bundle"]) {
  if (process.env.NABD_SMOKE_BINARY) return resolve(process.env.NABD_SMOKE_BINARY);
  execFileSync("pnpm", ["tauri", "build", ...buildArgs], {
    cwd: repo(""),
    stdio: ["ignore", process.stderr, process.stderr],
    shell: process.platform === "win32", // pnpm is a .cmd there
  });
  return join(process.env.CARGO_TARGET_DIR || repo("src-tauri/target"), "release", path);
}

/** A new temporary folder, by its long name (no 8.3 short names on Windows, no /var → /private/var link on macOS). */
export const sandbox = () => realpathSync.native(mkdtempSync(join(tmpdir(), "nabd-smoke-")));

// --------------------------------------------------------------- database ---

/** The node:sqlite module (experimental in Node 22), loaded without its warning. */
const { DatabaseSync } = await (async () => {
  const emitWarning = process.emitWarning;
  process.emitWarning = () => {};
  try {
    return await import("node:sqlite");
  } finally {
    process.emitWarning = emitWarning;
  }
})();

/** Run `use(db)` on the app's database, opened only for that and closed again. */
function withDatabase(use) {
  // Never create it: a fresh account has none until the app writes one.
  if (!existsSync(databasePath()))
    throw new SmokeFailure(`a database at ${databasePath()}`, "none");
  const db = new DatabaseSync(databasePath());
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    return use(db);
  } finally {
    db.close();
  }
}

export const database = {
  exists: () => existsSync(databasePath()),

  schemaVersion: () =>
    withDatabase((db) =>
      Number(db.prepare("SELECT value FROM app_meta WHERE key = 'version'").get()?.value),
    ),

  /** A stored singleton, as stored (a JSON string), or undefined. */
  value: (key) =>
    withDatabase((db) => db.prepare("SELECT value FROM kv WHERE key = ?").get(key)?.value),

  /** One field of a stored singleton, e.g. `stored("dayState", ".date")` (SQLite's JSON path). */
  stored: (key, path) =>
    withDatabase(
      (db) =>
        db
          .prepare("SELECT json_extract(value, ?) AS field FROM kv WHERE key = ?")
          .get(`$${path}`, key)?.field,
    ),

  /** Every logged set: "<exercise> <date> <session> <trigger> <plan item>". */
  history: () =>
    withDatabase((db) =>
      db
        .prepare("SELECT ex_id, date, session, trigger, plan_item_id FROM history ORDER BY rowid")
        .all()
        .map((set) => Object.values(set).join(" ")),
    ),

  /** Whether the file is sound and nothing was left half-written (no rollback journal). */
  isClean: () =>
    !existsSync(`${databasePath()}-journal`) &&
    withDatabase((db) => db.prepare("PRAGMA integrity_check").get().integrity_check === "ok"),

  /** Store singletons (key → JSON string) the way the app does. */
  put: (values) =>
    withDatabase((db) => {
      const put = db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)");
      for (const [key, value] of Object.entries(values)) put.run(key, value);
    }),

  /**
   * Today begins afresh, on a plan of `sets` working sets of push-ups, with
   * `settings` (every weekday a workday; other fields missing are at their
   * defaults): nothing logged, nothing on record, nudges not paused.
   */
  startDay: (sets, settings = {}) => {
    withDatabase((db) => db.exec("DELETE FROM history"));
    database.put({
      program: plan(sets),
      settings: JSON.stringify({ ...EVERY_DAY, ...settings }),
      dayLog: "[]",
      dayState: dayState({ date: localDate() }),
    });
  },
};

/** Every weekday a workday, so the day the test runs on is one. */
export const EVERY_DAY = { workDays: [0, 1, 2, 3, 4, 5, 6] };

/** A floating plan of one day, "Desk", of `sets` working sets of push-ups (plan item "row"). */
export function plan(sets) {
  const set = { type: "working", amount: 8, upTo: 12 };
  return JSON.stringify({
    name: "Smoke plan",
    type: "fixed",
    schedule: "floating",
    days: [
      {
        id: "day",
        name: "Desk",
        weekday: null,
        exercises: [
          {
            id: "row",
            exId: "push_up__bodyweight",
            repMode: "range",
            intensity: "none",
            rest: 60,
            sets: Array.from({ length: sets }, () => set),
          },
        ],
        slots: [],
      },
    ],
  });
}

/** A stored day state: a fresh day unless `fields` says otherwise. */
export function dayState(fields) {
  return JSON.stringify({
    dayId: null,
    carried: null,
    skipped: [],
    extras: [],
    paused: false,
    ...fields,
  });
}

/** The tray menu on the smoke plan of one set, nothing logged: [label, enabled]. */
export const TRAY_MENU = [
  ["Next: Push-Up · 0/1 sets", false],
  ["Start next set", true],
  ["Pause nudges", true],
  ["Open Nabd", true],
  ["Quit", true],
];

// ------------------------------------------------------------ login entry ---

/** Where Windows keeps the login entry: a value of this registry key named after the product. */
export const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";

/** Where the login entry is, in words, for messages. */
export function loginEntryLocation() {
  switch (process.platform) {
    case "win32":
      return `${RUN_KEY} → ${PRODUCT_NAME}`;
    case "darwin":
      return launchAgentPath();
    default:
      return desktopEntryPath();
  }
}

const launchAgentPath = () => join(homedir(), "Library", "LaunchAgents", `${PRODUCT_NAME}.plist`);
const desktopEntryPath = () => join(homedir(), ".config", "autostart", `${PRODUCT_NAME}.desktop`);

/**
 * The login entry tauri-plugin-autostart wrote, as `{ program, args }`, or
 * null when there is none: the registry's Run value on Windows, the
 * LaunchAgent's ProgramArguments on macOS, the autostart entry's Exec line on
 * Linux. A Run value or Exec line is split at its first " --" (the plugin
 * writes the program unquoted, then the arguments).
 */
export function loginEntry() {
  switch (process.platform) {
    case "win32": {
      let output;
      try {
        output = execFileSync("reg", ["query", RUN_KEY, "/v", PRODUCT_NAME], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
      } catch {
        return null; // reg exits 1 when the value is not there
      }
      const line = new RegExp(`^\\s*${PRODUCT_NAME}\\s+REG_\\w+\\s+(.*)$`, "m").exec(output);
      return line === null ? null : splitCommand(line[1].trim());
    }
    case "darwin": {
      if (!existsSync(launchAgentPath())) return null;
      const agent = JSON.parse(
        execFileSync("plutil", ["-convert", "json", "-o", "-", launchAgentPath()], {
          encoding: "utf8",
        }),
      );
      const [program, ...args] = agent.ProgramArguments;
      return { program, args };
    }
    default: {
      if (!existsSync(desktopEntryPath())) return null;
      const exec = /^Exec=(.*)$/m.exec(readFileSync(desktopEntryPath(), "utf8"));
      return exec === null ? null : splitCommand(exec[1]);
    }
  }
}

function splitCommand(command) {
  const at = command.indexOf(" --");
  return at < 0
    ? { program: command, args: [] }
    : { program: command.slice(0, at), args: command.slice(at + 1).split(" ") };
}

/** The same file, however each path spells it (symlinks, 8.3 names, letter case on Windows). */
function sameFile(a, b) {
  const canonical = (path) => {
    const real = existsSync(path) ? realpathSync.native(path) : path;
    return process.platform === "win32" ? real.toLowerCase() : real;
  };
  return canonical(a) === canonical(b);
}

/** The login entry (see loginEntry); fail when there is none. */
export function existingLoginEntry() {
  const entry = loginEntry();
  if (entry === null) throw new SmokeFailure(`a login entry at ${loginEntryLocation()}`, "none");
  return entry;
}

/** Fail unless the login entry starts `binary` with --autostart, and nothing else. */
export function expectLoginEntry(binary) {
  const entry = existingLoginEntry();
  if (!sameFile(entry.program, binary) || JSON.stringify(entry.args) !== `["${AUTOSTART_ARG}"]`) {
    throw new SmokeFailure(
      `the login entry at ${loginEntryLocation()} to run ${binary} ${AUTOSTART_ARG}`,
      JSON.stringify(entry),
    );
  }
}

// -------------------------------------------------------------- processes ---

const OUTPUT_LINES = 40;

/** One launch of a program (the app, or tauri-driver): its process, and the last lines it printed. */
export class AppProcess {
  constructor(binary, args) {
    this.command = [binary, ...args].join(" ");
    this.output = [];
    this.exitCode = undefined;
    this.child = spawn(binary, args);
    const keep = (chunk) => {
      this.output.push(...String(chunk).split(/\r?\n/).filter(Boolean));
      this.output.splice(0, Math.max(0, this.output.length - OUTPUT_LINES));
    };
    this.child.stdout.on("data", keep);
    this.child.stderr.on("data", keep);
    this.exited = new Promise((resolve) => {
      this.child.on("error", (error) => {
        keep(`(could not start: ${error.message})`);
        resolve((this.exitCode = null));
      });
      this.child.on("exit", (code, signal) => resolve((this.exitCode = signal ?? code)));
    });
  }

  get pid() {
    return this.child.pid;
  }

  get running() {
    return this.exitCode === undefined;
  }

  /** Wait for the process to end within `timeoutMs`, and fail unless it ended successfully. */
  async expectExit(what, timeoutMs = 15_000) {
    const code = await Promise.race([this.exited, sleep(timeoutMs, "still running")]);
    expectEqual(`exit status after ${what}`, code, 0);
  }

  /** End the process at once, without asking it (nothing is waiting to be saved). */
  async kill() {
    if (!this.running) return;
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(this.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        // Ended meanwhile.
      }
    } else {
      this.child.kill("SIGKILL");
    }
    await this.exited;
  }

  describe() {
    const status = this.running ? "running" : `exited with ${this.exitCode}`;
    return [`$ ${this.command}  (${status})`, ...this.output.map((line) => `  ${line}`)].join("\n");
  }
}

/** How many processes of `binary`'s file name are running (whoever started them). */
export function instances(binary) {
  const name = binary.split(/[\\/]/).pop();
  try {
    if (process.platform === "win32") {
      const tasks = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${name}`, "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      });
      return tasks.split("\n").filter((line) => line.startsWith(`"${name}"`)).length;
    }
    return execFileSync("pgrep", ["-x", name.slice(0, 15)], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean).length;
  } catch {
    return 0; // pgrep exits 1 when there is none
  }
}

// ----------------------------------------------------------- command line ---
// For linux-smoke.sh, which keeps no copy of the plan, the paths or the
// expectations above:
//
//   node app.mjs start-day SETS [SETTINGS] database.startDay (SETTINGS: JSON)
//   node app.mjs stored KEY PATH           database.stored, e.g. dayState .paused
//   node app.mjs login-command             the login entry's command, one word a line
//   node app.mjs built-binary PATH         builtBinary(PATH): the binary under test

const COMMANDS = {
  "built-binary": (path) => console.log(builtBinary(path)),
  "start-day": (sets, settings = "{}") => database.startDay(Number(sets), JSON.parse(settings)),
  stored: (key, path) => console.log(String(database.stored(key, path) ?? "")),
  "login-command": () => {
    const entry = existingLoginEntry();
    console.log([entry.program, ...entry.args].join("\n"));
  },
};

/** Whether the module at `url` is the script Node was started with. */
export const isMain = (url) =>
  process.argv[1] !== undefined && url === pathToFileURL(process.argv[1]).href;

if (isMain(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (!(command in COMMANDS)) {
    console.error(`usage: app.mjs ${Object.keys(COMMANDS).join("|")} ...`);
    process.exit(2);
  }
  COMMANDS[command](...args);
}
