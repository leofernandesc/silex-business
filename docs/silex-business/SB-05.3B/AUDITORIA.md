# Auditoria funcional e semântica — SB-05.3B

Baseline confirmado: `86e9400da21316c9eaeb9bfba277cc6f654584fd`; branch `feat/sb05-financeiro`, sem alterações locais inesperadas. Git íntegro; blobs sem referência encontrados por fsck são resíduos de staging, não erros de histórico. Backups/SHA-256 preparados antes de alterar fontes. Relatórios SB-05.1/SB-05.2/SB-05.3A, auditoria anterior e PENDENCIAS.md consultados.

## Implementação existente e dependências

FinanceOverview em `frontend/src/financePlanning.tsx`, rota autenticada `finance-dashboard`, distinta de `dashboard`/Visão Geral. Registro central exige administrador; GET `/api/finance/dashboard` usa ADMIN no backend. Operador não recebe menu/atalhos e o backend deve negar acesso com 403; visitante, 401.

Uma única consulta de dados: useLoad em `/finance/dashboard?start=…&end=…`. Início padrão é primeiro dia do mês local; fim, hoje. De/Até são valores draft ISO; somente submit Atualizar copia para applied, que controla a consulta. Ordem, parâmetros, estados, callbacks e query permanecem iguais. Nenhum seletor de conta ou indicador novo.

Dependências compartilhadas: SummaryCard, Field, PageTitle, Notice e Table; helpers money/localDate/dateOnly; estilos summary-grid/summary-card/monthly-bars/settings-list. Não serão modificados. LedgerDateField e LedgerTable podem ser reutilizados como apresentação, mantendo inputs e handlers existentes. FinanceReconciliation/StatementRows/OfxResolveForm, FinanceReports/BudgetForm/OfxNewFields permanecem exatos. Novo CSS terá wrapper específico e media screen, sem alterar impressão ou outros módulos.

## Seis indicadores: semântica confirmada em reporting.py

| Indicador | Origem/cálculo existente | Critério temporal |
| --- | --- | --- |
| Entradas no período | Soma dos valores positivos de Payment.amount_cents; inclui créditos de estornos | posting_date entre start e end, inclusive |
| Saídas no período | Soma do módulo dos valores negativos de Payment.amount_cents; inclui encargos/estornos conforme os pagamentos gravados | Mesmo intervalo de lançamento |
| Saldo do período | income_cents − expense_cents, sem saldo inicial | Mesmo intervalo de lançamento |
| A receber | Principal restante positivo de títulos income com status open/partial; Vencido é o subconjunto com due_date < hoje | Situação atual, independente de start/end |
| A pagar | Principal restante positivo de títulos expense com status open/partial; Vencido usa a mesma comparação com hoje | Situação atual, independente de start/end |
| Saldo atual total | Soma dos saldos retornados de todas as contas: opening_cents + todos os Payment.amount_cents da conta | Histórico completo; não limitado pelo período nem opening_date, sem consulta bancária externa |

Títulos quitados/cancelados não entram em aberto. Valores vencidos são informação complementar, não indicadores adicionais. A lista de contas da API inclui contas inativas e está em ordem de ID; a apresentação mantém isso. Não modificar fórmulas, sinais, arredondamentos ou valores de fallback.

## Gráfico, classificação e contas

Não há biblioteca de gráficos: monthly-bars/bar-pair são elementos HTML/CSS. A API retorna exatamente 12 meses ordenados, terminando no mês de end. Cada mês considera primeiro ao último dia desse mês, inclusive; start não limita a série, e o mês final é completo, mesmo se end estiver no meio dele. Entradas/saídas usam os sinais de Payment. O frontend calcula apenas peak e alturas visuais; ambas as expressões serão preservadas. Tooltips title já apresentam mês e dois valores; apenas Pico tem texto sr-only. Falta uma alternativa tabular completa e teclado para rolagem.

Resultado por classificação/grupo usa Payment.competence_date entre start/end, excluindo subcategorias com affects_result=false. Chave de agrupamento: classificação, result_group (ou nome de categoria) e direção. Lista ordenada pelo backend. Mapeamento operating/Operacional, investment/Investimento e financing/Financiamento preservado. Colunas Classificação, Grupo, Receitas, Despesas, Saldo, com o cálculo de saldo por linha já existente. Não existe total geral adicional ou ação por classificação.

Saldos por conta usam a mesma resposta; nome, tipo Caixa/Conta bancária, saldo inicial e atual. Única ação Abrir livro caixa chama navigate('finance') e abre `/app#finance`. Não existe exportação/impressão ou diálogo próprio do Dashboard.

## Carregamento, erro e apresentação proposta

useLoad mantém dados anteriores durante recarga e zera data em erro, com Notice existente. Sem dados iniciais, os cartões mostram zero pelo fallback original; antes não havia mensagem explícita de loading. Acrescentar status de carregamento/aria-busy é adaptação exclusivamente apresentacional; não esconder dados nem alterar busca/estado. Resultados vazios já usam Table; lista de contas não possui mensagem vazia própria. Acrescentar mensagem fiel à lista vazia é apresentação, sem novo fluxo.

Proposta restrita: grupos visuais dos seis indicadores explicando suas janelas, campos ISO com legenda brasileira aditiva, tabela de classificação rolável e valores tabulares completos. Gráfico conserva dados/alturas/title e recebe legendas textuais, marcação de meses MM/AAAA e alternativa em tabela dos mesmos 12 pares sob disclosure nativo. Esse controle de apresentação atende à necessidade de acesso aos dados, sem nova consulta, série ou operação financeira.

V01 permanece em acompanhamento: repetições reais com destino, autenticação, loading, hash/eventos/console registrados. R02 será comparada antes/depois em 187 px CSS e zoom simulado, sem corrigir shell. P01/P04/P05/P07/P09 continuam abertas nos limites documentados. Não há impedimento arquitetural para prosseguir com estilos/componentes próprios.
