import type { ReactNode } from "react";
import { Eyebrow } from "./eyebrow";

export interface FormSectionProps {
  title: string;
  children?: ReactNode;
}

/** A titled group of form rows or a single labelled field. */
export function FormSection({ title, children }: FormSectionProps): JSX.Element {
  return (
    <section aria-label={title}>
      <Eyebrow style={{ marginBottom: 6 }}>{title}</Eyebrow>
      {children}
    </section>
  );
}
