import { useLayoutEffect, type RefObject } from "react";

let stopFollowingOpener: (() => void) | undefined;

function followOpener(opener: HTMLElement, restore: () => void) {
  stopFollowingOpener?.();
  // Lists can remove the restored row in a subsequent async refresh. Observe
  // only while that opener still owns focus, and stop at the next destination.
  const observer = new MutationObserver(() => {
    if (!available(opener)) {
      stop();
      restore();
    }
  });
  const changed = (event: FocusEvent) => {
    if (event.target !== opener && event.target !== document.body) stop();
  };
  const stop = () => {
    observer.disconnect();
    document.removeEventListener("focusin", changed);
    if (stopFollowingOpener === stop) stopFollowingOpener = undefined;
  };
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "disabled",
      "hidden",
      "inert",
      "aria-hidden",
      "aria-disabled",
      "style",
      "class",
    ],
  });
  document.addEventListener("focusin", changed);
  stopFollowingOpener = stop;
}

function available(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
    element !== document.body &&
    element !== document.documentElement &&
    !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
    !element.matches(':disabled, [aria-disabled="true"]') &&
    element.getClientRects().length &&
    getComputedStyle(element).visibility === "visible",
  );
}

function focus(element: HTMLElement) {
  // Semantic fallback containers may not normally participate in tab order.
  const temporary = !element.hasAttribute("tabindex") && element.tabIndex < 0;
  if (temporary) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  if (temporary) {
    const clear = () => element.removeAttribute("tabindex");
    if (document.activeElement === element) {
      element.addEventListener("blur", clear, { once: true });
    } else clear();
  }
}

/** Keep native dialog modality and restore focus across React unmounts. */
export function useModalFocus(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    stopFollowingOpener?.();
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const address = location.href;
    const boundaries: HTMLElement[] = [];
    for (
      let parent = opener?.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (
        parent.matches(
          'dialog, main, [role="main"], [role="region"], [tabindex]',
        )
      ) {
        boundaries.push(parent);
      }
    }
    dialog.showModal();
    return () => {
      // Layout cleanup runs while the dialog is still attached. Passive cleanup
      // ran after removal, when the browser could no longer restore its opener.
      dialog.close();
      // Wait only for this React commit (inert, replacement rows and route focus).
      // Also avoid stealing focus after StrictMode reopens this same dialog.
      const restore = () => {
        if (dialog.isConnected && dialog.open) return;
        const active = document.activeElement;
        const sameAddress = location.href === address;
        if (
          active instanceof HTMLElement &&
          active !== document.body &&
          !dialog.contains(active) &&
          available(active) &&
          (sameAddress || active !== opener)
        ) {
          if (active === opener) followOpener(opener, restore);
          return;
        }
        // An open parent/other modal takes precedence over the background.
        const modal = [
          ...document.querySelectorAll<HTMLDialogElement>("dialog:modal"),
        ].at(-1);
        if (
          sameAddress &&
          available(opener) &&
          (!modal || modal.contains(opener))
        ) {
          focus(opener);
          if (document.activeElement === opener) followOpener(opener, restore);
          return;
        }
        const fallback =
          (sameAddress ? boundaries : []).find(
            (element) =>
              available(element) && (!modal || modal.contains(element)),
          ) ||
          modal ||
          document.querySelector<HTMLElement>('main, [role="main"]');
        if (available(fallback)) focus(fallback);
      };
      queueMicrotask(restore);
    };
  }, [ref]);
}
