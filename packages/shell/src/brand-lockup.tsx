import { BrandMark, Row, Stack, Text, Wordmark } from "@nabd/design-system";

interface BrandLockupProps {
  versionLabel: string;
}

/** The logo with the app's name in Latin and Arabic, and its version underneath. */
export function BrandLockup({ versionLabel }: BrandLockupProps): JSX.Element {
  return (
    <Row gap="md" paddingX="xs">
      <BrandMark />
      <Stack gap="xxs">
        <Wordmark />
        <Text variant="monoCaption">{versionLabel}</Text>
      </Stack>
    </Row>
  );
}
