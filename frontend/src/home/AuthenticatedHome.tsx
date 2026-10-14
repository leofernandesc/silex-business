import {
  ArrowRight,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { MouseEvent } from "react";
import { Brand } from "../brand/Brand";
import { appUrl, type RouteId } from "../navigation/routes";
import type { CompanySettings, User } from "../types";
import {
  companyPresentation,
  homeNavigation,
  type CompanyStatus,
} from "./model";
import "./home.css";

const icons: Partial<Record<RouteId, LucideIcon>> = {
  pos: ShoppingCart,
  sales: Receipt,
  customers: Users,
  products: Package,
  finance: Wallet,
  "finance-payable": Banknote,
  "finance-receivable": Banknote,
  "service-orders": BriefcaseBusiness,
  stock: Boxes,
};
const areas = [
  {
    group: "cadastros",
    title: "Cadastros e catálogo",
    description: "Organize os cadastros disponíveis para o seu perfil.",
    icon: Users,
  },
  {
    group: "movimentacoes",
    title: "Comercial e operações",
    description: "Acesse suas áreas de trabalho e acompanhe as operações.",
    icon: BriefcaseBusiness,
  },
  {
    group: "financeiro",
    title: "Gestão financeira",
    description:
      "Consulte os recursos financeiros disponíveis para o seu perfil.",
    icon: Wallet,
  },
] as const;

type Props = {
  user: User;
  company: CompanySettings | null;
  companyStatus: CompanyStatus;
  navigate: (id: string) => void;
};

/** Uses only authenticated shell state. No queries, indicators or authorization policy. */
export function AuthenticatedHome({
  user,
  company,
  companyStatus,
  navigate,
}: Props) {
  const navigation = homeNavigation(user);
  const business = companyPresentation(company);
  function follow(event: MouseEvent<HTMLAnchorElement>, id: RouteId) {
    // Preserve native new-tab, copy-link and modified-click behavior.
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(id);
  }
  function routeLink(
    route: (typeof navigation.available)[number],
    className: string,
    icon = false,
  ) {
    const Icon = icons[route.id] || ArrowRight;
    return (
      <a
        key={route.id}
        className={className}
        href={appUrl(route.id)}
        data-home-route={route.id}
        onClick={(event) => follow(event, route.id)}
      >
        {icon && <Icon size={21} aria-hidden="true" />}
        <span>{route.title}</span>
        {!icon && <ArrowRight size={16} aria-hidden="true" />}
      </a>
    );
  }
  const administration = navigation.remaining.filter(
    (route) => route.group === "administracao",
  );
  return (
    <div className="silex-home">
      <header className="silex-home__heading">
        <h1>Página inicial</h1>
        <p>
          Bem-vindo à Silex Business
          {user.name.trim() ? `, ${user.name.trim()}` : ""}. Acesse os módulos
          da sua empresa.
        </p>
      </header>

      <section
        className="silex-home__company"
        aria-labelledby="home-company-title"
        aria-busy={companyStatus === "loading"}
      >
        <div>
          <p className="silex-home__eyebrow">Seu ambiente empresarial</p>
          <h2 id="home-company-title">
            {companyStatus === "ready"
              ? business.name
              : companyStatus === "loading"
                ? "Carregando identificação empresarial…"
                : "Identificação empresarial indisponível"}
          </h2>
          {companyStatus === "ready" ? (
            business.details.length ? (
              <dl className="silex-home__details">
                {business.details.map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Documento e contatos não informados.</p>
            )
          ) : (
            <p role="status">
              {companyStatus === "loading"
                ? "Consultando a configuração já utilizada pelo sistema."
                : "Não foi possível carregar os dados da empresa. Os atalhos continuam disponíveis."}
            </p>
          )}
        </div>
        <Brand variant="symbol" width={72} height={74} decorative />
      </section>

      <section aria-labelledby="home-shortcuts-title">
        <div className="silex-home__section-heading">
          <h2 id="home-shortcuts-title">Acesso rápido</h2>
          <p>Os atalhos disponíveis para o seu perfil.</p>
        </div>
        <div className="silex-home__quick">
          {navigation.quick.map((route) =>
            routeLink(route, "silex-home__shortcut", true),
          )}
        </div>
      </section>

      <section aria-labelledby="home-areas-title">
        <div className="silex-home__section-heading">
          <h2 id="home-areas-title">Seu ambiente de gestão</h2>
          <p>Encontre a informação certa em cada módulo.</p>
        </div>
        <div className="silex-home__areas">
          {areas.map((area) => {
            const available = navigation.available.filter(
              (route) => route.group === area.group,
            );
            if (!available.length) return null;
            const remaining = navigation.remaining.filter(
              (route) => route.group === area.group,
            );
            return (
              <section
                className="silex-home__area"
                key={area.group}
                aria-labelledby={`home-area-${area.group}`}
              >
                <span className="silex-home__area-icon">
                  <area.icon size={22} aria-hidden="true" />
                </span>
                <h3 id={`home-area-${area.group}`}>{area.title}</h3>
                <p>{area.description}</p>
                {remaining.length ? (
                  <ul>
                    {remaining.map((route) => (
                      <li key={route.id}>
                        {routeLink(route, "silex-home__module")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="silex-home__hint">
                    Acesse pelos atalhos acima.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </section>

      {navigation.overview && (
        <section
          className="silex-home__overview"
          aria-labelledby="home-overview-title"
        >
          <div>
            <h2 id="home-overview-title">
              Os indicadores continuam na Visão Geral.
            </h2>
            <p>
              Consulte os resumos e acompanhe suas operações em uma tela
              independente.
            </p>
          </div>
          <a
            className="silex-home__overview-link"
            href={appUrl(navigation.overview.id)}
            data-home-route={navigation.overview.id}
            onClick={(event) => follow(event, navigation.overview!.id)}
          >
            <ArrowRight size={18} aria-hidden="true" />
            Abrir Visão Geral
          </a>
        </section>
      )}

      {administration.length > 0 && (
        <section
          className="silex-home__administration"
          aria-labelledby="home-admin-title"
        >
          <h2 id="home-admin-title">Administração</h2>
          <ul>
            {administration.map((route) => (
              <li key={route.id}>{routeLink(route, "silex-home__module")}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
