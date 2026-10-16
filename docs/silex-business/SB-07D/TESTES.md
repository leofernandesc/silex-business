# SB-07D — testes

| Verificação | Resultado | Evidência |
|---|---|---|
| TypeScript/build baseline e candidata | Aprovados | baseline-build.log, candidate-build.log |
| Tipos do teste/configuração novos | Aprovados | test-types-final.log |
| Frontend | 121/121 em ambas as versões | baseline-unit.log, candidate-unit.log |
| Backend pertinente, sem alteração | 17/17: serviços, livro caixa, expansão financeira | backend.log |
| C02 final | 3/3: dois perfis, 336 estados pareados; recibo e CSS de impressão | c02-final-results.json |
| Navegação, Home, permissões, P01/P03/P08, V02/C01, público e Serviços | 36/36 | regression-results.json |
| Expiração histórica | 3/3, executados sem skip | expired-session-results.json |
| Cabeçalho R02 | 5/5, sete larguras, perfis, texto 200% e menu | header-regression-results.json |
| SB-07C | 6/6: en-US/UTC, inválida/parcial/required/min/max, mensal, calendário em Modal 375/320 | date-regression-results.json |
| P02/P06 e valores financeiros fora do escopo | 3/3 aprovados | finance-focus-results.json |
| API/financeiro real | Oito respostas iguais para admin/operador, incluindo recusas de acesso | api-comparison.json |
| Zoom Firefox real | 16 estados, oito candidatos sem excesso; menu/foco | native-zoom.json |
| Região nova | Tab a partir da ação anterior, contorno visível, setas e valores preservados | keyboard.json |
| Visual padrão | Dez pares iguais byte a byte em 1440/1024/768/375/320 | standard-visual-comparison-final.json |
| Preservação/recuperação | Hashes e AST iguais; restauração fora do checkout | preservation-test.json, restoration-test.json |

As três expirações também fazem parte da seleção de 36; não são contadas como cenários independentes adicionais. Não foram usados retries ou relaxamento de asserções antigas.

## Ambiente e dados

Servidores loopback, backend extraído do commit aprovado, SQLite temporário. A candidata de comparação e a base funcional 8011 são clones do mesmo banco sintético inicial. O banco persistente nunca é configurado nos instrumentos. Os geradores históricos são apenas lidos, com saídas redirecionadas à evidência SB-07D.

A matriz de apresentação usa respostas sintéticas idênticas para nomes curtos/longos/sem espaços, descrições extensas, valores positivos/elevados/negativos e caixa. Esses overrides são exclusivamente do instrumento no navegador e não alteram as APIs servidas. A comparação financeira usa respostas reais sem override, em clones equivalentes. As finalidades não são confundidas.

A Visão Geral possui quatro indicadores por perfil, últimas vendas e alertas de estoque; não se inventou gráfico ou série temporal que não existe nela. O Dashboard Financeiro não foi modificado.

## Sessão expirada

Os testes históricos exigem um diretório com prefixo SB-04B. O launcher cria um **novo** temporário `silex-sb04b-sb07d-*` com um link para o SQLite descartável atual e manifesta essa compatibilidade. Os três testes originais atualizam exclusivamente suas sessões nesse arquivo, sem modificar testes, backend ou autenticação. Não se simula uma expiração no banco persistente.

## Ocorrências registradas

- O Playwright 1.64 aprovado no lockfile e o Firefox instalado 155 têm incompatibilidade ao usar interceptação `page.route`: o protocolo rejeita `bypassServiceWorker`. Nenhuma dependência foi alterada. Os instrumentos Firefox usam o padrão fetch sintético já empregado historicamente. Regressões antigas que dependem de interceptação rodaram no Chromium existente via Brave, com perfil descartável.
- O primeiro instrumento C02 usava `demo.operator`, que não existe; a conta real da fixture é `demo.operador`. Admin passou e o caso operador falhou no login antes de avaliar layout. O instrumento foi corrigido e a rodada final completa passou, sem mudar credenciais ou asserções.
- A primeira chamada de tipagem extra partiu da raiz, sem resolver os tipos Node do frontend. A mesma checagem executada no diretório correto passou. Build/TypeScript de produção já estavam aprovados.
- A primeira versão aplicava overflow auto dos indicadores em todas as larguras, alterando pixels das sombras no desktop. A regra foi restringida abaixo de 300 px. Dez comparações finais normais são byte a byte iguais; a matriz completa final foi repetida e aprovada.
- O aviso de depreciação Starlette/httpx dos testes backend é preexistente. Não houve upgrade para eliminá-lo.

## Limites de acessibilidade e estabilidade

Tab, setas, Escape, retorno de foco, nomes acessíveis e foco visível foram exercitados. As cores existentes e os alvos não são reduzidos; o novo foco/legenda reutiliza os tokens aprovados. Há um novo ponto de Tab na região de indicadores, na ordem do documento após Iniciar venda, permitindo pan sem depender do ponteiro.

Texto computado 200% e zoom nativo são ensaios distintos. No zoom real foi verificado DPR, viewport e CSS zoom=1, partindo de 1280 px. 256/187 de largura são ensaios adicionais, não referência normativa vertical. Rolagem interna das tabelas permanece; nos números que não cabem nas larguras adicionais, o pan é local e informado.

Não houve leitor de tela real, dispositivo físico, participante humano, auditoria de segurança ou homologação final. V01/T01 permanecem em acompanhamento: os casos pertinentes passaram, sem comprovar a causa histórica nem justificar mudar navegação. Nenhuma declaração de prontidão comercial.
