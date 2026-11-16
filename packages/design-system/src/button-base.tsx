import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/** The attributes a button's kind may set on it: its name, tooltip, and the state it exposes. */
type ButtonSemantics = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "role"
  | "title"
  | "aria-label"
  | "aria-pressed"
  | "aria-current"
  | "aria-expanded"
  | "aria-haspopup"
  | "aria-checked"
  | "aria-selected"
>;

interface ButtonBaseProps extends ButtonSemantics {
  children?: ReactNode;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  /** The look of this kind of button, over the reset. */
  style: CSSProperties;
}

/** The class the focus ring hangs on (see global-styles.tsx). */
export const BUTTON_CLASS = "nb-button";

const RESET: CSSProperties = {
  margin: 0,
  padding: 0,
  border: "none",
  background: "none",
  font: "inherit",
  color: "inherit",
  textAlign: "inherit",
  cursor: "pointer",
};

const DISABLED: CSSProperties = { cursor: "not-allowed", opacity: 0.5 };

/**
 * Every button in the app is one of these: a real `<button>` that never submits
 * a form, stripped of the browser's look, dimmed while disabled, and ringed
 * while it has keyboard focus. The kinds of button (Button, IconButton,
 * RowButton…) only add their own look.
 */
export function ButtonBase({
  children,
  onClick,
  disabled = false,
  style,
  ...semantics
}: ButtonBaseProps): JSX.Element {
  return (
    <button
      type="button"
      className={BUTTON_CLASS}
      onClick={onClick}
      disabled={disabled}
      style={{ ...RESET, ...style, ...(disabled ? DISABLED : undefined) }}
      {...semantics}
    >
      {children}
    </button>
  );
}
