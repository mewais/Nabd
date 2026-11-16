import { Button, COLOR, Card, Icon, TEXT } from "@nabd/design-system";
import type { HeroNoticeVM } from "./hero-vm";

export interface HeroNoticeProps {
  vm: HeroNoticeVM;
  onLogOther: () => void;
}

/** A centred message in place of the next set: the day is done, skipped, or has no plan. */
export function HeroNotice({ vm, onLogOther }: HeroNoticeProps): JSX.Element {
  return (
    <Card
      padding="34px 24px"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        textAlign: "center",
      }}
    >
      {vm.kind === "complete" && (
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "var(--accent2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={28} stroke={COLOR.onAccent} strokeWidth={2.6} />
        </div>
      )}
      <div style={{ ...TEXT.title, fontSize: 24 }}>{vm.title}</div>
      <div style={{ fontSize: 13.5, color: "var(--text2)" }}>{vm.text}</div>
      {vm.offersLogOther && (
        <Button variant="ghost" size="md" onClick={onLogOther} style={{ marginTop: 8 }}>
          Log something else
        </Button>
      )}
    </Card>
  );
}
