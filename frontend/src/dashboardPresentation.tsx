import { money } from "./format";
import { LedgerTable } from "./ledgerPresentation";

type MonthlyValues = {
  month: string;
  income_cents: number;
  expense_cents: number;
};

/** Display ISO month without parsing a date or applying a timezone. */
export function financialMonthLabel(month: string) {
  return month.replace(/^(\d{4})-(\d{2})$/, "$2/$1");
}

/** Same chart data, in an accessible native disclosure; no queries or calculations. */
export function MonthlyValuesTable({ months }: { months: MonthlyValues[] }) {
  return (
    <details className="dashboard-monthly-values">
      <summary>Consultar valores mensais em tabela</summary>
      <LedgerTable
        headers={["Mês", "Entradas", "Saídas"]}
        empty={!months.length}
      >
        {months.map((row) => (
          <tr key={row.month}>
            <td>{financialMonthLabel(row.month)}</td>
            <td className="numeric">{money(row.income_cents)}</td>
            <td className="numeric">{money(row.expense_cents)}</td>
          </tr>
        ))}
      </LedgerTable>
    </details>
  );
}
