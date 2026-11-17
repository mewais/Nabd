import { Flex } from "./flex";
import type { FlexProps } from "./flex";

/** Children one under the other, each as wide as the stack unless `align` says otherwise. */
export function Stack(props: FlexProps): JSX.Element {
  return <Flex direction="column" {...props} />;
}
