import { COLOR, TEXT } from "./tokens";

/**
 * The app's name in Latin and Arabic. The Arabic word is not letter-spaced:
 * spacing would pull its joined letters apart.
 */
export function Wordmark(): JSX.Element {
  return (
    <div style={{ ...TEXT.heading, whiteSpace: "nowrap" }}>
      Nabd <span style={{ color: COLOR.textFaint, fontWeight: 600 }}>·</span>{" "}
      <span lang="ar" style={{ letterSpacing: 0, fontWeight: 700 }}>
        نبض
      </span>
    </div>
  );
}
