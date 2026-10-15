# SB-07C — inventário de entrada de datas

Contagem por AST: **20 declarações de datas civis e duas de competência mensal**, antes e depois. Nenhum `input type=date/month` de apresentação permanece no fonte de produção; os inputs invisíveis internos do React Aria são auxiliares de autofill/validação.

A contagem histórica de 22 usos civis considerava a reutilização de `Dates` em Vendas/Estoque. Explicitando também as quatro declarações de `finance.tsx` usadas em Pagar e Receber, existem **26 contextos civis e dois mensais** nas rotas, não 26 declarações distintas. Os campos não ficam todos montados simultaneamente.

Todos os valores iniciais e expressões de estado abaixo foram preservados. As funções locais listadas continuam recebendo a mesma string; mudou apenas a origem do evento para o adaptador ISO. Fonte auditável: `migration-inventory.json`.

| ID | Arquivo : linha candidata | Rótulo | Estado / formato | Handler anterior → atual | Restrições preservadas |
|---|---|---|---|---|---|
| D01 | frontend/src/finance.tsx:102 | "De" | `{draft.start}` / YYYY-MM-DD | `{(e) => update("start", e.target.value)}` → `{(value) => update("start", value)}` | Sem novo limite |
| D02 | frontend/src/finance.tsx:103 | "Até" | `{draft.end}` / YYYY-MM-DD | `{(e) => update("end", e.target.value)}` → `{(value) => update("end", value)}` | Sem novo limite |
| D03 | frontend/src/finance.tsx:139 | "Vencimento *" | `{due}` / YYYY-MM-DD | `{e=>setDue(e.target.value)}` → `{(value) => setDue(value)}` | required=True |
| D04 | frontend/src/finance.tsx:140 | "Competência *" | `{competence}` / YYYY-MM-DD | `{e=>setCompetence(e.target.value)}` → `{(value) => setCompetence(value)}` | required=True |
| D05 | frontend/src/financeCatalog.tsx:312 | "Referência do saldo inicial *" | `{openingDate}` / YYYY-MM-DD | `{(e) => setOpeningDate(e.target.value)}` → `{(value) => setOpeningDate(value)}` | required=True, max={localDate()} |
| D06 | frontend/src/financePlanning.tsx:52 | "De" | `{start}` / YYYY-MM-DD | `{e=>setStart(e.target.value)}` → `{(value) => setStart(value)}` | Sem novo limite |
| D07 | frontend/src/financePlanning.tsx:52 | "Até" | `{end}` / YYYY-MM-DD | `{e=>setEnd(e.target.value)}` → `{(value) => setEnd(value)}` | Sem novo limite |
| D08 | frontend/src/financePlanning.tsx:67 | "De" | `{from}` / YYYY-MM-DD | `{e=>setFrom(e.target.value)}` → `{(value) => setFrom(value)}` | Sem novo limite |
| D09 | frontend/src/financePlanning.tsx:67 | "Até" | `{to}` / YYYY-MM-DD | `{e=>setTo(e.target.value)}` → `{(value) => setTo(value)}` | Sem novo limite |
| D10 | frontend/src/financePlanning.tsx:69 | "Mês" | `{budgetMonth}` / YYYY-MM | `{e=>setBudgetMonth(e.target.value)}` → `{setBudgetMonth}` | Sem novo limite |
| D11 | frontend/src/financePlanning.tsx:78 | "Mês" | `{`${year}-${String(month).padStart(2,'0')}`}` / YYYY-MM | `somente leitura` → `somente leitura` | readOnly=True |
| D12 | frontend/src/ledger.tsx:335 | "De" | `{draft.start}` / YYYY-MM-DD | `{(e) => {               change("start", e.target.value);               setPreset("Personalizado");             }}` → `{(value) => {               change("start", value);               setPreset("Personalizado");             }}` | Sem novo limite |
| D13 | frontend/src/ledger.tsx:339 | "Até" | `{draft.end}` / YYYY-MM-DD | `{(e) => {               change("end", e.target.value);               setPreset("Personalizado");             }}` → `{(value) => {               change("end", value);               setPreset("Personalizado");             }}` | Sem novo limite |
| D14 | frontend/src/ledger.tsx:635 | "Data de lançamento *" | `{posting}` / YYYY-MM-DD | `{(e) => setPosting(e.target.value)}` → `{(value) => setPosting(value)}` | required=True, min={selected?.opening_date}, max={localDate()} |
| D15 | frontend/src/ledger.tsx:636 | "Data de competência *" | `{competence}` / YYYY-MM-DD | `{(e) => setCompetence(e.target.value)}` → `{(value) => setCompetence(value)}` | required=True |
| D16 | frontend/src/sales.tsx:351 | "Vencimento *" | `{due}` / YYYY-MM-DD | `{(e) => setDue(e.target.value)}` → `{(value) => setDue(value)}` | required=True, min={localDate()} |
| D17 | frontend/src/sales.tsx:633 | "Vencimento *" | `{due}` / YYYY-MM-DD | `{(e) => setDue(e.target.value)}` → `{(value) => setDue(value)}` | required=True, min={localDate()} |
| D18 | frontend/src/serviceOrders.tsx:101 | "Data do serviço *" | `{serviceDate}` / YYYY-MM-DD | `{(e) => setServiceDate(e.target.value)}` → `{(value) => setServiceDate(value)}` | required=True |
| D19 | frontend/src/serviceOrders.tsx:149 | "Vencimento *" | `{dueDate}` / YYYY-MM-DD | `{(e) => setDueDate(e.target.value)}` → `{(value) => setDueDate(value)}` | required=True |
| D20 | frontend/src/serviceOrders.tsx:150 | "Competência *" | `{competence}` / YYYY-MM-DD | `{(e) => setCompetence(e.target.value)}` → `{(value) => setCompetence(value)}` | required=True |
| D21 | frontend/src/ui.tsx:165 | "De" | `{start}` / YYYY-MM-DD | `{(e) => setStart(e.target.value)}` → `{(value) => setStart(value)}` | Sem novo limite |
| D22 | frontend/src/ui.tsx:166 | "Até" | `{end}` / YYYY-MM-DD | `{(e) => setEnd(e.target.value)}` → `{(value) => setEnd(value)}` | Sem novo limite |

