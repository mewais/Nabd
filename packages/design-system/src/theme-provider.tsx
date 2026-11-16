import type { ReactNode } from "react";
import type { Theme } from "@nabd/domain";
import { GlobalStyles } from "./global-styles";
import { themeStyle } from "./theme";
import { COLOR, FONT } from "./tokens";
import { ROW } from "./styles";

interface ThemeProviderProps {
  theme: Theme;
  /** Translucent window: use the theme's glass material over a frosted tint. */
  glass: boolean;
  /** Strength of the glass tint, 0–1. Ignored when `glass` is off. */
  opacity: number;
  children?: ReactNode;
}

/**
 * The app root: sets the theme's CSS variables, background, text colour and
 * font. It fills the window, and what is put in it can `grow` to fill it too.
 */
export function ThemeProvider({
  theme,
  glass,
  opacity,
  children,
}: ThemeProviderProps): JSX.Element {
  return (
    <div
      data-theme={theme}
      data-glass={glass ? "on" : "off"}
      style={{
        ...themeStyle(theme, glass, opacity),
        ...ROW,
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        color: COLOR.text,
        fontFamily: FONT.sans,
      }}
    >
      <GlobalStyles />
      {children}
    </div>
  );
}
