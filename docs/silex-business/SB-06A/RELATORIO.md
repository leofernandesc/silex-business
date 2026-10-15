# SB-06A — Reflow do cabeçalho global

Data: 15/10/2026.

Baseline aprovado: `67cdee96fd17c3e653e478d10fccdcd5296d2740`. Branch: `feat/sb06a-header-reflow`. Correção de produção: `bcf91dc7602e29905367217393fcd6e3566301ca`.

O cabeçalho anterior mantinha os grupos em linha única, com larguras mínimas de conteúdo e breadcrumb sem quebra. Isso empurrava Sair além da viewport: documento 325 px em 320 px e 252 px em 187 px. O [diagnóstico](DIAGNOSTICO.md) detalha seletores, medidas anteriores e justificativa.

A correção acrescenta um bloco de CSS sob `.app-shell`: grupos e breadcrumb podem quebrar, a altura acompanha o conteúdo, palavras longas cabem e os controles conservam suas dimensões. Em larguras extremas, o grupo direito passa para a linha seguinte. O painel móvel recebe limite de largura e dimensionamento flexível do logo para manter Fechar acessível; o workspace acomoda o nome empresarial extenso. Não há corte por overflow nem escala artificial.

| Viewport | Documento antes | Documento depois, Lançamentos |
| ---: | ---: | ---: |
| 1440 | 1440 | 1440 |
| 1024 | 1024 | 1024 |
| 768 | 768 | 768 |
| 375 | 375 | 375 |
| 320 | 325 | 320 |
| 256 | 290 | 256 |
| 187 | 252 | 187 |

O header cabe nas 168 combinações da candidata (24 telas × sete larguras), com administrador e cenários adicionais de operador/nomes longos. As 23 telas operacionais e Home usam os mesmos dados, rotas, agrupamentos e controles. Texto normalizado do conteúdo coincide em 23 telas; Histórico de operações difere pelos logins de teste e seus timestamps próprios. Sete respostas de negócio comparadas são integralmente idênticas. Cabeçalho desktop/tablet, Login e página pública têm pixels idênticos nos nove pares conferidos.

A fonte Inter, cores, SVGs oficiais, tokens, rotas, hooks de sessão/menu, permissões, backend, banco persistente, cálculos, módulos financeiros, formulários e impressões não mudaram. P01 continua para SB-06B. V01 permanece em acompanhamento, e V02 segue corrigida.

## Testes e limites

Build/TypeScript, 71 testes frontend, 69 backend e 171 E2E distintos aprovados, sem skips/retries na rodada final. O commit de testes/evidências é `2c8dc8d9725f9fc0e83844a47dc29ae31d705b5a`; o commit final de documentação e o estado da branch constam em `git-summary.txt` no pacote. Backup conferido e restauração dos dois originais, com remoção dos 12 arquivos novos, ensaiada fora do checkout.

Resultados completos, execuções iniciais e limitações: [TESTES.md](TESTES.md). O ensaio geométrico cobre 320 px CSS; 256/187 px de largura são robustez adicional. Foram separados aumento da raiz, duplicação efetiva de fontes e tentativa de zoom nativo. Zoom real a 200/400% não foi homologado pelo harness; não se declara conformidade WCAG completa.

O header não causa excesso nas sete larguras. Em 187 px, a Visão Geral conserva excesso local no conteúdo; a Home com identificação sintética longa tem excesso próprio em 256/187 px. Essas ocorrências foram comparadas ao baseline e registradas sem correção incidental.

## Arquivos e revisão

Produção: apenas `frontend/src/styles.css` (59 linhas aditivas). Novo teste: `frontend/tests/header-reflow.spec.ts`. Fontes de evidência: seis scripts em `docs/evidence/sb06a/scripts/`. Documentação: este relatório, `DIAGNOSTICO.md`, `TESTES.md`, `PRESERVACAO.md`, `REPRODUCAO.md` e atualização de `PENDENCIAS.md`. O diff completo e os hashes de commits estão no pacote.

[Galeria antes/depois](../../evidence/sb06a/index.html) · [ZIP de revisão](../../evidence/sb06a/SB-06A-review.zip) · [preservação/reversão](PRESERVACAO.md) · [reprodução](REPRODUCAO.md).

Aguardando revisão explícita. Nenhum push, merge, deploy, correção de P01 ou início de SB-06B foi realizado.
