import { useEffect } from "react";
import { ArrowRight, Boxes, ShoppingCart, Users, Wallet } from "lucide-react";
import { Brand } from "../brand/Brand";
import PublicHeader from "./PublicHeader";
import { FinanceDemo, SalesDemo } from "./ProductDemo";
import {
  modules,
  PUBLIC_DESCRIPTION,
  PUBLIC_TITLE,
  publicSections,
} from "./content";
import "./public.css";

const icons = [Users, ShoppingCart, Boxes, Wallet];
export default function PublicPage() {
  useEffect(() => {
    const oldTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const oldDescription = description?.content;
    const section = location.hash.slice(1);
    if (
      section === "public-content" ||
      publicSections.some((item) => item.id === section)
    ) {
      const target = document.getElementById(section);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    }
    document.title = PUBLIC_TITLE;
    if (description) description.content = PUBLIC_DESCRIPTION;
    return () => {
      document.title = oldTitle;
      if (description && oldDescription !== undefined)
        description.content = oldDescription;
    };
  }, []);
  return (
    <div className="silex-public">
      <a className="silex-public__skip" href="#public-content">
        Pular para o conteúdo
      </a>
      <PublicHeader />
      <main
        id="public-content"
        tabIndex={-1}
        className="silex-public__container"
      >
        <section className="silex-public__hero" aria-labelledby="public-title">
          <div>
            <span className="silex-public__eyebrow">
              Silex Business · Gestão empresarial
            </span>
            <h1 id="public-title">
              Sua empresa,
              <br />
              organizada em
              <br />
              <em>um só lugar.</em>
            </h1>
            <p className="silex-public__lead">
              Centralize cadastros, vendas, estoque e financeiro. Uma visão mais
              clara da rotina para acompanhar cada etapa do seu negócio.
            </p>
            <div className="silex-public__hero-actions">
              <a
                className="silex-public__button silex-public__button--primary"
                href="/entrar"
              >
                Acessar o sistema <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a className="silex-public__button" href="#modulos">
                Conhecer os módulos
              </a>
            </div>
            <p className="silex-public__footnote">
              Organização para a gestão de pequenas e médias empresas.
            </p>
          </div>
          <FinanceDemo />
        </section>
        <section
          id="modulos"
          tabIndex={-1}
          className="silex-public__section"
          aria-labelledby="modules-title"
        >
          <span className="silex-public__eyebrow">
            Do cadastro ao financeiro
          </span>
          <h2 id="modules-title">Módulos que conectam sua rotina</h2>
          <div className="silex-public__modules">
            {modules.map((module, index) => {
              const Icon = icons[index];
              return (
                <article className="silex-public__module" key={module.title}>
                  <div className="silex-public__feature-icon">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <ul>
                    {module.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <div className="silex-public__operations">
            <h3>Serviços e operações</h3>
            <p>
              Organize serviços e pedidos, vincule custos e consulte os títulos
              gerados. Cadastre diaristas e frete subcontratado com suas chaves
              PIX para consulta na rotina financeira.
            </p>
          </div>
        </section>
        <section
          id="demonstracao"
          tabIndex={-1}
          className="silex-public__section silex-public__sales-section"
          aria-labelledby="demo-title"
        >
          <div>
            <span className="silex-public__eyebrow">
              Informação com clareza
            </span>
            <h2 id="demo-title">Suas vendas, organizadas para consulta.</h2>
            <p>
              Consulte vendas pelo número ou cliente e acompanhe data, forma de
              pagamento, total e situação. Rascunhos e vendas finalizadas
              identificados em cada registro.
            </p>
            <span className="silex-public__pill">
              Exemplo fictício · sem integração
            </span>
          </div>
          <SalesDemo />
        </section>
        <section
          id="beneficios"
          tabIndex={-1}
          className="silex-public__section"
          aria-labelledby="benefits-title"
        >
          <span className="silex-public__eyebrow">
            Mais organização na operação
          </span>
          <h2 id="benefits-title">Clareza para acompanhar o negócio</h2>
          <div className="silex-public__benefits">
            <article>
              <span>01 / CENTRALIZAR</span>
              <h3>Cadastros organizados</h3>
              <p>
                Consulte as informações utilizadas na rotina sem depender de
                registros dispersos.
              </p>
            </article>
            <article>
              <span>02 / ACOMPANHAR</span>
              <h3>Operações visíveis</h3>
              <p>
                Encontre vendas, estoque e movimentos financeiros em telas
                dedicadas.
              </p>
            </article>
            <article>
              <span>03 / CONSULTAR</span>
              <h3>Acesso pelo navegador</h3>
              <p>
                Use uma interface clara, filtros e consultas para acompanhar os
                registros da empresa.
              </p>
            </article>
          </div>
        </section>
        <section className="silex-public__close" aria-labelledby="close-title">
          <div>
            <h2 id="close-title">Uma gestão mais organizada começa aqui.</h2>
            <p>Acesse o ambiente da sua empresa na Silex Business.</p>
          </div>
          <a
            className="silex-public__button silex-public__button--light"
            href="/entrar"
          >
            Entrar no sistema <ArrowRight aria-hidden="true" size={18} />
          </a>
        </section>
      </main>
      <footer className="silex-public__footer">
        <div>
          <Brand width={130} decorative />
          <p>Silex Business · Gestão empresarial</p>
        </div>
        <nav aria-label="Navegação do rodapé">
          {publicSections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>
              {section.label}
            </a>
          ))}
          <a href="/entrar">Entrar</a>
        </nav>
      </footer>
    </div>
  );
}
