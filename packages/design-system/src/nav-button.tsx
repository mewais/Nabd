import { ButtonBase } from "./button-base";
import { Icon } from "./icon";
import type { IconName } from "./icon-paths";
import { COLOR, FONT_SIZE, SPACE } from "./tokens";

interface NavButtonProps {
  icon: IconName;
  label: string;
  /** This is the destination being shown. */
  active: boolean;
  onClick: () => void;
}

/** One destination in a vertical navigation list; the current one carries an accent bar. */
export function NavButton({ icon, label, active, onClick }: NavButtonProps): JSX.Element {
  return (
    <ButtonBase
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.md,
        width: "100%",
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        background: active ? COLOR.surfaceAlt : COLOR.none,
        boxShadow: `inset 3px 0 0 ${active ? COLOR.accent : COLOR.none}`,
        fontSize: FONT_SIZE.medium,
        fontWeight: active ? 700 : 500,
        color: active ? COLOR.text : COLOR.textMuted,
        textAlign: "left",
        transition: "background 0.14s ease, color 0.14s ease",
      }}
    >
      <Icon name={icon} size={18} tone={active ? "accent" : "neutral"} />
      {label}
    </ButtonBase>
  );
}
