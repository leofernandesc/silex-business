# SB-05.2 — Ajuste final da legibilidade dos indicadores

**Data:** 14/10/2026 · **Branch:** `feat/sb05-financeiro` · **Baseline aprovado:** `9a9b58ac635bab184fb3b09c5dcf4a7857138588`

## Resultado

O defeito foi reproduzido em Contas a Pagar e Contas a Receber a 375 px. `overflow-wrap: anywhere` permitia dividir os algarismos, e a grade de duas colunas deixava apenas 137,5 px para o valor. Os quatro exemplos informados apareciam em duas linhas.

O ajuste ficou restrito a `frontend/src/accounts.css`: os valores agora usam `white-space: nowrap`, `overflow-wrap: normal` e `word-break: normal`; a tipografia varia com a largura e mantém 24 px no desktop; a grade considera a fonte raiz ao distribuir as colunas e usa uma coluna em áreas de até 600 px. `SummaryCard` permaneceu intacto.

## Evidências

- Capturas antes: seis imagens, Pagar/Receber em 1440, 768 e 375 px. Em 375 px, foram confirmadas as quebras de `R$ 2.797,00`, `R$ 1.652,00`, `R$ 2.888,00` e `R$ 1.618,00`.
- Capturas depois: seis imagens com os dados fictícios da fixture e seis imagens de validação visual com `R$ 2.797,00` e `R$ 1.234.567,89`, identificadas como exemplos fictícios. Duas imagens adicionais aproximam os cartões em 375 px.
- Depois da correção, todos os valores testados ocuparam uma linha, sem corte ou perda de centavos. A página não teve transbordamento horizontal em 1440, 768 ou 375 px.
- A ampliação de texto a 200%, o zoom CSS a 200% e a refluência equivalente a uma viewport de 187 px CSS foram testados. A área dos indicadores continuou sem quebra ou corte.
- Em 187 px CSS, a página inteira mede 252 px tanto antes quanto depois. A comparação localizou esse transbordamento preexistente no cabeçalho global (`.topbar-right`, até 225 px); este ajuste não alterou o shell.
- Lançamentos, Dashboard Financeiro e Visão Geral foram comparados antes/depois em três larguras: 18 combinações sem diferenças nos estilos verificados. Nenhum seletor novo alcança essas telas.

Galeria visual: [legibilidade-galeria.html](../../evidence/sb05-2/legibilidade-galeria.html). Os metadados e medidas estão em `docs/evidence/sb05-2/legibility-before.json`, `legibility-after.json`, `legibility-zoom-200.json` e `legibility-other-pages.json`.

## Validação

- `npm run build`: aprovado em cópia isolada.
- Vitest: **65 testes aprovados**.
- TypeScript estrito do teste E2E: aprovado.
- E2E focal: **18 testes aprovados**, cobrindo valores pequenos/grandes, foco de busca P02 e hierarquia de criação P06 em Pagar/Receber nas três larguras.
- Suíte backend isolada: **69 testes aprovados**, com um aviso preexistente de depreciação Starlette/httpx; o backend não foi alterado.
- Diferenças de estilos nas três telas fora do escopo: **0**.
- Backend, banco, API, cálculos e regras financeiras não foram modificados.

P02 permanece corrigida e validada; P06 permanece corrigida em Lançamentos e Pagar; P05 continua parcial. A observação V01 do Dashboard continua registrada sem alteração de navegação.

Os testes de aplicação foram executados na cópia isolada em `/tmp/silex-sb052-legibility-20261014`. O backup dos dois arquivos preexistentes foi verificado em `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-2-legibility/20261014T201500Z`.

## Arquivos e Git

Arquivos funcionais alterados: `frontend/src/accounts.css` e `frontend/tests/accounts-interface.spec.ts`. Foi adicionado o script de captura `docs/evidence/sb05-2/scripts/capture-legibility-review.cjs` e este relatório. As imagens e os JSONs gerados ficam em `docs/evidence/sb05-2` e seguem ignorados pelo Git, conforme a política de evidências.

O hash do commit corretivo e o diff completo serão anexados ao manifesto de revisão após a conferência dos arquivos staged. Sem push, merge ou deploy.
