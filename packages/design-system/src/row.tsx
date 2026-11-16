import { Flex } from "./flex";
import type { FlexProps } from "./flex";

/** Children side by side, centred on each other unless `align` says otherwise. */
export function Row({ align = "center", ...props }: FlexProps): JSX.Element {
  return <Flex direction="row" align={align} {...props} />;
}
