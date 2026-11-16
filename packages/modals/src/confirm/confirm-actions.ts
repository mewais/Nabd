/** What the confirmation asks of the app. */
export interface ConfirmActions {
  /** Go ahead with what is being confirmed. */
  confirm: () => void;
  cancel: () => void;
}
