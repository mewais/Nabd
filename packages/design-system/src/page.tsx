import type { ReactNode } from "react";
import { ScrollArea } from "./scroll-area";
import { Stack } from "./stack";
import type { Size } from "./tokens";

type PageWidth = Extract<Size, "sm" | "md" | "lg">;

interface PageProps {
  /** How wide the content column grows. */
  width?: PageWidth;
  children?: ReactNode;
}

const MAX_WIDTH: Record<PageWidth, number> = { sm: 1100, md: 1240, lg: 1320 };

/** A screen's scroll container: padded, with the content in a centred column. */
export function Page({ width = "md", children }: PageProps): JSX.Element {
  return (
    <ScrollArea grow padding="xxl">
      <div style={{ maxWidth: MAX_WIDTH[width], margin: "0 auto" }}>
        <Stack gap="xl">{children}</Stack>
      </div>
    </ScrollArea>
  );
}
