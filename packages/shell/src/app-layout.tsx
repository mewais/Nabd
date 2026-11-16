import type { CSSProperties, ReactNode } from "react";
import { Z } from "@nabd/design-system";

interface AppLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  /** Shown between the top bar and the screen. */
  notice?: ReactNode;
  /** The screen. It brings its own scroll container (`Page`). */
  children: ReactNode;
}

const COLUMN: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

/** The window: the sidebar beside a column of top bar, notice and screen. */
export function AppLayout({ sidebar, topBar, notice, children }: AppLayoutProps): JSX.Element {
  return (
    <div style={{ position: "relative", zIndex: Z.raised, display: "flex", height: "100%" }}>
      {sidebar}
      <div style={COLUMN}>
        {topBar}
        {notice}
        <main style={COLUMN}>{children}</main>
      </div>
    </div>
  );
}
