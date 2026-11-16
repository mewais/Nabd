// Finding the parts of the page that have no role of their own.

/** The dimmed area around the open modal; a click on it closes the modal. */
export function modalBackdrop(): HTMLElement {
  const backdrop = document.querySelector<HTMLElement>("[data-modal-backdrop]");
  if (!backdrop) throw new Error("no modal is open");
  return backdrop;
}
