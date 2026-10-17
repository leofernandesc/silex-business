import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Home,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  Wallet,
  Banknote,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Clock,
  Receipt,
  ShieldCheck,
  FileClock,
  Truck,
  Settings2,
} from "lucide-react";
import { AuthenticatedHome } from "./home/AuthenticatedHome";
import type { CompanyStatus } from "./home/model";
import { api } from "./api";
import { canAccessRoute, getRoute, routes } from "./navigation/routes";
import { useAppNavigation } from "./navigation/useAppNavigation";
import { useMobileNavigation } from "./navigation/useMobileNavigation";
import { Brand as SilexBrand } from "./brand/Brand";
import { dateOnly, dateTime, labels, money, quantity } from "./format";
import type { Dashboard, User } from "./types";
import type { CompanySettings } from "./types";
import {
  Badge,
  Field,
  Form,
  Notice,
  PageTitle,
  SummaryCard,
  Table,
  useLoad,
} from "./ui";
import { Customers, Products } from "./catalog";
import { CashPage, StockPage } from "./operations";
import { PointOfSale, SalesPage, SaleDetail } from "./sales";
import { FinancePage } from "./finance";
import { LedgerPage } from "./ledger";
import { FinanceCatalog } from "./financeCatalog";
import { PartnerRegistry } from "./partners";
import { FinanceOverview, FinanceReconciliation, FinanceReports } from "./financePlanning";
import { AuditPage, UsersPage } from "./users";
import { CompanySettingsPage } from "./settings";
import { ServiceOrdersPage } from "./serviceOrders";
import type { Sale } from "./types";
import "./overview.css";

const routeIcons: Record<string, typeof LayoutDashboard> = {
  home: Home, dashboard: LayoutDashboard, customers: Users, products: Package, suppliers: Users,
  "day-workers": Users, "subcontracted-freight": Truck, stock: Boxes, pos: ShoppingCart,
  sales: Receipt, "service-orders": Receipt, cash: Banknote, users: ShieldCheck,
  audit: FileClock, "company-settings": Settings2,
};
const menu = routes.filter((route) => route.group !== "financeiro" && route.id !== "finance-suppliers")
  .map((route) => ({ key: route.id, name: route.title, group: route.group, icon: routeIcons[route.id] || Wallet }));
const navGroups = [
  { key: "cadastros", label: "CADASTROS" },
  { key: "movimentacoes", label: "MOVIMENTAÇÕES" },
  { key: "financeiro", label: "FINANCEIRO" },
  { key: "administracao", label: "ADMINISTRAÇÃO" },
];
const financeMenu = routes.filter((route) => route.group === "financeiro")
  .map((route) => ({ key: route.id, name: route.title }));