## Origem, API, risco e cobertura

- **Serviços D18–D20:** estado inicial local ou registro existente; `service_date`, `due_date`, `competence_date` seguem ISO. Criação/edição/reload/geração de títulos comparados nos dois navegadores e locales; alto impacto financeiro.
- **Vendas D16–D17:** vencimento inicial existente e limite mínimo `localDate()` preservados. Venda a prazo no PDV e finalização de venda criada em rascunho enviam o mesmo `due_date`; alto impacto.
- **Saldo inicial D05:** criação/edição e recarga de `opening_date`, limite máximo do dia e valor preservados; alto impacto.
- **Lançamentos D12–D15:** filtros `draft.start/end`, lançamento `posting/competence`; mínimos por conta e máximo hoje preservados. POST, filtros, centavos, CSV e indicadores comparados.
- **Pagar/Receber D01–D04:** componente reutilizado por direção; busca/filtros e criação de título preservam `start/end/due_date/competence_date`. E2E adicionais cobrem baixa parcial/total, anexos, reversão, cancelamento e recorrência.
- **Dashboard/Relatórios D06–D09:** estados de filtro originais; mesmos parâmetros `start/end`, sem nova chamada à API. Comparação de dashboard/CSV nos mesmos intervalos.
- **Competência D10–D11:** `budgetMonth` e `${year}-${month}`; mesmo contrato `YYYY-MM` no filtro, formulário somente leitura e criação de meta. Nenhum dia é inventado; ano 2300 testado, sem intervalo artificial.
- **Vendas/Estoque D21–D22:** `Dates` recebe start/end/setters originais. Mesmos parâmetros, paginação e recarga.
- **Conciliação:** não possui editor civil próprio; datas de OFX são textuais e permanecem intactas.
- Datas civis não passam por timestamp nem fuso. Timestamps, inputs de horário, CSV e templates de impressão não foram migrados.

## Formatos e edição

| Tipo | Antes | Depois | Contrato |
|---|---|---|---|
| Data civil editável | Nativo dependente do navegador e eventuais legendas | Segmentos dia/mês/ano, `04/03/2026`, calendário gregoriano | `2026-03-04` |
| Competência | Nativo month dependente do navegador | Mês explícito / ano, `03/2026` | `2026-03` |
| Data textual frontend | `dateOnly` brasileiro | Preservada | Preservado |
| Timestamp/CSV/impressão | Contrato anterior | Preservado | Preservado |

Edição parcial fica no componente e bloqueia envio; não publica data incompleta nem apaga valor anterior. Limpeza explícita em calendário publica vazio, mantendo a obrigatoriedade anterior. Ausência de valor/ano bissexto/inválido/min/max/readOnly/disabled/fieldset/controle externo cobertos em componente.
