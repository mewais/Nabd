import type { ReactNode } from "react";

export interface PageProps {
  /** Widest the content column grows, in px. */
  maxWidth?: number;
  children?: ReactNode;
}

/** A screen's scroll container: padded, with the content in a centred column. */
export function Page({ maxWidth = 1240, children }: PageProps): JSX.Element {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 26 }}>
      <div
        style={{ maxWidth, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}
      >
        {children}
      </div>
    </div>
  );
}
