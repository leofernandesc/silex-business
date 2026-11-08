# PR #12 — revisão dirigida após auditoria independente

Base revisada: `cff5f2ea5d56395fd31ea9c6bf74d514480dc63c`, branch `feat/finance-enterprise-stage1`. PR continua Draft; **nenhum merge ou deploy autorizado**. Esta revisão contém somente correção temporal, clareza de rótulos e seus testes/documentação. Backend, contratos, cálculos, migrações, Railway, PR #11 e branch de formulários não são modificados.

## Correção de datas

`FinancePage.quickPeriod()` construía datas pelo calendário local do navegador, embora `localDate()` já fornecesse a data civil em **America/Manaus**. Exemplo: em `2026-11-01T02:30:00Z`, UTC/Tóquio já estão em novembro, mas Manaus ainda está em **31/10/2026**. Em `2027-01-01T04:00:00Z`, Manaus está em **01/01/2027**, mas Los Angeles ainda está em dezembro do ano anterior.

A função agora delega a `titlePeriodRange()`, em `financeDates.ts`. A referência continua sendo o utilitário existente `localDate()`; a aritmética reutiliza `civilDate()` / `CalendarDate` e `startOfWeek()` da biblioteca já instalada, com segunda-feira explícita. Não há conversão de data civil para timestamp na função nova. Não muda a representação ISO nem o contrato da API.

Os limites anteriores são preservados:

| Preset de títulos | Intervalo em datas civis de Manaus |
|---|---|
| Hoje | Hoje até hoje |
| Semana | Segunda-feira até hoje |
| Mês | Primeiro dia do mês até hoje |
| Mês anterior | Primeiro ao último dia do mês anterior |
| Ano | Primeiro dia do ano até hoje |

**Livro Caixa:** não apresentava o mesmo defeito. `periodRange()` já partia de `localDate()` e usava somente operações UTC depois dessa referência explícita. Seu corpo e consumidores foram preservados byte a byte; testes novos confirmam o comportamento em quatro fusos, incluindo semanas/meses/anos completos. Não se altera essa semântica para torná-la artificialmente igual à janela até hoje de Pagar/Receber.

## Rótulos de vencimento

- Pagar/Receber: **“Vencimentos: hoje e 7 dias seguintes”**, com descrição **“Data atual do servidor até o 7º dia seguinte, inclusive (8 datas possíveis).”**
- Dashboard: **“A receber: hoje e 7 dias seguintes”**, **“A pagar: hoje e 7 dias seguintes”** e seção **“Vencimentos: hoje e 7 dias seguintes”**.
- A descrição da seção informa a mesma janela inclusiva; os cartões continuam exibindo as duas datas brasileiras retornadas/derivadas da referência do servidor.

`due_7_days_cents`, `as_of_date`, limites do backend, principal pendente, filtros e links mantêm os mesmos valores e regras. O texto esclarece que hoje mais os sete dias seguintes abrange oito datas possíveis; não passa a excluir hoje nem o sétimo dia.

## Validação desta revisão

Dados exclusivamente fictícios, SQLite descartável, credenciais temporárias geradas pelo instrumento existente. Sem seed-demo, banco persistente ou acesso à Railway.

| Comando | Resultado observado |
|---|---|
| `cd frontend && npm test -- src/financeDates.test.ts src/civilDates.test.ts src/datePresentation.test.ts src/financialNavigation.test.ts` | **85 aprovados** em quatro arquivos; subconjunto da suíte abaixo |
| `cd frontend && npm test` | **179 aprovados** em 16 arquivos; 21 casos novos (20 combinações de fuso/instante e um de limites civis) sobre os 158 originais |
| `cd frontend && npm run build` | TypeScript e Vite aprovados |
| `PYTHONPATH=backend .venv/bin/python -m pytest -q backend/tests/test_financial_stage1.py backend/tests/test_finance_expansion.py::test_finance_filter_summary_uses_full_result_and_seven_day_boundary` | **4 aprovados**; regressão existente, sem novos cálculos/backend |
| `SILEX_FINANCIAL_EVIDENCE_DIR=/tmp/silex-pr12-date-review-evidence .venv/bin/python scripts/check_financial_stage1.py` | **26 aprovados**, 13 cenários/fusos × dois projetos. São 22 reexecuções dos cenários anteriores e quatro execuções novas de fuso, sem somar como 48 testes distintos |
| `git diff --check` | Sem erros |

Testes unitários: UTC, America/Sao_Paulo, Asia/Tokyo e America/Los_Angeles; instantes imediatamente antes/depois da meia-noite de Manaus, virada de ano/mês, 29/02/2024 e começo/fim de semana. Relógios UTC são entradas do teste, não conversões de datas civis de produção.

Navegador Chromium/Brave: os cenários novos congelam somente o relógio de data em Tóquio e Los Angeles, verificam os cinco presets em Pagar **e** Receber, valores ISO da requisição, direção/base temporal, campos brasileiros, filtros aplicados, URL e recarregamento. Também comprovam que o atalho de vencimentos segue `as_of_date` do servidor mesmo quando a data do navegador diverge. Os cenários anteriores revalidam Dashboard, erros, zeros reais, recuperação e links filtrados. Desktop 1440px e mobile 375px; medições existentes de 768px/texto computado 200% mantidas.

Nenhuma retry automática ou relaxamento de asserção. As quatro capturas históricas não foram sobrescritas: o instrumento aceita um diretório de evidências para as novas execuções, neste caso fora do repositório. Não houve nova homologação Firefox, zoom nativo, leitor de tela real ou participantes humanos.

## Preservação e regressão conjunta

- As **nove falhas preexistentes de fornecedores não foram corrigidas nem reexecutadas** neste ajuste dirigido. Sua causa e reprodução na base continuam no relatório original. A correção pertence ao **PR #11**.
- Depois de uma integração explicitamente autorizada dos trabalhos independentes, executar regressão conjunta de PR #11/#12: cadastro/edição de fornecedores e vínculos financeiros, títulos parciais, filtros/atalhos e estados de consulta; validar os guards Demo/Sammya e a propriedade dos dados. Preservar também as correções da branch de formulários quando sua integração for aprovada. Não copiar o tratamento de fornecedores para #12.
- O diff de produção desta revisão tem somente `finance.tsx`, adição de helper em `financeDates.ts` e textos em `financialOverview.tsx`. Nenhuma alteração de `ledger.tsx`, `format.ts`, `civilDates.ts`, `api.ts`, backend, dependências, CSS, relatórios/OFX ou migrações.
- Os resultados/galeria/manifesto da entrega original continuam históricos da árvore cff5f2e. `CHECKSUMS.sha256` não foi reescrito para simular continuidade dos hashes alterados; `REVIEW-CHECKSUMS.sha256` cobre a árvore entregue após este ajuste.
- Todas as condições de [PUBLICATION.md](PUBLICATION.md) continuam obrigatórias, inclusive backup/restauração, inventário de identidades, 0013 supervisionada e autorização específica antes de provisionar Sammya em ambiente persistente. Nenhuma dessas operações foi executada aqui.
