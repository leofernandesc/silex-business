import {dreHref} from "./dreNavigation";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { query } from "./api";
import { dateOnly, localDate, money } from "./format";
import { SilexDatePicker } from "./SilexDatePicker";
import { LedgerTable } from "./ledgerPresentation";
import {
  MonthlyValuesTable,
  financialMonthLabel,
} from "./dashboardPresentation";
import { PageTitle, Notice, SummaryCard } from "./ui";
import { civilDate } from "./civilDates";
import { useFinancialSnapshot } from "./useFinancialSnapshot";
import {
  validDashboard,
  validDuePage,
  type FinanceDash,
  type DuePage,
} from "./financialData";
import {
  financialHref,
  initialFinancialSearch,
  syncFinancialSearch,
} from "./financialNavigation";
import "./financialDashboard.css";
const classificationLabels: Record<string, string> = {
  operating: "Operacional",
  investment: "Investimento",
  financing: "Financiamento",
};
function DueCard({
  snapshot,
  mainReady,
  pending,
  direction,
}: {
  snapshot: ReturnType<typeof useFinancialSnapshot<DuePage>>;
  mainReady: boolean;
  pending: boolean;
  direction: "income" | "expense";
}) {
  const data =
    mainReady && !snapshot.loading && !snapshot.error ? snapshot.data : null;
  const start = data?.summary.as_of_date,
    end = start ? civilDate(start)!.add({ days: 7 }).toString() : "";
  return (
    <div>
      <SummaryCard
        icon={direction === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
        label={
          direction === "income"
            ? "A receber: hoje e 7 dias seguintes"
            : "A pagar: hoje e 7 dias seguintes"
        }
        value={data ? money(data.summary.due_7_days_cents) : "—"}
        detail={
          data
            ? `${dateOnly(start!)} até ${dateOnly(end)}, inclusive`
            : pending || snapshot.loading
              ? "Aguardando consulta"
              : "Dados indisponíveis"
        }
      />
      {data && (
        <a
          className="dashboard-query-link"
          href={financialHref(
            direction === "income" ? "finance-receivable" : "finance-payable",
            { direction, status: "pending", date_field: "due", start, end },
          )}
        >
          Consultar próximos vencimentos{" "}
          {direction === "income" ? "a receber" : "a pagar"}
        </a>
      )}
      {mainReady && !snapshot.loading && snapshot.error && (
        <Notice>
          Não foi possível consultar estes vencimentos. Clique em Atualizar para
          tentar novamente.
        </Notice>
      )}
    </div>
  );
}
/** Retains the existing entrypoint contract while shortcuts use shareable, filtered URLs. */
export function FinanceOverview(_props: { navigate: (id: string) => void }) {
  const today = localDate(),
    defaults = { start: today.slice(0, 7) + "-01", end: today };
  const [applied, setApplied] = useState(
    () =>
      ({ ...defaults, ...initialFinancialSearch("dashboard") }) as {
        start: string;
        end: string;
      },
  );
  const [start, setStart] = useState(applied.start),
    [end, setEnd] = useState(applied.end),
    [refreshKey, setRefreshKey] = useState(0),
    [invalid, setInvalid] = useState("");
  const result = useFinancialSnapshot<FinanceDash>(
    "/finance/dashboard?" + query(applied),
    refreshKey,
    validDashboard,
  );
  const receivable = useFinancialSnapshot<DuePage>(
    "/finance?direction=income&status=pending&page_size=1",
    refreshKey,
    validDuePage,
  );
  const payable = useFinancialSnapshot<DuePage>(
    "/finance?direction=expense&status=pending&page_size=1",
    refreshKey,
    validDuePage,
  );
  const pending = result.loading,
    data = !pending && !result.error ? result.data : null,
    unavailable = !pending && !data;
  const unavailableDetail = pending
    ? "Aguardando consulta"
    : "Dados indisponíveis";
  function update() {
    if (!civilDate(start) || !civilDate(end)) {
      setInvalid(
        "Informe as duas datas do período. O período aplicado permanece indicado abaixo.",
      );
      return;
    }
    setInvalid("");
    setApplied({ start, end });
    syncFinancialSearch("dashboard", { start, end });
    setRefreshKey((v) => v + 1);
  }
  const peak = Math.max(
    1,
    ...(data?.monthly || []).flatMap((x) => [x.income_cents, x.expense_cents]),
  );
  return (
    <div className="silex-financial-dashboard" aria-busy={pending}>
      <PageTitle
        title="Visão financeira"
        subtitle="Movimentos, títulos em aberto, saldos por conta e resultado por competência."
      />
      <p><a href={dreHref()}>Consultar DRE gerencial por competência econômica nos relatórios</a></p>
      <form
        className="panel toolbar dashboard-period"
        onSubmit={(e) => {
          e.preventDefault();
          update();
        }}
      >
        <SilexDatePicker
          label="De"
          value={start}
          onChange={(value) => setStart(value)}
        />
        <SilexDatePicker
          label="Até"
          value={end}
          onChange={(value) => setEnd(value)}
        />
        <button className="primary">Atualizar</button>
      </form>
      {invalid && <Notice>{invalid}</Notice>}
      <p className="help" aria-label="Período aplicado">
        Período aplicado: {dateOnly(applied.start)} até {dateOnly(applied.end)}.
        Realizado por data de lançamento da baixa; resultado por competência das
        baixas.
      </p>
      {(start !== applied.start || end !== applied.end) && (
        <p className="help">Há alterações de período ainda não aplicadas.</p>
      )}
      {pending && (
        <p className="dashboard-loading" role="status">
          Carregando informações financeiras…
        </p>
      )}
      {unavailable && (
        <Notice>
          {result.error?.includes("Data inicial deve ser anterior à final")
            ? "Período inválido: Data inicial deve ser anterior à final. Ajuste o período e clique em Atualizar."
            : "Não foi possível consultar os dados da Visão financeira. Confira a conexão e clique em Atualizar para tentar novamente."}
        </Notice>
      )}
      <section
        className="dashboard-indicators"
        aria-labelledby="financial-period-title"
      >
        <h2 id="financial-period-title">Movimentações do período</h2>
        <p className="help">
          Pela data de lançamento. Os valores abaixo não incluem o saldo
          inicial.
        </p>
        <div className="summary-grid three">
          <div>
            <SummaryCard
              label="Entradas no período"
              value={data ? money(data.income_cents) : "—"}
              detail={
                data ? `${data.movement_count} movimentos` : unavailableDetail
              }
              tone="teal"
              icon={<ArrowDownLeft />}
            />
            {data && (
              <a
                className="dashboard-query-link"
                href={financialHref("finance", {
                  direction: "income",
                  date_field: "posting",
                  ...applied,
                })}
              >
                Consultar entradas realizadas
              </a>
            )}
          </div>
          <div>
            <SummaryCard
              label="Saídas no período"
              value={data ? money(data.expense_cents) : "—"}
              detail={data ? "Inclui encargos e estornos" : unavailableDetail}
              tone="amber"
              icon={<ArrowUpRight />}
            />
            {data && (
              <a
                className="dashboard-query-link"
                href={financialHref("finance", {
                  direction: "expense",
                  date_field: "posting",
                  ...applied,
                })}
              >
                Consultar saídas realizadas
              </a>
            )}
          </div>
          <SummaryCard
            label="Saldo do período"
            value={data ? money(data.net_cents) : "—"}
            detail={data ? "Não inclui saldo inicial" : unavailableDetail}
            icon={<Scale />}
          />
        </div>
      </section>
      <section
        className="dashboard-indicators dashboard-current"
        aria-labelledby="financial-current-title"
      >
        <h2 id="financial-current-title">Títulos em aberto e saldo atual</h2>
        <p className="help">
          Situação atual, independente do período selecionado. Vencido considera
          datas anteriores a hoje.
        </p>
        <div className="summary-grid three">
          <div>
            <SummaryCard
              label="A receber"
              value={data ? money(data.receivable_open_cents) : "—"}
              detail={
                data
                  ? `Vencido ${money(data.receivable_overdue_cents)}`
                  : unavailableDetail
              }
              tone="teal"
              icon={<ArrowDownLeft />}
            />
            {data && (
              <div className="dashboard-query-links">
                <a
                  className="dashboard-query-link"
                  href={financialHref("finance-receivable", {
                    direction: "income",
                    status: "pending",
                    date_field: "due",
                    start: "",
                    end: "",
                  })}
                >
                  Consultar a receber em aberto
                </a>
                <a
                  className="dashboard-query-link"
                  href={financialHref("finance-receivable", {
                    direction: "income",
                    status: "overdue",
                    date_field: "due",
                    start: "",
                    end: "",
                  })}
                >
                  Consultar recebimentos vencidos
                </a>
              </div>
            )}
          </div>
          <div>
            <SummaryCard
              label="A pagar"
              value={data ? money(data.payable_open_cents) : "—"}
              detail={
                data
                  ? `Vencido ${money(data.payable_overdue_cents)}`
                  : unavailableDetail
              }
              icon={<ArrowUpRight />}
            />
            {data && (
              <div className="dashboard-query-links">
                <a
                  className="dashboard-query-link"
                  href={financialHref("finance-payable", {
                    direction: "expense",
                    status: "pending",
                    date_field: "due",
                    start: "",
                    end: "",
                  })}
                >
                  Consultar a pagar em aberto
                </a>
                <a
                  className="dashboard-query-link"
                  href={financialHref("finance-payable", {
                    direction: "expense",
                    status: "overdue",
                    date_field: "due",
                    start: "",
                    end: "",
                  })}
                >
                  Consultar pagamentos vencidos
                </a>
              </div>
            )}
          </div>
          <SummaryCard
            label="Saldo atual total"
            value={
              data?.accounts.length
                ? money(data.accounts.reduce((n, a) => n + a.balance_cents, 0))
                : "—"
            }
            detail={
              data
                ? data.accounts.length
                  ? "Saldo registrado no ERP: saldo inicial + histórico"
                  : "Nenhuma conta cadastrada; saldo não informado"
                : unavailableDetail
            }
            icon={<Scale />}
          />
        </div>
      </section>
      <section
        className="dashboard-indicators"
        aria-labelledby="financial-due-title"
      >
        <h2 id="financial-due-title">Vencimentos: hoje e 7 dias seguintes</h2>
        <p className="help">
          Principal pendente da data atual do servidor até o 7º dia seguinte,
          inclusive (8 datas possíveis). Independente do período realizado acima;
          inclui parcelas em aberto.
        </p>
        <div className="summary-grid dashboard-due-grid">
          <DueCard
            snapshot={receivable}
            mainReady={!!data}
            pending={pending}
            direction="income"
          />
          <DueCard
            snapshot={payable}
            mainReady={!!data}
            pending={pending}
            direction="expense"
          />
        </div>
      </section>
      <section
        className="panel dashboard-monthly"
        aria-labelledby="financial-monthly-title"
      >
        <div className="panel-heading">
          <div>
            <h2 id="financial-monthly-title">Movimentos por mês</h2>
            <p>
              12 meses até o mês da data final, considerando cada mês completo.
            </p>
          </div>
        </div>
        {data ? (
          <>
            <div className="dashboard-chart-legend">
              <span>
                <i className="bar-income" aria-hidden="true" />
                Entradas
              </span>
              <span>
                <i className="bar-expense" aria-hidden="true" />
                Saídas
              </span>
            </div>
            <p id="financial-chart-help" className="help">
              Escala proporcional ao maior valor, com altura mínima para
              visualizar as barras. Em telas estreitas, role o gráfico com as
              setas do teclado. Consulte os valores exatos na tabela abaixo.
            </p>
            <div
              className="dashboard-chart-scroll"
              tabIndex={0}
              role="region"
              aria-label="Gráfico mensal de entradas e saídas"
              aria-describedby="financial-chart-help"
            >
              <div className="monthly-bars">
                {data.monthly.map((row) => {
                  const max = Math.max(row.income_cents, row.expense_cents);
                  return (
                    <div
                      key={row.month}
                      role="img"
                      aria-label={`${financialMonthLabel(row.month)}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`}
                      title={`${row.month}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`}
                    >
                      <div className="bar-pair">
                        <span
                          className="bar-income"
                          style={{
                            height: `${Math.max(2, (row.income_cents / peak) * 140)}px`,
                          }}
                        />
                        <span
                          className="bar-expense"
                          style={{
                            height: `${Math.max(2, (row.expense_cents / peak) * 140)}px`,
                          }}
                        />
                      </div>
                      <small>{financialMonthLabel(row.month)}</small>
                      <small className="sr-only">Pico {money(max)}</small>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="help">
              A data inicial não limita este gráfico; a janela é de 12 meses.
            </p>
            <MonthlyValuesTable months={data.monthly} />
          </>
        ) : (
          <p className="help">
            {pending
              ? "Carregando o gráfico mensal…"
              : "Gráfico mensal indisponível."}
          </p>
        )}
      </section>
      <section className="panel dashboard-classification">
        <div className="panel-heading">
          <div>
            <h2>Resultado por classificação e grupo</h2>
            <p>
              Pagamentos realizados pela competência da baixa, no período
              selecionado. Desconsidera subcategorias que não afetam resultado.
              Não representa uma DRE integral.
            </p>
          </div>
        </div>
        {data ? (
          <LedgerTable
            headers={[
              "Classificação",
              "Grupo",
              "Receitas",
              "Despesas",
              "Saldo",
            ]}
            empty={!data.result_groups.length}
          >
            {data.result_groups.map((row, i) => (
              <tr key={i}>
                <td>
                  {classificationLabels[row.classification] ||
                    row.classification}
                </td>
                <td>{row.group}</td>
                <td className="numeric">{money(row.income_cents)}</td>
                <td className="numeric">{money(row.expense_cents)}</td>
                <td className="numeric">
                  {money(row.income_cents - row.expense_cents)}
                </td>
              </tr>
            ))}
          </LedgerTable>
        ) : (
          <p className="help">
            {pending
              ? "Carregando resultados por classificação…"
              : "Resultados por classificação indisponíveis."}
          </p>
        )}
      </section>
      <section className="panel dashboard-accounts">
        <div className="panel-heading">
          <div>
            <h2>Saldo atual por conta</h2>
            <p>
              Saldo inicial e todo o histórico de movimentos, independente do
              período.
            </p>
          </div>
          <a
            className="dashboard-query-link"
            href={financialHref("finance", {
              date_field: "posting",
              start: "",
              end: "",
            })}
          >
            Abrir livro caixa
          </a>
        </div>
        {data ? (
          <>
            <ul className="settings-list">
              {data.accounts.map((a) => (
                <li key={a.id}>
                  <span>
                    {a.name}
                    <small>
                      {a.kind === "cash" ? "Caixa" : "Conta bancária"} · saldo
                      inicial {money(a.opening_cents)}
                    </small>
                  </span>
                  <strong>{money(a.balance_cents)}</strong>
                </li>
              ))}
            </ul>
            {!data.accounts.length && (
              <p className="dashboard-empty">Nenhuma conta disponível.</p>
            )}
          </>
        ) : (
          <p className="help">
            {pending
              ? "Carregando saldos por conta…"
              : "Saldos por conta indisponíveis."}
          </p>
        )}
      </section>
    </div>
  );
}
