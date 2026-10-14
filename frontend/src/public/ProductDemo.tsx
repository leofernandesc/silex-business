import { Eye, Search } from "lucide-react";
import { Brand } from "../brand/Brand";
import { illustrativeSales } from "./content";

function DemoHeading() {
  return (
    <div className="silex-public__demo-heading">
      <Brand appearance="dark" width={105} decorative />
      <span>Empresa Exemplo</span>
    </div>
  );
}
export function FinanceDemo() {
  return (
    <figure
      className="silex-public__hero-preview"
      aria-label="Demonstração financeira com dados fictícios"
    >
      <figcaption className="silex-public__preview-top">
        <span className="silex-public__eyebrow">Conheça a experiência</span>
        <span className="silex-public__pill">Dados fictícios</span>
      </figcaption>
      <div className="silex-public__demo">
        <DemoHeading />
        <div className="silex-public__demo-body">
          <h2>Gestão em perspectiva</h2>
          <p className="silex-public__demo-note">
            Demonstração fictícia · outubro de 2026
          </p>
          <dl className="silex-public__demo-stats">
            <div>
              <dt>+ Entradas</dt>
              <dd className="silex-public__income">R$ 12.450,00</dd>
            </div>
            <div>
              <dt>− Saídas</dt>
              <dd className="silex-public__expense">R$ 7.830,00</dd>
            </div>
          </dl>
          <div className="silex-public__demo-row">
            <span>
              Venda ilustrativa<small>Recebimento registrado</small>
            </span>
            <strong className="silex-public__income">+ R$ 4.800,00</strong>
          </div>
          <div className="silex-public__demo-row">
            <span>
              Frete ilustrativo<small>Pagamento registrado</small>
            </span>
            <strong className="silex-public__expense">− R$ 2.130,00</strong>
          </div>
          <p className="silex-public__demo-note">
            Valores e registros de exemplo, sem dados de clientes.
          </p>
        </div>
      </div>
    </figure>
  );
}
export function SalesDemo() {
  return (
    <figure className="silex-public__demo" aria-labelledby="sales-demo-caption">
      <DemoHeading />
      <div className="silex-public__demo-body">
        <h3>Vendas</h3>
        <p className="silex-public__demo-note">
          Demonstração fictícia · outubro de 2026
        </p>
        <div className="silex-public__demo-search">
          <Search aria-hidden="true" size={16} />
          <span>Número da venda ou cliente</span>
        </div>
        <p id="sales-scroll-hint" className="silex-public__scroll-hint">
          Role a tabela para ver todos os detalhes. Use as setas quando ela
          estiver em foco.
        </p>
        <div
          className="silex-public__table-scroll"
          role="region"
          tabIndex={0}
          aria-label="Tabela ilustrativa de vendas"
          aria-describedby="sales-scroll-hint"
        >
          <table>
            <caption className="silex-public__sr-only">
              Vendas de exemplo com dados fictícios
            </caption>
            <thead>
              <tr>
                {[
                  "Venda / cliente",
                  "Data / pagamento",
                  "Total",
                  "Situação",
                  "Ações",
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {illustrativeSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>#{sale.id}</strong>
                    <small>{sale.customer}</small>
                  </td>
                  <td>
                    {sale.date}
                    <small>{sale.payment}</small>
                  </td>
                  <td className="silex-public__numeric">{sale.total}</td>
                  <td>
                    <span
                      className={`silex-public__sale-status ${sale.status === "Finalizada" ? "silex-public__sale-status--final" : ""}`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    <span className="silex-public__demo-action">
                      <Eye aria-hidden="true" size={16} />
                      <span className="silex-public__sr-only">
                        Visualização ilustrativa
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <figcaption id="sales-demo-caption" className="silex-public__demo-note">
          Registros fictícios. Interface ilustrativa, sem ações operacionais.
        </figcaption>
      </div>
    </figure>
  );
}
