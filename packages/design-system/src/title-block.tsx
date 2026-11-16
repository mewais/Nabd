import type { ReactNode } from "react";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import type { Size, TextRole, Tone } from "./tokens";

/** `lg` heads a card or a section, `md` names a list entry or a setting, `sm` a row of a tight list. */
type TitleBlockSize = Extract<Size, "sm" | "md" | "lg">;

interface TitleBlockProps {
  title: ReactNode;
  /** The small print under the title. */
  subtitle?: ReactNode;
  size?: TitleBlockSize;
  /** Colours the title: `muted` for an entry that is not the current one, `accent` for the one that is. */
  tone?: Tone;
  /** The subtitle is data (a date, a tally): set it in the mono face. */
  mono?: boolean;
  /** Keep both lines to one line each, cut short with an ellipsis. */
  truncate?: boolean;
  /** Something small right after the title, such as a tag. */
  tag?: ReactNode;
  /** Inside a button, where only phrasing content may go. */
  inline?: boolean;
  /** Take the free space of the Row around it. */
  grow?: boolean;
}

const TITLE_ROLE: Record<TitleBlockSize, TextRole> = {
  lg: "cardTitle",
  md: "label",
  sm: "rowLabel",
};

/** A title with its subtitle: the two lines that name a card, a row or a setting. */
export function TitleBlock({
  title,
  subtitle,
  size = "lg",
  tone = "neutral",
  mono = false,
  truncate = false,
  tag,
  inline = false,
  grow = false,
}: TitleBlockProps): JSX.Element {
  const as = inline ? "span" : "div";
  const heading = (
    <Text as={as} variant={TITLE_ROLE[size]} tone={tone} truncate={truncate}>
      {title}
    </Text>
  );
  return (
    <Stack as={as} gap="xxs" grow={grow}>
      {tag === undefined ? (
        heading
      ) : (
        <Row as={as} gap="sm">
          {heading}
          {tag}
        </Row>
      )}
      {subtitle !== undefined && (
        <Text as={as} variant={mono ? "monoCaption" : "caption"} truncate={truncate}>
          {subtitle}
        </Text>
      )}
    </Stack>
  );
}
