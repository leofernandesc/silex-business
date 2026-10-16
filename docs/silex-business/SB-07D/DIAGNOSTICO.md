# SB-07D — diagnóstico anterior à correção

Base `43f9d95f461b31b92253eef026a6b9e84d923309`, Git limpo. Backup integral de 476 arquivos conferido antes das alterações. Coleta `baseline-probe.json`: 84 estados, 19 com excesso horizontal, sem modificar CSS. Inclui as sete larguras, texto normal/200%, nomes normais/histórico/extremo e ambas as telas, com backend aprovado/SQLite sintético.

## Causas confirmadas

1. **Home / `.silex-home__heading p`:** o nome histórico foi inserido na resposta sintética de `/auth/me`, exatamente como no coletor SB-06E. É o nome de usuário na saudação, não apenas o nome empresarial. Um trecho não separável de 269 px determina o mínimo automático da trilha grid. Em 256/187, documento **281 px**; fonte 200% dobra esse mínimo e produz **550 px**, inclusive em 375. O texto da empresa já possui `overflow-wrap:anywhere`, mas o cabeçalho e outros descendentes não herdam essa política. Solução: quebra local e mínimos flexíveis na família Home, sem alterar nomes.
2. **Home ampliada em 187 / links e cartões:** mínimos intrínsecos de textos/ícones precisam de quebra e distribuição flexível. Permitir reorganização dos elementos da ação, preservando texto/ícone/alvo.
3. **Visão Geral / `.overview-summary .summary-card > div` e `strong`:** sob fonte 200%, o valor real sintético `R$ 1.235.267,89` mede 237,32 px, fonte 32 px. Em 256/187, documento **260 px**. Não há como manter esses 237 px de número íntegro dentro de 163 px de conteúdo em 187 sem pan interno ou redução de fonte. Não se reduz fonte nem se divide o número: apenas nesses extremos, os cartões podem crescer em uma região local rolável com teclado e orientação, mantendo o documento contido. Em 320 e maiores a grade continua reorganizando-se normalmente.
4. **Visão Geral / banner, cabeçalhos e ações:** a fonte ampliada revela mínimos de flex e palavras que escapam de seus contêineres, inclusive conteúdo cortado pelo overflow histórico do banner. Quebra de textos e distribuição flexível local, sem esconder o excesso novo.
5. **Tabelas existentes:** suas colunas já usam `.table-wrap` com rolagem própria. Não se confunde essa região bidimensional com overflow do documento; colunas e ações são preservadas.

O valor histórico **222 px em Visão Geral/187** está nos arquivos SB-06E, causado pela antiga grade de duas colunas. O SB-07A/C01 já alterou essa grade; **não se reproduziu esse excesso em texto normal no HEAD aprovado** (documento 187). A ocorrência atual de 260 com fonte 200% é medida separadamente. Não se inventa uma reprodução exata de 222 no código atual.

O `.topbar` termina dentro das sete viewports nas amostras; R02 não é a causa e não será alterada.

## Plano mínimo e impacto

- `home/home.css`: quebra herdada de textos, mínimos locais e links flexíveis.
- `overview.css`: regras sob classe exclusiva da Visão Geral e `@media screen`; acomodação de títulos/ações e região de indicadores em largura extrema.
- `App.tsx`: somente classe condicional no main da Visão Geral e semântica/descrição da região de indicadores. Não introduzir wrapper que alteraria a impressão do Modal/recibo, nem tocar handlers, consultas ou rotas.
- Nenhum componente compartilhado precisa ser modificado. SummaryCard, Modal, campos de datas, tokens, shell e estilos globais permanecem intactos.

Referências técnicas: [WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), conteúdo vertical em referência de 320 CSS px, e [1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), ampliação de texto. 256/187 de largura são robustez adicional, não equivalentes à referência normativa. Rolagem interna excepcional de valores nesses extremos deverá ser comprovada por teclado e explicitada, sem declarar conformidade WCAG global.
