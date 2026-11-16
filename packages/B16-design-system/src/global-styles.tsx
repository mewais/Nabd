/** The named animations; use these instead of spelling keyframe names. */
export const ANIMATION = {
  /** A panel settling into place. */
  fade: "nb-fade .22s ease",
  /** A toast sliding up from the corner. */
  toast: "nb-toast .28s ease",
  /** A dot that pulses to draw the eye. */
  blink: "nb-blink 1.1s infinite",
} as const;

const KEYFRAMES = `
@keyframes nb-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nb-toast { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nb-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

/** The keyframes behind `ANIMATION`. Rendered once, by `ThemeProvider`. */
export function GlobalStyles(): JSX.Element {
  return <style>{KEYFRAMES}</style>;
}
