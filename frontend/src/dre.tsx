import { useState } from "react";
import { query } from "./api";
import { dateOnly, money } from "./format";
import {
  dreLineNames,
  dreStatuses,
  dreDisplayState,
  dreCommercialMessage,
  dreErrorMessage,
} from "./drePresentation";
import { dreHref } from "./dreNavigation";
import { exportReadableDre } from "./dreExport";
import { DreDetails, type Report } from "./dreAdministration";
import {
  ExportButton,
  Field,
  LoadFeedback,
  PageTitle,
  Table,
  useLoad,
} from "./ui";
import { SilexDatePicker } from "./SilexDatePicker";
import "./dre.css";
export { DreMappingEditor } from "./dreAdministration";
type Period = { start: string; end: string };
export function DreReport({
  period,
  onPeriod,
  onLegacy,
}: {
  period: Period;
  onPeriod: (p: Period) => void;
  onLegacy: (id: string) => void;
}) {
  const [from, setFrom] = useState(period.start),
    [to, setTo] = useState(period.end),
    [version, setVersion] = useState(0),
    [detail, setDetail] = useState<string | null>(null);
  const result = useLoad<Report>("/finance/dre?" + query(period), version),
    catalog = useLoad<{ id: string; name: string }[]>(
      "/finance/reports/catalog",
    );
  const data = !result.loading && !result.error ? result.data : null,
    state = data ? dreDisplayState(data) : null;
  return (
    <>
      <PageTitle
        title="DRE gerencial"
        subtitle="Demonstrativo de resultados por competência econômica."
      />
      <form
        className="panel toolbar report-filters dre-filters"
        onSubmit={(e) => {
          e.preventDefault();
          onPeriod({ start: from, end: to });
          setVersion((v) => v + 1);
          setDetail(null);
        }}
      >
        <Field label="Relatório">
          <select value="dre" onChange={(e) => onLegacy(e.target.value)}>
            <option value="dre">DRE gerencial</option>
            {catalog.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <SilexDatePicker label="De" value={from} onChange={setFrom} />
        <SilexDatePicker label="Até" value={to} onChange={setTo} />
        <button className="primary">Gerar relatório</button>
      </form>
      <LoadFeedback
        resource={{
          ...result,
          error: result.error ? dreErrorMessage(result.error) : "",
        }}
        label="DRE gerencial"
      />
      <p className="dre-configuration-link">
        <a href={dreHref(period, true)}>Configuração da DRE</a>
      </p>
      <section className="panel finance-report-print dre-report">
        <div className="panel-heading">
          <div>
            <h2>DRE gerencial</h2>
            <p>
              {dateOnly(period.start)} a {dateOnly(period.end)} · Competência
              econômica · Silex Business
            </p>
          </div>
          <ExportButton onClick={() => exportReadableDre(period)} />
          <button disabled={!data} onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
        {data && (
          <div className="dre-content">
            <p className="dre-summary" role="status">
              {dreCommercialMessage(data)}
            </p>
            {state !== "empty" && state !== "pending" && (
              <>
                <div className="dre-lines">
                  <Table
                    headers={[
                      "Rubrica",
                      "Situação",
                      "Valor conhecido",
                      "Valor final",
                    ]}
                    loading={false}
                    empty={false}
                  >
                    {data.lines.map((l) => (
                      <tr key={l.code}>
                        <th scope="row">
                          {dreLineNames[l.code]}{" "}
                          <button
                            className="text-button"
                            type="button"
                            aria-label={"Detalhar " + dreLineNames[l.code]}
                            onClick={() =>
                              setDetail(detail === l.code ? null : l.code)
                            }
                          >
                            Detalhar
                          </button>
                        </th>
                        <td data-label="Situação">
                          {dreStatuses[l.coverage_status]}
                        </td>
                        <td data-label="Valor conhecido">
                          {l.known_amount_cents === null
                            ? "—"
                            : money(l.known_amount_cents)}
                        </td>
                        <td data-label="Valor final">
                          {l.final_amount_cents === null
                            ? "—"
                            : money(l.final_amount_cents)}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
                {detail && (
                  <DreDetails key={detail} line={detail} period={period} />
                )}
                <div className="dre-records">
                  <Table
                    headers={["Margem", "Resultado"]}
                    loading={false}
                    empty={false}
                  >
                    {Object.entries(data.margins).map(([code, m]) => (
                      <tr key={code}>
                        <th scope="row">
                          {
                            (
                              {
                                LB: "Margem bruta",
                                EBIT: "Margem operacional",
                                EBITDA: "Margem EBITDA",
                                LL: "Margem líquida",
                              } as Record<string, string>
                            )[code]
                          }
                        </th>
                        <td data-label="Resultado">
                          {m.value === null
                            ? "—"
                            : m.value.replace(".", ",") + "%"}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
