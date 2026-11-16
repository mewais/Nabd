/**
 * The spacing scale, in px: every gap, padding and margin is one of these
 * steps. Layout primitives take a step by name (`gap="md"`).
 */
export const SPACE = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** A step of the spacing scale. */
export type Space = keyof typeof SPACE;
