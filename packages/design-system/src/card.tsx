import type { CSSProperties, ReactNode } from "react";
import { boxStyle } from "./layout";
import type { BoxProps } from "./layout";
import { Row } from "./row";
import { COLUMN, dashed } from "./styles";
import { TitleBlock } from "./title-block";
import { COLOR, HAIRLINE, QUIET_BOX, RADIUS, RAISED_BOX, SPACE, tint, toneColor } from "./tokens";
import type { Space, Tone } from "./tokens";

/**
 * - `card`: a raised panel on the page.
 * - `tile`: the same, smaller-cornered, for a card inside a card or a grid of them.
 * - `inset`: a quiet filled box inside a card or a modal.
 * - `dashed`: an empty dashed outline, for a place where something can be added.
 * - `frame`: a toned outline around things that belong together.
 */
export type CardVariant = "card" | "tile" | "inset" | "dashed" | "frame";

function variantStyle(variant: CardVariant, tone: Tone): CSSProperties {
  const color = toneColor(tone);
  switch (variant) {
    case "card":
      return { ...RAISED_BOX, borderRadius: RADIUS.card };
    case "tile":
      return { ...RAISED_BOX, borderRadius: RADIUS.tile };
    case "inset":
      return { ...QUIET_BOX, borderColor: color ?? COLOR.line, borderRadius: RADIUS.tile };
    case "dashed":
      return { border: dashed(), borderRadius: RADIUS.tile };
    case "frame":
      return {
        border: `2px solid ${color ?? COLOR.line}`,
        background: color === null ? undefined : tint(color, "wash"),
        borderRadius: RADIUS.card,
      };
  }
}

interface CardProps extends Pick<BoxProps, "as" | "grow" | "ariaLabel" | "children"> {
  variant?: CardVariant;
  /** Colours the outline of an `inset` or a `frame`. */
  tone?: Tone;
  /** With a title the card gets a header row. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** A control or note at the right of the header. */
  action?: ReactNode;
  /** A header of the card's own making, in place of title, subtitle and action. */
  header?: ReactNode;
  /** Inner padding, a step of the spacing scale. */
  padding?: Extract<Space, "sm" | "md" | "lg" | "xl" | "xxl">;
  /** The content runs edge to edge (a list, panes): only the header keeps the padding. */
  flush?: boolean;
  /** A hairline under the header. */
  divided?: boolean;
}

/**
 * A bordered panel: the box most of the app's content sits in. Its content
 * is laid out as a column, so a `Spacer` can push the last block to the
 * bottom. A card with a name — its `ariaLabel`, or its title — is a region
 * assistive tech can find by it.
 */
export function Card(props: CardProps): JSX.Element {
  const { variant = "card", tone = "neutral", title, subtitle, action, header } = props;
  const { padding = "xl", flush = false, divided = false } = props;
  const name = props.ariaLabel ?? (typeof title === "string" ? title : undefined);
  const as = props.as ?? (name === undefined ? "div" : "section");
  const Tag = as;
  const hasHeader = title !== undefined || header !== undefined;
  return (
    <Tag
      aria-label={name}
      style={{
        ...boxStyle({ as, grow: props.grow, padding: flush ? "none" : padding }),
        ...variantStyle(variant, tone),
        ...COLUMN,
        overflow: flush ? "hidden" : undefined,
      }}
    >
      {hasHeader && (
        <div
          style={{
            padding: flush ? SPACE[padding] : 0,
            marginBottom: flush ? 0 : SPACE.lg,
            borderBottom: divided ? HAIRLINE : undefined,
          }}
        >
          {header ?? (
            <Row gap="md">
              <TitleBlock title={title} subtitle={subtitle} grow />
              {action}
            </Row>
          )}
        </div>
      )}
      {props.children}
    </Tag>
  );
}
