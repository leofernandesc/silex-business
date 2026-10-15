# Inventário de datas — SB-06D.1

Varredura AST reproduzível em `date-inventory.json`: 116 ocorrências em 15 arquivos, incluindo wrappers e chamadas repetidas. São 22 elementos input declarados (date/month), não 116 controles. Complementos manuais abaixo incluem backend e conteúdo público. Sem chamadas a dados persistentes.

## Matriz de semântica e contratos

| Área / arquivos | Origem / formato interno | Controle e apresentação | API / dependências / risco | Proposta |
| --- | --- | --- | --- | --- |
| `ledger.tsx`, `financeDates.ts` | Payment.posting_date/competence_date; ISO civil | dateOnly, LedgerDateField + date; intervalos/presets | GET/POST /finance/movements; filtro ISO, ordenação backend; alto em cálculo | Conservar presets, handlers e ISO; texto dd/mm/aaaa |
| `finance.tsx` Pagar/Receber | FinanceEntry.due_date/competence_date; pagamentos civis; created/settled são timestamps no filtro | dateOnly e campos date com conferência | /finance, /finance/{id}/settle, reverse; recorrência/calendário não tocados | Sem alterar baixa, vencimento ou cálculos |
| `financePlanning.tsx` Conciliação | posted_date civil do OFX | tabela/título do diálogo dateOnly; sem editor de data | /finance/ofx/imports; datas do parser backend; alto | Preservar |
| `financePlanning.tsx`, `dashboardPresentation.tsx` Dashboard | start/end civis; monthly.month YYYY-MM | date + conferência; gráfico MM/AAAA | /finance/dashboard; janelas distintas, séries e saldos | Preservar valores e consultas |
| `financePlanning.tsx` Relatórios | start/end ISO civil, group diário civil/mensal/composição; colunas *_date | tabela dateOnly; mês bruto YYYY-MM em três relatórios e sufixo de resultado | /finance/reports/{slug}, catalog e CSV; ordem backend; risco baixo no texto, alto na consulta | Somente group mensal confirmado → MM/AAAA; classificação intacta |
| Orçamento / BudgetForm | year/month inteiros; controle YYYY-MM | input month; suporte efetivo depende do navegador | /finance/budgets; Number(slice) nos handlers | Preservar; componente uniforme depende de aprovação |
| `financeCatalog.tsx` Contas | Account.opening_date civil ISO | formulário date; tabela dateOnly | POST/PUT /accounts; saldo inicial e max localDate | Preservar; criação/edição com payload real testadas |
| `sales.tsx` Vendas/PDV/SaleDetail | created_at timestamp, due_date civil | dateTime para instante Manaus, dateOnly para vencimento; Dates + input date | /sales; filtros start/end ISO; finalize envia due_date ISO | Preservar. Não confundir instante com vencimento |
| `operations.tsx` Estoque/Caixa | created_at/opened_at/closed_at timestamps | dateTime; Dates para intervalo em Estoque | /stock, /cash; timestamp API intacto | Preservar Manaus e ordenação |
| `serviceOrders.tsx` Serviços | service_date, title_due_date, title_competence_date civis | input date; dateOnly no detalhe/lista | /service-orders POST/PUT/generate-titles; ISO | Preservar, sem mudar geração de títulos |
| `App.tsx` Visão Geral | dashboard.date civil; recent_sales.created_at timestamp | dateOnly/dateTime | /dashboard; nenhuma consulta adicional | Preservar |
| `users.tsx` auditoria | Audit.created_at timestamp | dateTime em Manaus | /audit; sem editor | Preservar |
| `catalog.tsx`, `partners.tsx`, configurações/Home | não apresentam editor de data ou campo temporal operacional próprio | sem formatação adicional | cadastros e identificação preservados | Nenhuma mudança |
| `public/content.ts`, ProductDemo | strings fictícias já dd/mm/aaaa | texto ilustrativo | sem API autenticada | Preservar |
| `backend/app/api.py`: finance_print, report CSV | date/timestamps serializados pelo backend | impressão financeira usa str(due_date) ISO; CSV financeiro usa valores contratuais | somente auditoria; fora da autorização de mudança | Limitação documentada; não alterar templates nem CSV |
| `backend/app/reporting.py`, `report_exports.py`, recibos em services | agrupamentos civis ISO; CSV e emissão de recibos | saída backend independente do frontend | impressão/CSV/API preservados byte a byte | Plano separado se desejado |

