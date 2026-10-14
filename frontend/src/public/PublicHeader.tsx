import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "../brand/Brand";
import { publicSections } from "./content";

export default function PublicHeader() {
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 700px)").matches,
  );
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const links = useRef<HTMLElement>(null);
  const resizeFocus = useRef<"trigger" | "link" | null>(null);
  useEffect(() => {
    const media = matchMedia("(max-width: 700px)");
    const changed = () => {
      resizeFocus.current =
        media.matches && links.current?.contains(document.activeElement)
          ? "trigger"
          : !media.matches && document.activeElement === trigger.current
            ? "link"
            : null;
      setCompact(media.matches);
      setOpen(false);
    };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (resizeFocus.current === "trigger") trigger.current?.focus();
    if (resizeFocus.current === "link")
      links.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    resizeFocus.current = null;
  }, [compact]);
  return (
    <header
      className="silex-public__header"
      onKeyDown={(event) => {
        if (compact && open && event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <a
        className="silex-public__brand-link"
        href="/"
        aria-label="Silex Business — página inicial"
      >
        <Brand width={176} />
      </a>
      <button
        ref={trigger}
        type="button"
        className="silex-public__menu-toggle"
        aria-expanded={!compact || open}
        aria-controls="public-navigation"
        aria-label={
          open ? "Fechar navegação pública" : "Abrir navegação pública"
        }
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X aria-hidden="true" size={22} />
        ) : (
          <Menu aria-hidden="true" size={22} />
        )}
      </button>
      <nav
        id="public-navigation"
        ref={links}
        className="silex-public__nav"
        aria-label="Navegação pública"
        hidden={compact && !open}
      >
        {publicSections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => {
              setOpen(false);
              document
                .getElementById(section.id)
                ?.focus({ preventScroll: true });
            }}
          >
            {section.label}
          </a>
        ))}
      </nav>
      <a
        className="silex-public__button silex-public__button--primary silex-public__header-enter"
        href="/entrar"
      >
        Entrar
      </a>
    </header>
  );
}
