import { Icon } from "./icon";
import type { IconName } from "./icon-paths";

export interface NavButtonProps {
  icon: IconName;
  label: string;
  /** This is the destination being shown. */
  active: boolean;
  onClick: () => void;
}

/** One destination in a vertical navigation list; the current one carries an accent bar. */
export function NavButton({ icon, label, active, onClick }: NavButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "11px 18px",
        background: active ? "var(--surface2)" : "transparent",
        border: "none",
        borderRadius: 0,
        boxShadow: `inset 3px 0 0 ${active ? "var(--accent)" : "transparent"}`,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        color: active ? "var(--text)" : "var(--text2)",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 0.14s ease, color 0.14s ease",
      }}
    >
      <Icon name={icon} size={18} stroke={active ? "var(--accent)" : "currentColor"} />
      {label}
    </button>
  );
}
