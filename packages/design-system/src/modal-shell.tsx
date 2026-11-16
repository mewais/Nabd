import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ANIMATION } from "./global-styles";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { COLOR, HAIRLINE, RADIUS, SHADOW, SPACE, Z } from "./tokens";
import type { ModalLayer } from "./tokens";
import { useEscapeKey } from "./use-escape-key";
import { useFocusTrap } from "./use-focus-trap";

interface ModalShellProps {
  title: ReactNode;
  /** The small accent label above the title. */
  eyebrow?: string;
  /** A line of context under the title. */
  subtitle?: ReactNode;
  onClose: () => void;
  /** Panel width in px (it never exceeds the window). */
  width: number;
  /** A fixed panel height in px; by default the panel is as tall as its content. */
  height?: number;
  /** Stacking layer; a modal opened over another modal needs a higher one. */
  layer?: ModalLayer;
  /** What stays put under the scrolling body: the dialog's closing actions. */
  footer?: ReactNode;
  children?: ReactNode;
}

const BACKDROP: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACE.xl,
  background: COLOR.scrim,
};

const PANEL: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "90vh",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: COLOR.modal,
  border: HAIRLINE,
  borderRadius: RADIUS.modal,
  boxShadow: SHADOW.modal,
  animation: ANIMATION.fade,
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
};

/** Scrolls as a whole, unless its content brings panes that scroll on their own. */
const BODY: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

/**
 * A dialog over a dimmed backdrop: a header (title, close button), a body that
 * scrolls when it is taller than the window, and an optional footer. Escape,
 * the close button and a click on the backdrop all call `onClose`. Keyboard
 * focus stays inside the dialog while it is open and goes back to where it
 * was when it closes.
 */
export function ModalShell(props: ModalShellProps): JSX.Element {
  const { title, eyebrow, subtitle, onClose, width, height, layer = "modal", footer } = props;
  const titleId = useId();
  const trap = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  return (
    <div
      data-modal-backdrop
      data-layer={layer}
      onClick={onClose}
      style={{ ...BACKDROP, zIndex: Z[layer] }}
    >
      <div
        ref={trap.ref}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trap.onKeyDown}
        onClick={(event) => event.stopPropagation()}
        style={{ ...PANEL, width, height }}
      >
        <Row as="header" align="start" gap="lg" paddingX="xxl" paddingY="xl" edge="bottom">
          <Stack gap="xs" grow>
            {eyebrow !== undefined && (
              <Text variant="eyebrow" tone="accent">
                {eyebrow}
              </Text>
            )}
            <Text as="h2" variant="title" id={titleId}>
              {title}
            </Text>
            {subtitle !== undefined && (
              <Text variant="hint" tone="muted">
                {subtitle}
              </Text>
            )}
          </Stack>
          <IconButton icon="close" ariaLabel="Close" onClick={onClose} />
        </Row>
        <div style={BODY}>{props.children}</div>
        {footer !== undefined && (
          <Row as="footer" justify="between" gap="lg" paddingX="xxl" paddingY="md" edge="top">
            {footer}
          </Row>
        )}
      </div>
    </div>
  );
}
