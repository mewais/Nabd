import { COLOR, FONT_WEIGHT, TEXT } from "./tokens";
import { WORDS } from "./wording";
import { APP_NAME } from "@nabd/domain";

/**
 * The app's name in Latin and Arabic. The Arabic word is not letter-spaced:
 * spacing would pull its joined letters apart.
 */
export function Wordmark(): JSX.Element {
  return (
    <div style={{ ...TEXT.heading, whiteSpace: "nowrap" }}>
      {APP_NAME} <span style={{ color: COLOR.textFaint, fontWeight: FONT_WEIGHT.semibold }}>·</span>{" "}
      <span lang="ar" style={{ letterSpacing: 0, fontWeight: FONT_WEIGHT.bold }}>
        {WORDS.appNameArabic}
      </span>
    </div>
  );
}
