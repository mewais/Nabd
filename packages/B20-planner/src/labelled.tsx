import type { ReactNode } from "react";
import { Eyebrow } from "@nabd/design-system";

export interface LabelledProps {
  label: string;
  children: ReactNode;
}

/** A compact control with its micro-label in front. */
export function Labelled({ label, children }: LabelledProps): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <Eyebrow>{label}</Eyebrow>
      {children}
    </div>
  );
}
