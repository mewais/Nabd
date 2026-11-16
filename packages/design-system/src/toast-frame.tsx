import type { ReactNode } from "react";
import { ANIMATION } from "./global-styles";
import { COLOR, HAIRLINE, RADIUS, SHADOW, SPACE, Z } from "./tokens";

interface ToastFrameProps {
  children?: ReactNode;
}

const WIDTH = 328;

/** A card pinned to the window's bottom-right corner, above the page and below any dialog. */
export function ToastFrame({ children }: ToastFrameProps): JSX.Element {
  return (
    <div
      style={{
        position: "fixed",
        bottom: SPACE.xxl,
        right: SPACE.xxl,
        width: WIDTH,
        boxSizing: "border-box",
        zIndex: Z.toast,
        padding: SPACE.xl,
        background: COLOR.surface,
        border: HAIRLINE,
        borderRadius: RADIUS.card,
        boxShadow: SHADOW.toast,
        animation: ANIMATION.toast,
      }}
    >
      {children}
    </div>
  );
}
