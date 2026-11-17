import type { Page } from "@playwright/test";
import type { PlatformCapabilities } from "@nabd/domain";
import type { BootSnapshot } from "@nabd/ipc-client";
import { Confirm } from "./pages/confirm";
import { Library } from "./pages/library";
import { Logger } from "./pages/logger";
import { Planner } from "./pages/planner";
import { Progress } from "./pages/progress";
import { Settings } from "./pages/settings";
import { Shell } from "./pages/shell";
import { Today } from "./pages/today";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
/** While "busy" the mouse moves this often: sooner than any idle moment the specs configure. */
const BUSY_STEP_MS = 10 * SECOND_MS;

/**
 * The app in the browser, on a clock the spec controls. Time only passes when
 * a spec says so, and it says how: with the user away from the keyboard
 * ({@link idleFor}) or busy in the window ({@link busyFor}) — in the browser
 * the app takes its idle time from activity inside the page.
 */
export class App {
  readonly shell: Shell;
  readonly today: Today;
  readonly logger: Logger;
  readonly planner: Planner;
  readonly library: Library;
  readonly settings: Settings;
  readonly progress: Progress;
  readonly confirm: Confirm;
  private now = new Date(0);

  constructor(private readonly page: Page) {
    this.shell = new Shell(page);
    this.today = new Today(page);
    this.logger = new Logger(page);
    this.planner = new Planner(page);
    this.library = new Library(page);
    this.settings = new Settings(page);
    this.progress = new Progress(page);
    this.confirm = new Confirm(page);
  }

  /**
   * Open the app at the moment `at`, with `stored` as everything its backend
   * holds (nothing: a first run), on a machine that can do what the browser
   * demo can, unless `capabilities` says otherwise.
   */
  async launch(
    at: Date,
    stored: Partial<BootSnapshot> = {},
    capabilities: Partial<PlatformCapabilities> = {},
  ): Promise<void> {
    await this.page.addInitScript(
      (seams) => {
        window.__NABD_E2E_SNAPSHOT__ = seams.stored;
        window.__NABD_E2E_CAPABILITIES__ = seams.capabilities;
      },
      { stored, capabilities },
    );
    await this.page.clock.install({ time: at });
    await this.page.clock.pauseAt(at);
    this.now = at;
    await this.page.goto("/");
  }

  /** Let one second pass: one beat of the app clock. */
  async tick(): Promise<void> {
    await this.advance(SECOND_MS);
  }

  /** Let `minutes` pass with nobody at the keyboard, then let the app clock beat once. */
  async idleFor(minutes: number): Promise<void> {
    await this.advance(minutes * MINUTE_MS);
  }

  /** Let `minutes` pass with the user moving the mouse inside the window all along. */
  async busyFor(minutes: number): Promise<void> {
    for (let elapsed = 0; elapsed < minutes * MINUTE_MS; elapsed += BUSY_STEP_MS) {
      await this.advance(BUSY_STEP_MS);
      await this.page.mouse.move(10 + ((elapsed / BUSY_STEP_MS) % 2), 10);
    }
  }

  /** Jump to the moment `at` (nobody at the keyboard meanwhile), then let the app clock beat once. */
  async sleepUntil(at: Date): Promise<void> {
    await this.advance(at.getTime() - this.now.getTime());
  }

  private async advance(ms: number): Promise<void> {
    await this.page.clock.fastForward(ms);
    this.now = new Date(this.now.getTime() + ms);
  }
}
