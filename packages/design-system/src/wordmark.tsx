import { COLOR, FONT_WEIGHT, TEXT } from "./tokens";

/**
 * The app's name in Latin and Arabic. The Arabic word is not letter-spaced:
 * spacing would pull its joined letters apart.
 */
export function Wordmark(): JSX.Element {
  return (
    <div style={{ ...TEXT.heading, whiteSpace: "nowrap" }}>
      Nabd <span style={{ color: COLOR.textFaint, fontWeight: FONT_WEIGHT.semibold }}>·</span>{" "}
      <span lang="ar" style={{ letterSpacing: 0, fontWeight: FONT_WEIGHT.bold }}>
        نبض
      </span>
    </div>
  );
}
