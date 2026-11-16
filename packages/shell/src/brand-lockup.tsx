import { BrandMark, FONT } from "@nabd/design-system";

interface BrandLockupProps {
  versionLabel: string;
}

/** The logo with the app's name in Latin and Arabic, and its version underneath. */
export function BrandLockup({ versionLabel }: BrandLockupProps): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 6px 20px" }}>
      <BrandMark />
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 19,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}
        >
          Nabd <span style={{ opacity: 0.4, fontWeight: 600 }}>·</span>{" "}
          <span style={{ letterSpacing: 0, fontWeight: 700 }}>نبض</span>
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--text3)",
            fontFamily: FONT.mono,
            letterSpacing: "0.12em",
            marginTop: 3,
          }}
        >
          {versionLabel}
        </div>
      </div>
    </div>
  );
}
