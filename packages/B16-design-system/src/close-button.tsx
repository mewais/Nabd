import { IconButton } from "./icon-button";

export interface CloseButtonProps {
  onClose: () => void;
}

/** The square ✕ in the corner of a modal or panel. */
export function CloseButton({ onClose }: CloseButtonProps): JSX.Element {
  return <IconButton icon="close" label="Close" onClick={onClose} />;
}
