import { BUTTON_CLASS } from "./button-base";
import { COLOR } from "./tokens";

/** The named animations; use these instead of spelling keyframe names. */
export const ANIMATION = {
  /** A panel settling into place. */
  fade: "nb-fade .22s ease",
  /** A toast sliding up from the corner. */
  toast: "nb-toast .28s ease",
  /** A dot that pulses to draw the eye. */
  blink: "nb-blink 1.1s infinite",
} as const;

/** The class of every text field: where its focus ring hangs. */
export const FIELD_CLASS = "nb-field";

const KEYFRAMES = `
@keyframes nb-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nb-toast { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nb-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

/**
 * What inline styles cannot say: the one focus ring (keyboard focus only), a
 * button's hover, and a field's placeholder.
 */
const STATES = `
.${BUTTON_CLASS}:focus-visible, .${FIELD_CLASS}:focus-visible { outline: 2px solid ${COLOR.accent}; outline-offset: 2px; }
.${FIELD_CLASS}:focus-visible { outline-offset: -1px; }
[role="dialog"]:focus { outline: none; }
.${BUTTON_CLASS}:not(:disabled):hover { filter: brightness(1.1); }
.${FIELD_CLASS}::placeholder { color: ${COLOR.textFaint}; }
`;

/** The keyframes behind `ANIMATION` and the interaction states. Rendered once, by `ThemeProvider`. */
export function GlobalStyles(): JSX.Element {
  return <style>{KEYFRAMES + STATES}</style>;
}
