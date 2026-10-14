import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Brand } from "./Brand";

describe("Brand Silex Business", () => {
  it("renderiza o logotipo vetorial oficial no fundo claro com alt acessível", () => {
    const html = renderToStaticMarkup(createElement(Brand));

    expect(html).toContain(
      "/assets/brand/silex-business-logo-fundo-claro-refinado.svg",
    );
    expect(html).toContain('alt="Silex Business"');
    expect(html).toContain("width:176px");
  });

  it("seleciona a logo transparente oficial em fundo escuro", () => {
    const html = renderToStaticMarkup(
      createElement(Brand, { appearance: "dark" }),
    );

    expect(html).toContain(
      "/assets/brand/silex-business-logo-fundo-escuro-transparente.svg",
    );
    expect(html).toContain('alt="Silex Business"');
  });

  it("usa o símbolo oficial em fundo claro e o app icon em fundo escuro", () => {
    const light = renderToStaticMarkup(
      createElement(Brand, { variant: "symbol", width: 32, height: 36 }),
    );
    const dark = renderToStaticMarkup(
      createElement(Brand, { variant: "symbol", appearance: "dark" }),
    );

    expect(light).toContain("silex-business-simbolo-refinado.svg");
    expect(light).toContain('width="32"');
    expect(light).toContain('height="36"');
    expect(dark).toContain("silex-business-app-icon-refinado.svg");
  });

  it("permite texto alternativo personalizado ou imagem decorativa", () => {
    const named = renderToStaticMarkup(
      createElement(Brand, { alt: "Marca da empresa" }),
    );
    const decorative = renderToStaticMarkup(
      createElement(Brand, { decorative: true }),
    );

    expect(named).toContain('alt="Marca da empresa"');
    expect(decorative).toContain('alt=""');
    expect(decorative).toContain('aria-hidden="true"');
  });
});
