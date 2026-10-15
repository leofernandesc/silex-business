# Matriz de responsividade e diagnóstico de conteúdo

Medições atuais em `surfaces.json`/`reflow-findings.json`. Fonte ampliada = **fontes computadas do conteúdo main duplicadas**, não zoom nativo e não alteração do produto. Header fica fora dessa simulação e é validado nos testes R02. Overflow de uma tabela contida em região rolável não é contado automaticamente como falha da página.

## Normal — viewport/documento CSS px

| Tela |1440|1024|768|375|320|
|---|---|---|---|---|---|
|public|1440/1440|1024/1024|768/768|375/375|320/320|
|login|1440/1440|1024/1024|768/768|375/375|320/320|
|home|1440/1440|1024/1024|768/768|375/375|320/320|
|dashboard|1440/1440|1024/1024|768/768|375/375|320/320|
|customers|1440/1440|1024/1024|768/768|375/375|320/320|
|products|1440/1440|1024/1024|768/768|375/375|320/320|
|suppliers|1440/1440|1024/1024|768/768|375/375|320/320|
|day-workers|1440/1440|1024/1024|768/768|375/375|320/320|
|subcontracted-freight|1440/1440|1024/1024|768/768|375/375|320/320|
|stock|1440/1440|1024/1024|768/768|375/375|320/320|
|pos|1440/1440|1024/1024|768/768|375/375|320/320|
|sales|1440/1440|1024/1024|768/768|375/375|320/320|
|service-orders|1440/1440|1024/1024|768/768|375/375|320/320|
|cash|1440/1440|1024/1024|768/768|375/375|320/320|
|finance|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-dashboard|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-reconcile|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-payable|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-receivable|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-accounts|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-categories|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-subcategories|1440/1440|1024/1024|768/768|375/375|320/320|
|finance-reports|1440/1440|1024/1024|768/768|375/375|320/320|
|users|1440/1440|1024/1024|768/768|375/375|320/320|
|audit|1440/1440|1024/1024|768/768|375/375|320/320|
|company-settings|1440/1440|1024/1024|768/768|375/375|320/320|

## Estados adicionais com excesso

|Tela/estado|Disponível|Documento|Excesso|Header termina em|Causas fora de rolagem interna|
|---|---|---|---|---|---|
|dashboard / computed-text200-NOT-native-zoom|1440|1477|37|1440|`div` 282.3px / pai 290px; `strong` 282.3px / pai 282px; `small` 282.3px / pai 282px|
|finance / computed-text200-NOT-native-zoom|768|854|86|768|`div` 393.83px / pai 357 px; `strong` 393.83px / pai 394px; `small` 393.83px / pai 394px|
|finance-payable / computed-text200-NOT-native-zoom|768|850|82|768||
|finance-receivable / computed-text200-NOT-native-zoom|768|850|82|768||
|dashboard / computed-text200-NOT-native-zoom|375|440|65|375|`div` 237.32px / pai 170px; `span` 192.32px / pai 237px; `strong` 237.32px / pai 237px; `small` 237.32px / pai 237px|
|dashboard / computed-text200-NOT-native-zoom|320|412|92|320|`div` 151.08px / pai 142px; `strong` 151.08px / pai 151px; `small` 151.08px / pai 151px; `div` 237.32px / pai 142px|
|finance / computed-text200-NOT-native-zoom|320|348|28|320||
|dashboard / extra-narrow-NOT-native-zoom|187|222|35|187|`div` 113.43px / pai 76px; `span` 96.1px / pai 113px; `strong` 113.43px / pai 113px; `small` 113.43px / pai 113px|

## Interpretação e propostas para autorização

A comparação dirigida com baseline registra larguras antes/depois em `baseline-reflow-comparison.json`. Como nenhuma fonte de produção muda neste incremento, os excessos não são regressões SB-06E. A causa de conteúdo é independente da correção R02 do cabeçalho. Não reabrir R02 por associação.

