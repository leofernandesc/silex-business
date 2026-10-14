import { useEffect, useRef, useState } from "react";

export function useMobileNavigation(authenticated: boolean, page: string) {
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const active = authenticated && compact && open;
  const focusAfterResize = useRef(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 900px)");
    const change = () => {
      focusAfterResize.current =
        media.matches &&
        Boolean(panel.current?.contains(document.activeElement));
      setCompact(media.matches);
      setOpen(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [authenticated, page]);
  useEffect(() => {
    if (compact && focusAfterResize.current) {
      opener.current?.focus({ preventScroll: true });
      focusAfterResize.current = false;
    }
  }, [compact]);
  useEffect(() => {
    if (!active || !panel.current) return;
    const element = panel.current;
    const trigger = opener.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ).filter(
        (item) =>
          item.getClientRects().length > 0 &&
          !item.closest("[inert], [hidden]"),
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (!first || !last) {
        event.preventDefault();
        element.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const keepInside = (event: FocusEvent) => {
      if (!element.contains(event.target as Node)) focusable()[0]?.focus();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", keepInside);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", keepInside);
      // Restore after React removes inert from the background; no focus on an unmounted shell.
      queueMicrotask(() => {
        if (!trigger?.isConnected) return;
        if (matchMedia("(max-width: 900px)").matches)
          trigger.focus({ preventScroll: true });
        else
          element
            .querySelector<HTMLElement>(".nav-item")
            ?.focus({ preventScroll: true });
      });
    };
  }, [active]);
  return { compact, active, panel, opener, setOpen };
}
