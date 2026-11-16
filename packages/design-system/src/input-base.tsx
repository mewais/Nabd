import type { CSSProperties, InputHTMLAttributes } from "react";
import { FIELD_CLASS } from "./global-styles";
import { COLOR } from "./tokens";

/** The attributes a field's kind may set on it: what it is and how it behaves. */
type InputSemantics = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "inputMode"
  | "role"
  | "aria-label"
  | "aria-valuenow"
  | "placeholder"
  | "value"
  | "onChange"
  | "onBlur"
  | "onKeyDown"
>;

interface InputBaseProps extends InputSemantics {
  /** The look of this kind of field, over the reset. */
  style: CSSProperties;
}

const RESET: CSSProperties = { margin: 0, fontFamily: "inherit", color: COLOR.text };

/**
 * Every field in the app is one of these: a real `<input>` in the app's font
 * and text colour, ringed while it has keyboard focus (see global-styles.tsx).
 * The kinds of field (TextInput, TitleInput, NumberField) only add their own look.
 */
export function InputBase({ style, ...semantics }: InputBaseProps): JSX.Element {
  return <input className={FIELD_CLASS} style={{ ...RESET, ...style }} {...semantics} />;
}
