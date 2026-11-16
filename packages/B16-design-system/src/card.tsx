import type { CSSProperties, ReactNode } from "react";
import { RADIUS, TEXT } from "./tokens";

export interface CardProps {
  /** With a title the card gets a header row. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** A control or note at the right of the header. */
  action?: ReactNode;
  /** Inner padding; 0 for edge-to-edge content such as lists. */
  padding?: number | string;
  /** Layout of the card's own box and of its content. */
  style?: CSSProperties;
  children?: ReactNode;
}

/** A surface panel with a hairline border and the theme's card shadow. */
export function Card({
  title,
  subtitle,
  action,
  padding = 20,
  style,
  children,
}: CardProps): JSX.Element {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: RADIUS.card,
        boxShadow: "var(--cardshadow)",
        padding,
        ...style,
      }}
    >
      {title !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={TEXT.cardTitle}>{title}</div>
            {subtitle !== undefined && (
              <div style={{ ...TEXT.cardSubtitle, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {action !== undefined && <div style={{ marginLeft: "auto" }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
