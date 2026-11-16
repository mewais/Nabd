import { useId } from "react";
import type { ReactNode } from "react";
import { Eyebrow } from "./eyebrow";
import { ANIMATION } from "./global-styles";
import { IconButton } from "./icon-button";
import { COLOR, RADIUS, SHADOW, TEXT, Z } from "./tokens";
import type { ModalLayer } from "./tokens";
import { useEscapeKey } from "./use-escape-key";

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
  children?: ReactNode;
}

/**
 * A dialog over a dimmed backdrop: a header (title, close button) and a body
 * that scrolls when it is taller than the window. Escape, the close button and
 * a click on the backdrop all call `onClose`.
 */
export function ModalShell({
  title,
  eyebrow,
  subtitle,
  onClose,
  width,
  height,
  layer = "modal",
  children,
}: ModalShellProps): JSX.Element {
  const titleId = useId();
  useEscapeKey(onClose);

  return (
    <div
      data-modal-backdrop
      data-layer={layer}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z[layer],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: COLOR.scrim,
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        style={{
          width,
          height,
          maxWidth: "100%",
          maxHeight: "90vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: RADIUS.modal,
          boxShadow: SHADOW.modal,
          animation: ANIMATION.fade,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            {eyebrow !== undefined && (
              <Eyebrow tone="accent" style={{ marginBottom: 4 }}>
                {eyebrow}
              </Eyebrow>
            )}
            <h2 id={titleId} style={{ ...TEXT.title, margin: 0 }}>
              {title}
            </h2>
            {subtitle !== undefined && (
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{subtitle}</div>
            )}
          </div>
          <IconButton icon="close" ariaLabel="Close" onClick={onClose} />
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
