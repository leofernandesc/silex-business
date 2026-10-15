# SB-05.3A — Conciliação Bancária

Data: 14/10/2026. Branch: `feat/sb05-financeiro`.
Baseline aprovado: `b21a11769803eb0dcb86e470f641987bd1c3771a`.

## Escopo e decisão

A [auditoria](AUDITORIA.md) confirmou que o refinamento pode ser feito localmente, sem mudanças arquiteturais. A Conciliação já possui importação OFX e confirmação manual: nenhuma integração bancária, automação, busca, filtro de período, exportação ou reversão foi criada. O Dashboard Financeiro foi auditado para planejamento e permaneceu funcionalmente e visualmente preservado.

## Implementação

- `frontend/src/financePlanning.tsx`: wrapper `.silex-reconciliation`, classes próprias das três seções, apresentação dos estados com seus textos originais e reutilização de LedgerTable nas duas tabelas. Diff da fonte operacional: oito linhas adicionadas e seis removidas, sem reformatar o arquivo legado.
- `frontend/src/reconciliation.css`: 199 linhas, exclusivamente `@media screen` e seletores descendentes do wrapper. Tokens existentes para fonte Inter, títulos, campos, espaçamento, bordas, cartões, ações e foco. Todas as variáveis utilizadas existem no design system.
- As cinco colunas de cada tabela, os identificadores, os vínculos e as ações permanecem disponíveis. Rolagem interna, indicação condicional de colunas adicionais, descrição acessível e foco por teclado reutilizam o componente já aprovado, sem modificar Table/LedgerTable.
- Valores tabulares completos, com centavos, alinhamento numérico e `nowrap`, incluindo negativos e R$ 1.234.567,89. Estados distinguem Conciliado, Lançado, Ignorado, Pendente e Duplicado #ID por texto e cor; importações conservam Prévia/Revisado.
- Formulário de importação em duas colunas ou uma conforme a largura; campos e botões locais têm altura mínima de 44 px. Diálogo original recebe apenas apresentação por descendência, sem alterar Form, Modal, validações, payloads ou confirmações.

Não há novos indicadores ou consultas. P02, P03, P06 e P08 não são reimplementadas; as correções anteriores são verificadas nas regressões. As datas da Conciliação já usam dateOnly e continuam em dd/mm/aaaa, sem mudar ISO, fuso ou parser. P05 permanece parcial no ERP.

## Preservação

Manifesto inicial: 2.323 arquivos. Só os originais financePlanning.tsx e PENDENCIAS.md podem apresentar diferenças; arquivos novos estão discriminados no inventário Git. Backend, banco do checkout, APIs, autenticação, permissões, navegação, regras financeiras, templates, Dashboard, público, Home, estilos globais, fontes, SVGs e evidências anteriores foram comparados por SHA-256.

A análise AST compara todos os handlers/atributos operacionais, consultas/chamadas e declarações de estado. FinanceOverview, FinanceReports, BudgetForm, OfxNewFields, OfxResolveForm e os três handlers da Conciliação permanecem byte a byte iguais. Ver [preservação e recuperação](PRESERVACAO.md).

## Validação e evidências

Resultados detalhados e limitações: [TESTES.md](TESTES.md). Evidências geradas estão em `docs/evidence/sb05-3a/`; galeria `index.html` e ZIP `SB-05.3A-review.zip`. O pacote inclui comparação visual, matriz final de testes, diff, commits, manifestos e cópias dos dois originais necessários à recuperação; exclui bancos, cookies, credenciais, traces e .git.

48 capturas comparativas principais: oito recortes por largura/versão (histórico, foco, extrato, última coluna, associação, campos de baixa, criação e texto a 200%). Capturas adicionais registram as telas preservadas, Dashboard e reflow. Todos os registros exibidos são fictícios. Ampliação usa duplicação de tamanho calculado do texto, zoom CSS e viewport equivalente; não é certificação de zoom nativo, leitor de tela ou dispositivo físico.

V01: 30 cliques reais no baseline e 30 na candidata, dez por largura, aprovados. Isso não determina a causa da falha intermitente anterior e não encerra a observação. R02: em 187 px CSS, documento de 252 px em ambas as versões, sem transbordamento adicional da Conciliação. O shell não foi corrigido; não há declaração de conformidade completa de reflow.

## Versionamento

Commits por responsabilidade: auditoria `fc3cd29`, estilo `c3b646b`, testes `ce1926b`, ajuste de ampliação `d0ba99a` e documentação final, identificada em `commits.json` no pacote. O inventário completo de arquivos criados/modificados e o diff relativo ao baseline acompanham o ZIP. Evidências binárias e logs permanecem ignorados conforme .gitignore; scripts e documentos autorais são versionados. Staging explícito revisado antes de cada commit, sem segredos ou dados reais.

Não houve push, merge, deploy, migração ou execução de operações sobre dados persistentes reais. Main permanece no baseline consolidado do SB-04B.

## Pendências e próxima revisão

- P05 parcial; P01/P04/P07/P09 continuam em acompanhamento, sem correção global.
- Upload OFX por fetch direto não dispara o evento global de sessão expirada; erros de algumas consultas e de Ignorar possuem limitações preexistentes. Nenhum handler foi alterado para corrigi-las.
- V01 e R02 permanecem abertas, com medições comparativas.
- Antes do SB-05.3B: aprovar esta entrega e delimitar o refinamento do Dashboard. Ver [recomendação](RECOMENDACOES.md). Nenhum trabalho do SB-05.3B ou SB-06 foi iniciado.
