import { Button, RADIUS, SURFACE2_BOX } from "@nabd/design-system";
import type { Notice } from "@nabd/view";
import type { ShellActions } from "./shell-actions";

interface NoticeBannerProps {
  vm: Notice;
  actions: Pick<ShellActions, "dismissNotice">;
}

/** Something the user must know wherever they are in the app, until they dismiss it. */
export function NoticeBanner({ vm, actions }: NoticeBannerProps): JSX.Element {
  const isError = vm.kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        ...SURFACE2_BOX,
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "18px 26px 0",
        padding: "11px 14px",
        borderColor: isError ? "var(--accent)" : "var(--line)",
        borderRadius: RADIUS.button,
        fontSize: 13.5,
      }}
    >
      <span style={{ flex: 1, wordBreak: "break-word" }}>{vm.text}</span>
      <Button variant="link" tone="neutral" size="sm" onClick={actions.dismissNotice}>
        Dismiss
      </Button>
    </div>
  );
}
