# SB-07E — P05: CSV, impressão e contratos

**P05 global permanece parcial.** Entradas civis/mensais corrigidas tecnicamente no SB-07C e preservadas. Esta auditoria não modifica nenhum export/template/contrato. Homologação humana/assistiva continua pendente.

Foram consultadas **31 saídas**: 26 relatórios financeiros CSV, três CSV operacionais, CSV do livro caixa e impressão de títulos. A comparação original30 foi ampliada aqui com o livro caixa. Todas as consultas usam fixture sintética; nenhum relatório estava vazio. `output-dates.json` contém endpoints, cabeçalhos, contagens, exemplos fictícios e hashes. As35 respostas JSON e30 exports/print pareados são verificados separadamente, antes das mutações dos clones.

## Semântica e proposta

- **A — leitura humana:** HTML `/api/finance/print` exibe vencimento civil ISO, marca Gestão e status técnicos. Recomenda-se revisão separada para dd/mm/aaaa e marca fixa, preservando filtros, cifras e identificação empresarial. Prioridade alta para coerência de saída, risco moderado de apresentação; não é erro de persistência.
- **B — técnica/integração:** CSVs atuais possuem contratos de campos/formatos; alguns usam cabeçalhos técnicos e timestamps com horário. Não foi identificado contrato externo documentado de cada consumidor. Mesmo os CSVs consumidos por pessoas não podem ser convertidos silenciosamente. Preservar a versão atual; decidir exportação humana explícita ou versionamento de contrato. Data civil→dd/mm/aaaa só nessa saída acordada; timestamp deve conservar instante/fuso e deixar o fuso explícito; competência→MM/AAAA em saída humana.
- Produtos/clientes CSV não têm data nos campos exportados; não integram esta mudança. PDF via impressão do navegador tem a mesma apresentação do HTML/DOM; não foi homologado driver físico.

## Inventário efetivo

| Recurso | Origem de implementação | Datas observadas | Destinatário/contrato | Recomendação e prioridade |
|---|---|---|---|---|
| `/api/finance/movements.csv` | financial.py:csv_movements | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/reports/finance.csv` | api.py:report/csv_value | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/reports/sales.csv` | api.py:report/csv_value | iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/reports/stock.csv` | api.py:report/csv_value | iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/print` | api.py:finance_print | iso_civil | A: documento humano; HTML atual | dd/mm/aaaa; alta |
| `/api/finance/reports/cash-daily.csv` | report_exports.py:report_csv_response | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/cash-monthly.csv` | report_exports.py:report_csv_response | iso_month | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/result-monthly.csv` | report_exports.py:report_csv_response | iso_month | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/income-category.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/expense-category.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/income-subcategory.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/expense-subcategory.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/income-account.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/expense-account.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/income-customer.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/expense-supplier.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/by-origin.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/by-method.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |
| `/api/finance/reports/receivable-open.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/payable-open.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/receivable-overdue.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/payable-overdue.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/titles-due.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/titles-competence.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/settlements-daily.csv` | report_exports.py:report_csv_response | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/charges-monthly.csv` | report_exports.py:report_csv_response | iso_month | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/discounts-monthly.csv` | report_exports.py:report_csv_response | iso_month | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/partial-payments.csv` | report_exports.py:report_csv_response | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/reversals.csv` | report_exports.py:report_csv_response | iso_civil | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/documents.csv` | report_exports.py:report_csv_response | iso_civil, iso_timestamp | B/misto: CSV atual, consumidores externos não homologados | preservar contrato; oferecer saída humana sob decisão; média |
| `/api/finance/reports/budget-actual.csv` | report_exports.py:report_csv_response | sem datas nos registros sintéticos | B/misto: CSV atual, consumidores externos não homologados | manter; baixa |

## Demais impressões e limites

Recibo não fiscal e impressão DOM dos relatórios usam a apresentação atual do frontend; suas funções e24 regras de impressão históricas são preservadas por hash. O SB-07D comparou recibo/print baseline-candidata; o teste operacional SB-07E exercita venda/recibo/impressão em fixture isolada. Datas textuais do frontend seguem helpers aprovados, enquanto o backend HTML acima continua ISO. Não se atribui formato americano a todo ISO: ISO é inequívoco tecnicamente, porém inconsistente com leitura brasileira esperada.

Não há recomendação de converter serialização, API ou timestamp em data civil. Revisão futura precisa identificar consumidor de cada CSV, comparar arquivos byte a byte na versão preservada, testar planilhas com pt-BR/en-US e validar destinatários reais. Sem autorização, nenhuma saída foi modificada e P05 não foi encerrada globalmente.
