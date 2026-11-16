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

/** The sidebar's width, then whatever is left. */
const COLUMNS = "250px minmax(0, 1fr)";
/** One row, as tall as the window. */
const ROWS = "minmax(0, 1fr)";

/** The window: the sidebar beside a column of top bar, notice and screen. */
export function AppLayout({ sidebar, topBar, notice, children }: AppLayoutProps): JSX.Element {
  return (
    <Grid columns={COLUMNS} rows={ROWS} grow>
      {sidebar}
      <Stack grow>
        {topBar}
        {notice && (
          <Stack surface edge="bottom" paddingX="xxl" paddingY="md">
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
