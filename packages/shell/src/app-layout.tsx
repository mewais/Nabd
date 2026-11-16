import type { ReactNode } from "react";
import { Grid, Stack } from "@nabd/design-system";

interface AppLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  /** Shown between the top bar and the screen. */
  notice?: ReactNode;
  /** The screen. It brings its own scroll container (`Page`). */
  children: ReactNode;
}

/** The window, one row as tall as it: the sidebar beside a column of top bar, notice and screen. */
export function AppLayout({ sidebar, topBar, notice, children }: AppLayoutProps): JSX.Element {
  return (
    <Grid columns={["sidebar", 1]} rows="fill" grow>
      {sidebar}
      <Stack grow>
        {topBar}
        {notice && (
          <Stack paddingX="xxl" paddingTop="lg">
            {notice}
          </Stack>
        )}
        <Stack as="main" grow>
          {children}
        </Stack>
      </Stack>
    </Grid>
  );
}