## Política de apresentação

- Civil válido YYYY-MM-DD → dd/mm/aaaa, por componentes numéricos e calendário gregoriano, sem new Date. Vazio/entrada inválida → travessão; não normalizar um dia impossível. Timestamps não são aceitos pelo formatador civil. Todos os consumidores dateOnly foram inspecionados como campos civis ou fatia explícita no relatório.
- Timestamps válidos continuam usando Intl pt-BR e America/Manaus; instante inválido agora exibe travessão em vez de lançar RangeError. Valores sem offset têm ambiguidade histórica do parser e não são reinterpretados neste incremento.
- Meses preservam sua granularidade: MM/AAAA, sem inventar um dia. Somente slugs confirmados são tratados como mês; nomes de categorias não são reinterpretados por reportGroupDate.
- Campo nativo continua com value ISO e restrições originais; lang não obriga desenho localizado. Não adicionar máscara, alterar serialização ou trocar tipos.
- Datas em cálculos, comparação, presets e ordenação não passam pelos formatadores de exibição.

## Ocorrências com posição e expressão

A lista abaixo é mecânica; a matriz acima é a revisão semântica. Linhas referem-se à candidata auditada.

- `frontend/src/App.tsx:440` — dateOnly, DashboardPage: `dateOnly(d.date)`
- `frontend/src/App.tsx:525` — dateTime, inline/module: `dateTime(s.created_at)`
- `frontend/src/dashboardPresentation.tsx:26` — financialMonthLabel, inline/module: `financialMonthLabel(row.month)`
- `frontend/src/finance.tsx:41` — localDate, FinancePage: `localDate()`
- `frontend/src/finance.tsx:57` — date-computation-or-timestamp, quickPeriod: `new Date()`
- `frontend/src/finance.tsx:57` — date-computation-or-timestamp, quickPeriod: `new Date(now.getFullYear(), now.getMonth(), now.getDate())`
- `frontend/src/finance.tsx:61` — date-computation-or-timestamp, quickPeriod: `new Date(today)`
- `frontend/src/finance.tsx:61` — conversion-or-computation, quickPeriod: `monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))`
- `frontend/src/finance.tsx:62` — date-computation-or-timestamp, quickPeriod: `new Date(today.getFullYear(), today.getMonth(), 1)`
- `frontend/src/finance.tsx:63` — date-computation-or-timestamp, quickPeriod: `new Date(today.getFullYear(), today.getMonth() - 1, 1)`
- `frontend/src/finance.tsx:63` — date-computation-or-timestamp, quickPeriod: `new Date(today.getFullYear(), today.getMonth(), 0)`
- `frontend/src/finance.tsx:64` — date-computation-or-timestamp, quickPeriod: `new Date(today.getFullYear(), 0, 1)`
- `frontend/src/finance.tsx:101` — native-control-or-wrapper, FinancePage: `<LedgerDateField label="De" value={draft.start}>`
- `frontend/src/finance.tsx:101` — native-control-or-wrapper, FinancePage: `<input type="date" value={draft.start} onChange={(e) => update("start", e.target.value)} />`
- `frontend/src/finance.tsx:102` — native-control-or-wrapper, FinancePage: `<LedgerDateField label="Até" value={draft.end}>`
- `frontend/src/finance.tsx:102` — native-control-or-wrapper, FinancePage: `<input type="date" value={draft.end} onChange={(e) => update("end", e.target.value)} />`
- `frontend/src/finance.tsx:111` — dateOnly, inline/module: `dateOnly(row.due_date)`
- `frontend/src/finance.tsx:126` — localDate, EntryForm: `localDate()`
- `frontend/src/finance.tsx:126` — localDate, EntryForm: `localDate()`
- `frontend/src/finance.tsx:129` — date-computation-or-timestamp, EntryForm: `new Date(due+'T12:00:00Z')`
- `frontend/src/finance.tsx:138` — native-control-or-wrapper, EntryForm: `<LedgerDateField label="Vencimento *" value={due}>`
- `frontend/src/finance.tsx:138` — native-control-or-wrapper, EntryForm: `<input required type="date" value={due} onChange={e=>setDue(e.target.value)}/>`
- `frontend/src/finance.tsx:139` — native-control-or-wrapper, EntryForm: `<LedgerDateField label="Competência *" value={competence}>`
- `frontend/src/finance.tsx:139` — native-control-or-wrapper, EntryForm: `<input required type="date" value={competence} onChange={e=>setCompetence(e.target.value)}/>`
- `frontend/src/finance.tsx:146` — dateOnly, EntryForm: `dateOnly(due)`
- `frontend/src/finance.tsx:168` — dateOnly, inline/module: `dateOnly(p.posting_date)`
- `frontend/src/finance.tsx:168` — dateOnly, inline/module: `dateOnly(p.competence_date)`
- `frontend/src/financeCatalog.tsx:148` — dateOnly, inline/module: `dateOnly(r.opening_date || null)`
- `frontend/src/financeCatalog.tsx:222` — localDate, CatalogForm: `localDate()`
- `frontend/src/financeCatalog.tsx:312` — native-control-or-wrapper, CatalogForm: `<input                   required                   type="date"                   max={localDate()}                   value={openingDate}                   onChange={(e) => setOpeningDate(e.target.value)}                 />`
- `frontend/src/financeCatalog.tsx:315` — localDate, CatalogForm: `localDate()`
- `frontend/src/financeDates.ts:11` — localDate, periodRange: `localDate()`
- `frontend/src/financeDates.ts:12` — date-computation-or-timestamp, periodRange: `new Date(today + "T12:00:00Z")`
- `frontend/src/financeDates.ts:13` — conversion-or-computation, inline/module: `v.toISOString().slice(0, 10)`
- `frontend/src/financeDates.ts:13` — conversion-or-computation, inline/module: `v.toISOString()`
- `frontend/src/financeDates.ts:17` — conversion-or-computation, periodRange: `d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))`
- `frontend/src/financeDates.ts:19` — conversion-or-computation, periodRange: `d.setUTCDate(d.getUTCDate() + 6)`
- `frontend/src/financeDates.ts:22` — conversion-or-computation, periodRange: `d.setUTCDate(1)`
- `frontend/src/financeDates.ts:23` — conversion-or-computation, periodRange: `d.setUTCMonth(d.getUTCMonth() - 1)`
- `frontend/src/financeDates.ts:25` — conversion-or-computation, periodRange: `d.setUTCMonth(d.getUTCMonth() + 1)`
- `frontend/src/financeDates.ts:26` — conversion-or-computation, periodRange: `d.setUTCDate(0)`
- `frontend/src/financePlanning.tsx:38` — dateOnly, inline/module: `dateOnly(item.posted_date)`
- `frontend/src/financePlanning.tsx:46` — localDate, FinanceOverview: `localDate()`
- `frontend/src/financePlanning.tsx:50` — native-control-or-wrapper, FinanceOverview: `<LedgerDateField label="De" value={start}>`
- `frontend/src/financePlanning.tsx:50` — native-control-or-wrapper, FinanceOverview: `<input type="date" value={start} onChange={e=>setStart(e.target.value)}/>`
- `frontend/src/financePlanning.tsx:50` — native-control-or-wrapper, FinanceOverview: `<LedgerDateField label="Até" value={end}>`
- `frontend/src/financePlanning.tsx:50` — native-control-or-wrapper, FinanceOverview: `<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/>`
- `frontend/src/financePlanning.tsx:54` — financialMonthLabel, inline/module: `financialMonthLabel(row.month)`
- `frontend/src/financePlanning.tsx:54` — financialMonthLabel, inline/module: `financialMonthLabel(row.month)`
- `frontend/src/financePlanning.tsx:61` — localDate, FinanceReports: `localDate()`
- `frontend/src/financePlanning.tsx:65` — native-control-or-wrapper, FinanceReports: `<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/>`
- `frontend/src/financePlanning.tsx:65` — native-control-or-wrapper, FinanceReports: `<input type="date" value={to} onChange={e=>setTo(e.target.value)}/>`
- `frontend/src/financePlanning.tsx:66` — dateOnly, FinanceReports: `dateOnly(filters.start)`
- `frontend/src/financePlanning.tsx:66` — dateOnly, FinanceReports: `dateOnly(filters.end)`
- `frontend/src/financePlanning.tsx:67` — native-control-or-wrapper, FinanceReports: `<input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)}/>`
- `frontend/src/financePlanning.tsx:73` — reportGroupDate, formatReportValue: `reportGroupDate(report,value)`
- `frontend/src/financePlanning.tsx:73` — dateOnly, formatReportValue: `dateOnly(value.slice(0,10))`
- `frontend/src/financePlanning.tsx:76` — native-control-or-wrapper, BudgetForm: `<input type="month" readOnly value={`${year}-${String(month).padStart(2,'0')}`}/>`
- `frontend/src/financePlanning.tsx:82` — dateOnly, OfxResolveForm: `dateOnly(item.posted_date)`
- `frontend/src/format.ts:9` — date-computation-or-timestamp, inline/module: `new Date(value)`
- `frontend/src/format.ts:11` — conversion-or-computation, inline/module: `new Intl.DateTimeFormat("pt-BR", {         dateStyle: "short",         timeStyle: "short",         timeZone: "America/Manaus",       }).format(instant)`
- `frontend/src/format.ts:29` — conversion-or-computation, inline/module: `new Intl.DateTimeFormat("en-CA", {     timeZone: "America/Manaus",     year: "numeric",     month: "2-digit",     day: "2-digit",   }).format(new Date())`
- `frontend/src/format.ts:34` — date-computation-or-timestamp, inline/module: `new Date()`
- `frontend/src/ledger.tsx:58` — periodRange, inline/module: `periodRange("Mês")`
- `frontend/src/ledger.tsx:164` — periodRange, inline/module: `periodRange(p)`
- `frontend/src/ledger.tsx:201` — dateOnly, LedgerPage: `dateOnly(applied.start)`
- `frontend/src/ledger.tsx:201` — dateOnly, LedgerPage: `dateOnly(applied.end)`
- `frontend/src/ledger.tsx:334` — native-control-or-wrapper, LedgerPage: `<LedgerDateField label="De" value={draft.start}>`
- `frontend/src/ledger.tsx:335` — native-control-or-wrapper, LedgerPage: `<input             type="date"             value={draft.start}             onChange={(e) => {               change("start", e.target.value);               setPreset("Personalizado");             }}           />`
- `frontend/src/ledger.tsx:344` — native-control-or-wrapper, LedgerPage: `<LedgerDateField label="Até" value={draft.end}>`
- `frontend/src/ledger.tsx:345` — native-control-or-wrapper, LedgerPage: `<input             type="date"             value={draft.end}             onChange={(e) => {               change("end", e.target.value);               setPreset("Personalizado");             }}           />`
- `frontend/src/ledger.tsx:404` — dateOnly, inline/module: `dateOnly(row.posting_date)`
- `frontend/src/ledger.tsx:405` — dateOnly, inline/module: `dateOnly(row.competence_date)`
- `frontend/src/ledger.tsx:468` — dateOnly, LedgerPage: `dateOnly(applied.start)`
- `frontend/src/ledger.tsx:468` — dateOnly, LedgerPage: `dateOnly(applied.end)`
- `frontend/src/ledger.tsx:505` — dateOnly, inline/module: `dateOnly(r.posting_date)`
- `frontend/src/ledger.tsx:506` — dateOnly, inline/module: `dateOnly(r.competence_date)`
- `frontend/src/ledger.tsx:552` — localDate, MovementForm: `localDate()`
- `frontend/src/ledger.tsx:553` — localDate, MovementForm: `localDate()`
- `frontend/src/ledger.tsx:646` — native-control-or-wrapper, MovementForm: `<LedgerDateField label="Data de lançamento *" value={posting}>`
- `frontend/src/ledger.tsx:647` — native-control-or-wrapper, MovementForm: `<input               required               type="date"               min={selected?.opening_date}               max={localDate()}               value={posting}               onChange={(e) => setPosting(e.target.value)}           `
- `frontend/src/ledger.tsx:651` — localDate, MovementForm: `localDate()`
- `frontend/src/ledger.tsx:656` — native-control-or-wrapper, MovementForm: `<LedgerDateField label="Data de competência *" value={competence}>`
- `frontend/src/ledger.tsx:657` — native-control-or-wrapper, MovementForm: `<input               required               type="date"               value={competence}               onChange={(e) => setCompetence(e.target.value)}             />`
- `frontend/src/ledgerPresentation.tsx:38` — dateOnly, LedgerDateField: `dateOnly(value)`
- `frontend/src/operations.tsx:79` — native-control-or-wrapper, StockPage: `<Dates             start={start}             end={end}             setStart={reset(setStart)}             setEnd={reset(setEnd)}           />`
- `frontend/src/operations.tsx:114` — dateTime, inline/module: `dateTime(row.created_at)`
- `frontend/src/operations.tsx:259` — dateTime, CashPage: `dateTime(current.data.opened_at)`
- `frontend/src/operations.tsx:307` — dateTime, inline/module: `dateTime(row.opened_at)`
- `frontend/src/operations.tsx:309` — dateTime, inline/module: `dateTime(row.closed_at)`
- `frontend/src/reportDates.ts:6` — financialMonthLabel, reportGroupDate: `financialMonthLabel(value)`
- `frontend/src/reportDates.ts:11` — financialMonthLabel, inline/module: `financialMonthLabel(month)`
- `frontend/src/sales.tsx:53` — localDate, PointOfSale: `localDate()`
- `frontend/src/sales.tsx:351` — native-control-or-wrapper, PointOfSale: `<input                     type="date"                     required                     min={localDate()}                     value={due}                     onChange={(e) => setDue(e.target.value)}                   />`
- `frontend/src/sales.tsx:354` — localDate, PointOfSale: `localDate()`
- `frontend/src/sales.tsx:442` — native-control-or-wrapper, SalesPage: `<Dates             start={start}             end={end}             setStart={reset(setStart)}             setEnd={reset(setEnd)}           />`
- `frontend/src/sales.tsx:467` — dateTime, inline/module: `dateTime(s.created_at)`
- `frontend/src/sales.tsx:470` — dateOnly, inline/module: `dateOnly(s.due_date)`
- `frontend/src/sales.tsx:516` — localDate, SaleDetail: `localDate()`
- `frontend/src/sales.tsx:540` — dateTime, SaleDetail: `dateTime(sale.created_at)`
- `frontend/src/sales.tsx:572` — dateOnly, SaleDetail: `dateOnly(sale.due_date)`
- `frontend/src/sales.tsx:641` — native-control-or-wrapper, SaleDetail: `<input                   type="date"                   required                   min={localDate()}                   value={due}                   onChange={(e) => setDue(e.target.value)}                 />`
- `frontend/src/sales.tsx:644` — localDate, SaleDetail: `localDate()`
- `frontend/src/serviceOrders.tsx:35` — dateOnly, inline/module: `dateOnly(row.service_date)`
- `frontend/src/serviceOrders.tsx:64` — localDate, ServiceOrderForm: `localDate()`
- `frontend/src/serviceOrders.tsx:100` — native-control-or-wrapper, ServiceOrderForm: `<input type="date" required value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />`
- `frontend/src/serviceOrders.tsx:142` — localDate, GenerateTitlesForm: `localDate()`
- `frontend/src/serviceOrders.tsx:142` — localDate, GenerateTitlesForm: `localDate()`
- `frontend/src/serviceOrders.tsx:148` — native-control-or-wrapper, GenerateTitlesForm: `<input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />`
- `frontend/src/serviceOrders.tsx:149` — native-control-or-wrapper, GenerateTitlesForm: `<input type="date" required value={competence} onChange={(e) => setCompetence(e.target.value)} />`
- `frontend/src/serviceOrders.tsx:160` — dateOnly, ServiceOrderDetails: `dateOnly(order.service_date)`
- `frontend/src/serviceOrders.tsx:174` — dateOnly, ServiceOrderDetails: `dateOnly(order.title_due_date)`
- `frontend/src/serviceOrders.tsx:174` — dateOnly, ServiceOrderDetails: `dateOnly(order.title_competence_date)`
- `frontend/src/ui.tsx:166` — native-control-or-wrapper, Dates: `<input           type="date"           value={start}           onChange={(e) => setStart(e.target.value)}         />`
- `frontend/src/ui.tsx:174` — native-control-or-wrapper, Dates: `<input           type="date"           value={end}           onChange={(e) => setEnd(e.target.value)}         />`
- `frontend/src/users.tsx:211` — dateTime, inline/module: `dateTime(r.created_at)`
