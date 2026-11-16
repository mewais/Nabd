import type { ReactNode } from "react";
import { TEXT } from "./tokens";

interface FormRowProps {
  title: string;
  /** One line explaining the setting. */
  hint: string;
  /** Put the control under the text instead of beside it (for wide controls). */
  stacked?: boolean;
  /** The control. */
  children?: ReactNode;
}

/** One setting: its name and a hint, with the control beside or under them. */
export function FormRow({ title, hint, stacked = false, children }: FormRowProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "stretch" : "center",
        justifyContent: "space-between",
        gap: stacked ? 9 : 16,
        padding: "9px 0",
      }}
    >
      <div>
        <div style={TEXT.label}>{title}</div>
        <div style={{ ...TEXT.cardSubtitle, marginTop: 2 }}>{hint}</div>
      </div>
      {children}
    </div>
  );
}
