import { RECOMMENDATION_TONES } from "@nabd/bodymap";
import { Row, Swatch, Text } from "@nabd/design-system";
import type { InsightRowVM } from "./coverage-vm";

interface InsightRowProps {
  vm: InsightRowVM;
}

/** One finding: a dot in the colour of its kind and a sentence with a bold opening. */
export function InsightRow({ vm }: InsightRowProps): JSX.Element {
  return (
    <Row gap="md" align="baseline">
      <Swatch tone={RECOMMENDATION_TONES[vm.kind]} />
      <Text>
        <b>{vm.lead}</b>
        {vm.text}
      </Text>
    </Row>
  );
}
