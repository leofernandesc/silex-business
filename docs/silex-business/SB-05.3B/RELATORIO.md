# SB-05.3B — Dashboard Financeiro

Data: 14/10/2026. Branch: `feat/sb05-financeiro`.
Baseline aprovado: `86e9400da21316c9eaeb9bfba277cc6f654584fd`.

## Resultado para revisão

Dashboard Financeiro refinado exclusivamente na apresentação. Os seis indicadores, seus cálculos e critérios temporais, séries de 12 meses, classificações e saldos foram preservados. A [auditoria semântica](AUDITORIA.md) distingue movimentos por lançamento, resultado por competência, títulos em aberto e saldos atuais. Não há novos indicadores, consultas ou operações financeiras.

As três telas de entrada continuam independentes: página pública, Página Inicial autenticada e Visão Geral operacional. Nenhuma rota, autenticação, permissão ou comportamento global foi modificado.

## Apresentação implementada

- Títulos, campos e ações com Inter/tokens oficiais, superfícies claras, bordas/sombras discretas e foco visível.
- Dois grupos dos seis cartões: Movimentações do período; Títulos em aberto e saldo atual. Rótulos, valores e informações complementares originais preservados, com explicações das janelas temporais confirmadas no backend.
- Cartões com valor em largura própria, grade adaptável à fonte/largura e números completos, sem quebrar centavos ou truncar. Receitas e despesas mantêm distinção semântica; saldo permanece neutro e conserva o sinal.
- De/Até mantêm inputs date, valores ISO e handlers, com descrição brasileira aditiva. Atualizar continua aplicando somente os valores submetidos.
- Gráfico HTML/CSS original, com mesmas séries/alturas/tooltips e ordem. Meses MM/AAAA, legenda com texto e padrões distintos, região rolável por teclado e tabela textual dos mesmos dados em disclosure nativo. Esse controle existe para acessibilidade da apresentação; não é nova função financeira.
- Classificação mantém cinco colunas, nomes, ordem e valores; tabela ganha rolagem interna/indicação de colunas adicionais. Saldos por conta conservam nome, tipo, saldo inicial e atual; valores podem mudar de linha junto com o layout, sem dividir o número.
- Status de carregamento e aria-busy acrescentados; Notice de erro preservado. Lista de contas vazia tem mensagem própria. Nenhum dado fictício é inserido na interface operacional: exemplos existem somente na fixture isolada.

## Arquitetura e arquivos

Único arquivo operacional preexistente alterado: `frontend/src/financePlanning.tsx`, apenas FinanceOverview e imports. O arquivo legado inteiro não foi reformatado. Novo `financialDashboard.css` tem apenas media screen/seletores `.silex-financial-dashboard`. Novo `dashboardPresentation.tsx` oferece formatação textual de mês sem Date/timezone e MonthlyValuesTable, sem consultas/cálculos financeiros.

SummaryCard, Table, LedgerTable, LedgerDateField, Form, Modal, styles.css, tokens, helpers financeiros e os componentes dos demais módulos permanecem idênticos. Reutilização dos wrappers já aprovados não altera seus contratos. Testes novos: dashboardPresentation.test.ts e dashboard-interface.spec.ts. Inventário completo, diffs e hashes em file-inventory.json/review.diff/git-diff-stat.txt do pacote.

## Validação

TypeScript/build Vite, 71 testes frontend (65 anteriores + seis novos), 69 backend e 21 E2E próprios aprovados. Suíte herdada: **208/210 aprovados**. Duas falhas de layout em Lançamentos no celular, com valores elevados, foram reproduzidas também no baseline e documentadas como **V02**, sem corrigir outra tela. Não se declara a suíte inteira verde. Ver [TESTES.md](TESTES.md).

Nove respostas financeiras baseline/candidata e nove representações correspondentes da UI coincidiram (três períodos em três larguras). Incluem seis valores, complementos vencidos, períodos, séries/alturas, classificações e contas. AST mantém os seis SummaryCards, 40 handlers, 26 chamadas de rede/query, 25 controles nativos e demais funções do arquivo compartilhado. Backup e reversão ensaiados. [Preservação](PRESERVACAO.md).

V01: 60/60 cliques reais aprovados (30 por versão; dez por largura), com estado de sessão, carregamento, destino e eventos. Permanece aberta. R02: 187 px CSS/documento de 252 em ambas as versões; Dashboard candidato de 163/163. Zoom CSS no celular: documento de 584 em ambas; sem overflow adicional da tela. Shell preservado, sem declaração de conformidade integral de reflow.

## Evidências e Git

Galeria `docs/evidence/sb05-3b/index.html`: comparativos em 1440/768/375, seis indicadores, gráfico, classificação, contas, foco, valores elevados, texto a 200% e zoom; estados simulados são identificados como stub de apresentação. ZIP `SB-05.3B-review.zip` contém evidências essenciais, testes, manifestos e dois originais para recuperação; exclui .git, bancos, credenciais, cookies, caches, builds e traces.

Commits: `57ddf1a` auditoria/baseline; `041a77d` apresentação/acessibilidade; `179b0bd` contraste local; `f064ebf` precisão do texto de classificação; `c8dfddf` testes. Documentação final identificada em commits.json. Arquivos staged foram revisados por caminho/diff/tamanho e ausência de segredos. main permanece no baseline consolidado do SB-04B; sem push, merge ou deploy.

## Pendências e continuidade

P01/P04/P05/P07/P09 continuam abertas nos limites anteriores; P02/P03/P06/P08 preservadas. V01 não foi encerrada por testes positivos. R02 exige escopo do shell. V02 exige autorização específica para os indicadores de Lançamentos. O fallback zero durante erro de consulta é comportamento anterior, acompanhado de Notice, e não foi convertido em confirmação de ausência de movimentos.

Recomendação: revisar este incremento e decidir separadamente a correção de V02/R02 e eventuais placeholders indisponíveis. Não foi iniciado SB-06 ou outro refinamento financeiro.