- Grade/ações/filtros com mínimos intrínsecos: avaliar min-width:0, quebra controlada e redistribuição local, preservando ordem, rótulos, colunas e handlers. Risco moderado pela densidade/seletores compartilhados; validar todas as larguras, foco, datas e últimos controles. Não aplicar overflow-x:hidden.
- Texto/nome longo: avaliar quebra responsiva apenas no componente afetado, sem alterar nome persistido ou marca; testar strings sintéticas, fonte200 e menu/perfis.
- Quando um controle excede o viewport, testar se permanece alcançável por teclado e rolagem; não presumir que scrollWidth por si só comprova conteúdo perdido. Havendo controle essencial inacessível, classificar como bloqueador da homologação daquele fluxo.
- Critérios relevantes: WCAG1.4.10 para reflow e1.4.4 para ampliação sem perda.320 CSS px é referência horizontal de reflow;187/256 aqui são robustez adicional. A simulação de fonte não certifica esses critérios integralmente. Zoom nativo e leitores têm resultados/limites próprios.

Nenhuma correção do produto foi executada. Acessibilidade global continua sem homologação; resultados de contraste/alvos são o recorte automatizado dos testes existentes.

## Causas confirmadas por texto e largura intrínseca

A investigação suplementar `overflow-sources.json` usa também `Range.getBoundingClientRect` e scrollWidth, pois somente a borda do elemento não revela texto que escapa de sua caixa.

- **Pagar/Receber,768 com fonte computada200:** `.summary-grid.finance-summary-grid .summary-card.amber strong` mantém `white-space:nowrap`; o texto monetário ultrapassa a caixa (275 px) e chega a x≈850, enquanto a borda pode continuar dentro do viewport. Não é o filtro nem uma tabela escapando de sua região. Recomenda-se estudar distribuição de colunas por largura/conteúdo ampliado; preservar valor/centavos/semântica e evitar truncamento.
- **Lançamentos,768/fonte200:** `.silex-ledger .summary-card strong`, texto/caixa de393,83px para coluna disponível357 px, chega a854,33. A grade e a tipografia precisam ser avaliadas em conjunto num escopo próprio. Normal e zoom nativo passam; o override de fonte do ensaio é registrado explicitamente.
- **Lançamentos,320/fonte200:** o texto do h1 `Lançamentos (Despesa/Receita)` alcança348,47px; não são os cartões V02. Recomenda-se quebra local de título longo, com risco baixo/moderado de composição e regressões de leitura.
- **Visão Geral:** `.summary-card > div > strong` conserva mínimo intrínseco do valor elevado. Documento1477/1440,440/375 e412/320 na ampliação computada. Conteúdo numérico sai da área visível, sem perda no DOM; risco de legibilidade financeira elevado para esse cenário, não cálculo errado.
- **Home com nome sintético não separável:** `.silex-home__heading`/parágrafo ocupa269 px para232 px disponíveis em256 ou163 px em187. Documento281px nas duas versões. O header global termina dentro do viewport. Propor quebra local do nome e teste de strings longas, sem editar dados pessoais persistidos.

Busca/Pesquisar nas três telas financeiras foi alcançada com **Tab real** e foco visível, com o botão inteiro dentro do viewport nas amostras (`reflow-detail.json`). Não foi demonstrado bloqueio desses controles essenciais. Isso não comprova todos os estados/toque/leitor de tela. Problemas que impeçam outra ação essencial devem ser classificados como bloqueadores daquele fluxo, sem serem ocultados.

## Zoom nativo executado

Firefox155 com janela isolada em Xvfb, atalhos nativos XTest e perfil temporário.1280 CSS px/DPR1 a100%;640/DPR2 a200%;320/DPR4 a400%, `visualViewport.scale=1` e CSS zoom1. O instrumento espera estabilidade de frames/viewport; amostras exploratórias durante a animação não são usadas como percentuais finais.

Oito superfícies por nível: público, Home, Visão Geral, Lançamentos, Pagar, Receber, Conciliação e Dashboard Financeiro. **16 estados confirmados, documento=viewport em todos.** Menu da Home abre/fecha por Enter/Escape e devolve foco nos dois níveis. Capturas/medidas em native-zoom-attempt.json. Não houve emulação de viewport nesses ensaios.

O ensaio de reflow a400% parte de1280 e chega a320 CSS px, compatível com a dimensão de referência de1.4.10. Não é uma declaração de conformidade WCAG integral, nem homologação de todos os controles nativos, leitores, dispositivos ou navegadores. Texto computado200 e o reflow adicional187/256 continuam sendo ensaios diferentes. Leitor real permanece pendente.
