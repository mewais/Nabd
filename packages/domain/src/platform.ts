import type { Settings } from "./settings";

/**
 * How the desktop looks through the translucent window: blurred by the OS or
 * its compositor, or sharp, exactly as it is (a Linux desktop with no blur to
 * ask for), which takes a stronger tint to keep text readable.
 */
export type GlassBackdrop = "blurred" | "seeThrough";

/** What this machine can do; features it lacks are not offered. */
export interface PlatformCapabilities {
  /** A tray icon exists, so closing the window hides it there instead of quitting. */
  tray: boolean;
  /** The window can be translucent ("Glass"), with this backdrop; null where it cannot. */
  glass: GlassBackdrop | null;
  /** The OS reports system-wide idle time. */
  idle: boolean;
}

/** A machine that offers none of it: what is assumed until the backend has said. */
export const NO_CAPABILITIES: PlatformCapabilities = { tray: false, glass: null, idle: false };

/**
 * The backdrop of the window while it is translucent — the setting is on and
 * this machine can do it — else null. A stored "glass on" (say, data imported
 * from another machine) must not leave the panels see-through where the
 * window itself cannot be.
 */
export function glassInEffect(
  settings: Pick<Settings, "glass">,
  capabilities: Pick<PlatformCapabilities, "glass">,
): GlassBackdrop | null {
  return settings.glass ? capabilities.glass : null;
}
