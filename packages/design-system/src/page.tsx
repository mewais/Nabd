import type { ReactNode } from "react";
import { ScrollArea } from "./scroll-area";
import { Stack } from "./stack";

interface PageProps {
  /** How wide the content column grows. */
  width?: keyof typeof MAX_WIDTH;
  children?: ReactNode;
}

const MAX_WIDTH = { narrow: 1100, regular: 1240, wide: 1320 } as const;

/** A screen's scroll container: padded, with the content in a centred column. */
export function Page({ width = "regular", children }: PageProps): JSX.Element {
  return (
    <ScrollArea grow padding="xxl">
      <div style={{ maxWidth: MAX_WIDTH[width], margin: "0 auto" }}>
        <Stack gap="xl">{children}</Stack>
      </div>
    </ScrollArea>
  );
}
