import type { CSSProperties, ReactNode } from "react";
import { RADIUS, SURFACE2_BOX, TEXT } from "./tokens";

/**
 * - `card`: a raised panel on the page.
 * - `tile`: the same, smaller-cornered, for a card inside a card or a grid of them.
 * - `inset`: a quiet filled box inside a card or a modal.
 */
export type CardVariant = "card" | "tile" | "inset";

const RAISED: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  boxShadow: "var(--cardshadow)",
};

const STACKED: CSSProperties = { display: "flex", flexDirection: "column" };

const VARIANTS: Record<CardVariant, CSSProperties> = {
  card: { ...RAISED, borderRadius: RADIUS.card },
  tile: { ...RAISED, borderRadius: RADIUS.tile },
  inset: { ...SURFACE2_BOX, borderRadius: RADIUS.tile },
};

export interface CardProps {
  variant?: CardVariant;
  /** With a title the card gets a header row. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** A control or note at the right of the header. */
  action?: ReactNode;
  /** Lay the content out as a column, so its last block can sit at the bottom. */
  stacked?: boolean;
  /** Inner padding; 0 for edge-to-edge content such as lists. */
  padding?: number | string;
  /** Layout of the card's own box and of its content. */
  style?: CSSProperties;
  children?: ReactNode;
}

/** A bordered panel: the box most of the app's content sits in. */
export function Card({
  variant = "card",
  title,
  subtitle,
  action,
  stacked = false,
  padding = 20,
  style,
  children,
}: CardProps): JSX.Element {
  return (
    <div
      style={{
        ...VARIANTS[variant],
        ...(stacked ? STACKED : undefined),
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
