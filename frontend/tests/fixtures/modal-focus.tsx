// Browser component fixture: imports the production Modal; never part of the ERP build.
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Form, Modal } from "../../src/ui";
import "../../src/styles.css";
import "../../src/styles/tokens.css";
function Fixture() {
  const mode = new URLSearchParams(location.search).get("mode") || "normal";
  const [open, setOpen] = useState(false),
    [nested, setNested] = useState(false);
  const [gone, setGone] = useState(false),
    [route, setRoute] = useState(false);
  const next = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (route) next.current?.focus();
  }, [route]);
  useEffect(() => {
    const navigate = () => {
      setOpen(false);
      setRoute(true);
    };
    addEventListener("hashchange", navigate);
    return () => removeEventListener("hashchange", navigate);
  }, []);
  async function confirm() {
    if (mode.startsWith("late-")) {
      setOpen(false);
      await fetch("/tests/fixtures/modal-focus.html");
      const trigger =
        document.querySelector<HTMLButtonElement>("main > button");
      if (mode === "late-removed") setGone(true);
      if (mode === "late-disabled" && trigger) trigger.disabled = true;
      if (mode === "late-hidden" && trigger) trigger.style.display = "none";
      return;
    }
    if (mode === "async") await fetch("/tests/fixtures/modal-focus.html");
    if (mode === "removed") setGone(true);
    const opener = document.querySelector<HTMLButtonElement>("main > button");
    if (mode === "hidden" && opener) {
      opener.hidden = true;
      opener.style.display = "none";
    }
    if (mode === "disabled" && opener) opener.disabled = true;
    setOpen(false);
    if (mode === "route") setRoute(true);
  }
  return (
    <main tabIndex={-1} aria-label="Área de trabalho de teste">
      {route ? (
        <h1 tabIndex={-1} ref={next}>
          Novo destino
        </h1>
      ) : (
        <>
          <h1>Ensaio de componente — dados fictícios</h1>
          {!gone && (
            <button onClick={() => setOpen(true)}>Abrir diálogo</button>
          )}
          <button onClick={() => setGone(true)}>Próxima ação</button>
          {open && (
            <Modal title="Diálogo de teste" close={() => setOpen(false)}>
              <Form
                cancel={() => setOpen(false)}
                submit="Confirmar"
                onSubmit={confirm}
              >
                <label>
                  Nome
                  <input autoFocus={mode === "autofocus"} />
                </label>
                <label>
                  Indisponível
                  <input disabled />
                </label>
                <a href="#destination">Navegar para outro destino</a>
                <button type="button" hidden style={{ display: "none" }}>
                  Oculto
                </button>
                <button type="button" onClick={() => setNested(true)}>
                  Abrir segundo diálogo
                </button>
              </Form>
              {nested && (
                <Modal title="Segundo diálogo" close={() => setNested(false)}>
                  <p>Conteúdo complementar.</p>
                  <button onClick={() => setNested(false)}>
                    Voltar ao primeiro
                  </button>
                </Modal>
              )}
            </Modal>
          )}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