export default function App() {
  const session = useAppNavigation();
  const { user, ready, page, error } = session;
  const mobileMenu = useMobileNavigation(Boolean(user), page);
  const mobile = mobileMenu.active;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("gestao.nav.groups") || "{}"); }
    catch { return {}; }
  });
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus>("loading");
  useEffect(() => {
    try { localStorage.setItem("gestao.nav.groups", JSON.stringify(openGroups)); } catch { /* preferences are optional */ }
  }, [openGroups]);
  useEffect(() => {
    let current = true;
    setCompany(null);
    setCompanyStatus("loading");
    if (user) api<CompanySettings>("/company-settings")
      .then((value) => { if (current) { setCompany(value); setCompanyStatus("ready"); } })
      .catch(() => { if (current) { setCompany(null); setCompanyStatus("error"); } });
    return () => { current = false; };
  }, [user]);
  useEffect(() => {
    const group = getRoute(page)?.group;
    if (group && group !== "PRINCIPAL") setOpenGroups((current) => ({ ...current, [group]: true }));
  }, [page]);
  function navigate(value: string) {
    mobileMenu.setOpen(false);
    session.navigate(value);
  }
  if (!ready)
    return (
      <div className="loading-screen">
        <SilexBrand
          className="loading-logo"
          variant="logo"
          appearance="dark"
          width={220}
        />
        <p>Preparando seu ambiente...</p>
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={session.onLogin}
        error={error}
        logoutPending={session.logoutPending}
        logoutBusy={session.logoutBusy}
        retryLogout={session.logout}
      />
    );
  const selected = getRoute(page);
  const safePage = canAccessRoute(user, page) ? page : "dashboard";
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        inert={mobile}
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      {mobile && (
        <div className="nav-backdrop" aria-hidden="true" onClick={() => mobileMenu.setOpen(false)} />
      )}
      <aside id="app-navigation" ref={mobileMenu.panel} className={`sidebar ${mobile ? "visible" : ""}`}
        role={mobile ? "dialog" : undefined} aria-modal={mobile ? true : undefined}
        aria-label={mobile ? "Navegação principal" : undefined}
        aria-hidden={mobileMenu.compact && !mobile ? true : undefined}
        inert={mobileMenu.compact && !mobile} tabIndex={-1}>
        <div className="sidebar-brand">
          <SilexBrand
            className="sidebar-logo"
            variant="logo"
            appearance="dark"
            width={154}
          />
          <button
            className="mobile-only icon-button"
            aria-label="Fechar menu"
            onClick={() => mobileMenu.setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-avatar">{(company?.company_name || "G").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{company?.company_name || "Minha empresa"}</strong>
            <small>{company?.company_document || "Identificação da empresa"}</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <nav aria-label="Menu principal">
          {menu.filter((m) => m.group === "PRINCIPAL" && canAccessRoute(user, m.key)).map((m) => (
            <button key={m.key} className={`nav-item ${(safePage === m.key) ? "active" : ""}`} aria-current={safePage === m.key ? "page" : undefined} onClick={() => navigate(m.key)}>
              <m.icon size={18} /><span>{m.name}</span>
            </button>
          ))}
          {navGroups.map((group) => {
            const visibleItems = menu.filter((m) => m.group === group.key && canAccessRoute(user, m.key));
            const financialItems = financeMenu.filter((item) => canAccessRoute(user, item.key));
            if (!visibleItems.length && !(group.key === "financeiro" && financialItems.length)) return null;
            const expanded = Boolean(openGroups[group.key]);
            return <section className="nav-section" key={group.key}>
              <button className="nav-group-toggle" aria-expanded={expanded} aria-controls={`nav-group-${group.key}`} onClick={() => setOpenGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}>
                <span>{group.label}</span><ChevronDown size={14} className={expanded ? "expanded" : ""} />
              </button>
              <div id={`nav-group-${group.key}`} hidden={!expanded}>
              {expanded && visibleItems.map((m) => (
              <div key={m.key}>
                <button
                  className={`nav-item ${(safePage === m.key) ? "active" : ""}`}
                  aria-current={safePage === m.key ? "page" : undefined}
                  onClick={() => navigate(m.key)}
                >
                  <m.icon size={17} />
                  <span>{m.name}</span>
                </button>
              </div>
              ))}
              {expanded && group.key === "financeiro" && financialItems.map((item) => <button key={item.key} className={`nav-item ${safePage === item.key ? "active" : ""}`} aria-current={safePage === item.key ? "page" : undefined} onClick={() => navigate(item.key)}><Wallet size={16} /><span>{item.name}</span></button>)}
              </div>
            </section>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" />
          <span>
            Silex Business <small>Cadastros e operações</small>
          </span>
        </div>
      </aside>
      <div className="main-shell" inert={mobile}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-only icon-button"
              aria-label="Abrir menu"
              ref={mobileMenu.opener}
              aria-expanded={mobile}
              aria-controls="app-navigation"
              aria-haspopup="dialog"
              onClick={() => mobileMenu.setOpen(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Silex Business <ChevronRight size={13} />
              <strong>{selected?.title || "Visão geral"}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <div className="user-profile">
              <span className="user-avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{labels[user.role]}</small>
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Sair"
              onClick={session.logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} key={safePage} className={safePage === "dashboard" ? "silex-overview" : undefined}>
          {error && <Notice>{error}</Notice>}
          {safePage === "home" && <AuthenticatedHome user={user} company={company} companyStatus={companyStatus} navigate={navigate} />}
          {safePage === "dashboard" && (
            <DashboardPage user={user} navigate={navigate} />
          )}{" "}
          {safePage === "customers" && <Customers user={user} />}{" "}
          {safePage === "products" && <Products user={user} />}{" "}
          {safePage === "stock" && <StockPage />}{" "}
          {safePage === "cash" && <CashPage />}{" "}
          {safePage === "pos" && (
            <PointOfSale user={user} navigate={navigate} />
          )}{" "}
          {safePage === "sales" && (
            <SalesPage user={user} navigate={navigate} />
          )}{" "}
          {safePage === "suppliers" && <PartnerRegistry kind="supplier" />}
          {safePage === "day-workers" && <PartnerRegistry kind="day_worker" />}
          {safePage === "subcontracted-freight" && <PartnerRegistry kind="subcontracted_freight" />}
          {safePage === "finance" && <LedgerPage />}
          {safePage === "finance-dashboard" && <FinanceOverview navigate={navigate} />}
          {safePage === "finance-reconcile" && <FinanceReconciliation />}
          {safePage === "finance-reports" && <FinanceReports />}
          {safePage === "finance-payable" && (
            <FinancePage initialDirection="expense" />
          )}
          {safePage === "finance-receivable" && (
            <FinancePage initialDirection="income" />
          )}
          {safePage === "finance-accounts" && (
            <FinanceCatalog kind="accounts" />
          )}
          {safePage === "finance-categories" && (
            <FinanceCatalog kind="categories" />
          )}
          {safePage === "finance-subcategories" && (
            <FinanceCatalog kind="subcategories" />
          )}
          {safePage === "finance-suppliers" && (
            <PartnerRegistry kind="supplier" />
          )}{" "}
          {safePage === "users" && <UsersPage current={user} />}{" "}
          {safePage === "audit" && <AuditPage />}
          {safePage === "company-settings" && user.role === "admin" && <CompanySettingsPage onSaved={setCompany} />}
          {safePage === "service-orders" && user.role === "admin" && <ServiceOrdersPage />}
        </main>
        <footer className="app-footer">
          <span>Silex Business · Gestão empresarial</span>
          <span>Horário de Manaus · Valores em reais</span>
        </footer>
      </div>
    </div>
  );
}
function Login({
  onLogin,
  error,
  logoutPending,
  logoutBusy,
  retryLogout,
}: {
  onLogin: (u: User) => void;
  error: string;
  logoutPending: boolean;
  logoutBusy: boolean;
  retryLogout: () => Promise<void>;
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  return (
    <div className="login-page">
      <section className="login-intro">
        <SilexBrand
          className="login-logo-dark"
          variant="logo"
          appearance="dark"
          width={218}
        />
        <div className="login-intro-content">
          <span className="eyebrow">SIMPLES. PRÓXIMO. ORGANIZADO.</span>
          <h1>
            Mais clareza para
            <br />o seu negócio.
          </h1>
          <p>
            Vendas, estoque e financeiro
            <br />
            juntos no seu dia a dia.
          </p>
          <div className="login-decoration">
            <div>
              <ShoppingCart />
              <span>Vendas</span>
              <CheckIcon />
            </div>
            <div>
              <Package />
              <span>Estoque</span>
              <CheckIcon />
            </div>
            <div>
              <Wallet />
              <span>Financeiro</span>
              <CheckIcon />
            </div>
          </div>
        </div>
        <small>Silex Business · Cadastros, operações e financeiro</small>
      </section>
      <section className="login-form">
        <div className="login-card">
          <div className="login-mobile-brand">
            <SilexBrand
              className="login-logo-light"
              variant="logo"
              appearance="light"
              width={190}
            />
          </div>
          <span className="eyebrow">BEM-VINDO</span>
          <h2>Acesse seu espaço</h2>
          <p>Entre para acompanhar suas operações.</p>
          {error && <Notice>{error}</Notice>}
        {logoutPending && <button type="button" disabled={logoutBusy} onClick={retryLogout}>Concluir saída no servidor</button>}
          <Form
            submit="Entrar"
            onSubmit={async () => {
              if (logoutPending) throw new Error("Conclua a saída no servidor antes de entrar novamente.");
              onLogin(
                await api<User>("/auth/login", "POST", { username, password }),
              );
              setPassword("");
            }}
          >
            <Field label="Usuário">
              <input
                autoFocus
                required
                disabled={logoutPending}
              autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu usuário"
              />
            </Field>
            <Field label="Senha">
              <input
                required
                type="password"
                disabled={logoutPending}
              autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
            </Field>
          </Form>
          <div className="login-note">
            <ShieldCheck size={17} />
            Acesso restrito aos usuários cadastrados.
          </div>
        </div>
      </section>
    </div>
  );
}
function CheckIcon() {
  return <ShieldCheck size={18} className="positive" />;
}
function DashboardPage({
  user,
  navigate,
}: {
  user: User;
  navigate: (p: string) => void;
}) {
  const result = useLoad<Dashboard>("/dashboard"),
    [view, setView] = useState<Sale | null>(null),
    d = result.data;
  if (result.error) return <Notice>{result.error}</Notice>;
  if (!d) return <div className="empty">Carregando resumo...</div>;
  return (
    <>
      <PageTitle
        title="Visão geral"
        subtitle={`Olá, ${user.name.split(" ")[0]}. Confira o movimento do seu negócio.`}
      >
        <span className="today-chip">
          <Clock size={15} />
          {dateOnly(d.date)}
        </span>
      </PageTitle>
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">TUDO EM UM SÓ LUGAR</span>
          <h2>Uma nova venda começa por aqui.</h2>
          <p>Consulte seus itens, monte o pedido e acompanhe o resultado.</p>
        </div>
        <button onClick={() => navigate("pos")}>
          Iniciar venda <ArrowRight size={18} />
        </button>
        <ShoppingCart className="banner-icon" />
      </section>
      <div className="summary-grid overview-summary" role="region" aria-label="Indicadores da Visão Geral" aria-describedby="overview-values-help" tabIndex={0}>
        <SummaryCard
          label="Vendas hoje"
          value={money(d.sales_today_cents)}
          detail={`${d.sales_today_count} venda${d.sales_today_count !== 1 ? "s" : ""} finalizada${d.sales_today_count !== 1 ? "s" : ""}`}
          icon={<TrendingUp />}
          tone="teal"
        />
        <SummaryCard
          label="Vendas no mês"
          value={money(d.sales_month_cents)}
          detail="Inclui vendas à vista e a prazo."
          icon={<Receipt />}
        />
        {user.role === "admin" ? (
          <>
            <SummaryCard
              label="A receber"
              value={money(d.receivable_cents || 0)}
              detail="Valores ainda em aberto."
              icon={<Wallet />}
              tone="purple"
            />
            <SummaryCard
              label="Recebíveis vencidos"
              value={money(d.overdue_cents || 0)}
              detail="Acompanhe os vencimentos."
              icon={<Clock />}
              tone="amber"
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="Dinheiro esperado"
              value={money(d.cash?.expected_cents || 0)}
              detail="Saldo do seu caixa aberto."
              icon={<Banknote />}
              tone="purple"
            />
            <SummaryCard
              label="Itens ativos"
              value={String(d.active_products)}
              detail="Produtos e serviços disponíveis."
              icon={<Package />}
              tone="amber"
            />
          </>
        )}
      </div>
      <p id="overview-values-help" className="overview-values-help">Se necessário, deslize ou use as setas para conferir os valores completos.</p>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Últimas vendas</h2>
              <p>Pedidos finalizados mais recentes</p>
            </div>
            <button className="text-button" onClick={() => navigate("sales")}>
              Ver todas <ArrowRight size={15} />
            </button>
          </div>
          <Table
            headers={["Venda / cliente", "Pagamento", "Valor"]}
            empty={!d.recent_sales.length}
          >
            {d.recent_sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <button className="text-button" onClick={() => setView(s)}>
                    #{s.id} · {s.customer_name}
                  </button>
                  <small>{dateTime(s.created_at)}</small>
                </td>
                <td>
                  <Badge status={s.payment_method || ""} />
                </td>
                <td className="numeric">{money(s.total_cents)}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Atenção ao estoque</h2>
              <p>Produtos com saldo menor que 5 unidades</p>
            </div>
            <Package size={19} />
          </div>
          <div className="stock-alerts">
            {d.low_stock.length ? (
              d.low_stock.map((p) => (
                <div key={p.id}>
                  <span className="stock-alert-icon">
                    <Package size={19} />
                  </span>
                  <div>
                    <strong>{p.description}</strong>
                    <small>{p.code}</small>
                  </div>
                  <b>
                    {quantity(p.stock_milli)} {p.unit}
                  </b>
                </div>
              ))
            ) : (
              <div className="empty">Nenhum item abaixo do limite.</div>
            )}
          </div>
          <button className="panel-link" onClick={() => navigate("products")}>
            Consultar catálogo <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="cash-strip">
        <span className={`cash-dot ${d.cash ? "is-open" : ""}`} />
        <div>
          <strong>
            {d.cash ? "Seu caixa está aberto" : "Seu caixa está fechado"}
          </strong>
          <span>
            {d.cash
              ? `Dinheiro esperado: ${money(d.cash.expected_cents)}`
              : "Abra um turno para registrar novas vendas."}
          </span>
        </div>
        <button onClick={() => navigate("cash")}>
          Gerenciar caixa <ArrowRight size={16} />
        </button>
      </section>
      {view && (
        <SaleDetail
          sale={view}
          user={user}
          close={() => setView(null)}
          onChange={() => {
            setView(null);
            navigate("sales");
          }}
        />
      )}
    </>
  );
}
