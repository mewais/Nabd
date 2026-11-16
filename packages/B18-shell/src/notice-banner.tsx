import { Button, RADIUS, SURFACE2_BOX } from "@nabd/design-system";
import type { NoticeVM } from "./view-model";

export interface NoticeBannerProps {
  notice: NoticeVM;
  onDismiss: () => void;
}

/** Something the user must know wherever they are in the app, until they dismiss it. */
export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps): JSX.Element {
  const isError = notice.kind === "error";
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
      <span style={{ flex: 1, wordBreak: "break-word" }}>{notice.text}</span>
      <Button variant="link" tone="neutral" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}
