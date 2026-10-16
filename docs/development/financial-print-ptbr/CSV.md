# Inventário CSV — sem alteração

30 recursos conferidos no banco sintético; cada saída foi idêntica byte a byte entre baseline e candidata em Firefox e Chromium. Todos mantêm UTF-8 com BOM, separador ponto e vírgula, cabeçalhos, proteção de células e formatos existentes. Nenhum consumidor externo específico está homologado/documentado.

**A — humano exclusivo:** não comprovado para estes CSVs. **B — integração exclusiva:** não comprovado. **C — finalidade ambígua/mista:** todos abaixo; podem ser lidos em planilhas ou processados por sistemas. Cabeçalho técnico, por si só, não prova o destinatário. Assim, nenhuma conversão foi aplicada.

Para uma futura saída humana explicitamente aprovada: data civil dd/mm/aaaa, competência MM/AAAA e timestamp com fuso explícito. Para integração: manter ISO/contrato atual ou versionar. Não renomear campos ou mudar codificação/separador silenciosamente. Risco de alteração: moderado em todos os casos, pela ausência de inventário de consumidores.

| Recurso | Formato de data observado na fixture | Recomendação / prioridade |
|---|---|---|
| `/api/finance/movements.csv` | YYYY-MM-DD | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/reports/finance.csv` | YYYY-MM-DD | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/reports/sales.csv` | timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/reports/stock.csv` | timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/cash-daily.csv` | YYYY-MM-DD | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/cash-monthly.csv` | YYYY-MM (isolado/agrupamento) | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/result-monthly.csv` | YYYY-MM (isolado/agrupamento) | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/income-category.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/expense-category.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/income-subcategory.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/expense-subcategory.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/income-account.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/expense-account.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/income-customer.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/expense-supplier.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/by-origin.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/by-method.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/receivable-open.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/payable-open.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/receivable-overdue.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/payable-overdue.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/titles-due.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/titles-competence.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/settlements-daily.csv` | YYYY-MM-DD | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/charges-monthly.csv` | YYYY-MM (isolado/agrupamento) | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/discounts-monthly.csv` | YYYY-MM (isolado/agrupamento) | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/partial-payments.csv` | YYYY-MM-DD | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/reversals.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |
| `/api/finance/reports/documents.csv` | YYYY-MM-DD, timestamp ISO/UTC | Média: definir destinatário/contrato antes de qualquer mudança |
| `/api/finance/reports/budget-actual.csv` | Sem data nos registros da fixture | Baixa: manter; não converter campos por aparência |

Fontes: `backend/app/financial.py:csv_movements`, `backend/app/api.py:report/csv_value`, `backend/app/reporting.py:finance_report_csv` e `backend/app/report_exports.py:report_csv_response`. Os CSVs de clientes/produtos não incluem datas e ficam fora do inventário financeiro. A amostra sem data não garante ausência em todo dado possível; o contrato e o contexto do campo devem orientar qualquer decisão futura.
