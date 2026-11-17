import type { Settings } from "./settings";

/** What this machine can do; features it lacks are not offered. */
export interface PlatformCapabilities {
  /** A tray icon exists, so closing the window hides it there instead of quitting. */
  tray: boolean;
  /** The window can be translucent ("Glass"). */
  glass: boolean;
  /** The OS reports system-wide idle time. */
  idle: boolean;
}

/** A machine that offers none of it: what is assumed until the backend has said. */
export const NO_CAPABILITIES: PlatformCapabilities = { tray: false, glass: false, idle: false };

/**
 * Whether the window is translucent: the setting is on and this machine can
 * do it. A stored "glass on" (say, data imported from another machine) must
 * not leave the panels see-through where the window itself cannot be.
 */
export function glassInEffect(
  settings: Pick<Settings, "glass">,
  capabilities: Pick<PlatformCapabilities, "glass">,
): boolean {
  return settings.glass && capabilities.glass;
}
