# SB-06A — Diagnóstico de R02

Baseline aprovado: `67cdee96fd17c3e653e478d10fccdcd5296d2740`. Estado inicial limpo; `git fsck --no-reflogs` terminou com sucesso, apenas objetos dangling já presentes, sem limpeza. A branch `feat/sb06a-header-reflow` nasceu diretamente desse commit. O histórico anterior foi preservado.

## Causa medida

O componente está em `frontend/src/App.tsx`, classes `.topbar`, `.topbar-left`, `.breadcrumb`, `.topbar-right`, `.user-profile` e botão Sair. O cabeçalho não contém identificação empresarial própria: essa informação já reside no workspace lateral e na Home. O breadcrumb contém a marca fixa e o título de rota; o grupo direito contém o usuário e Sair.

No CSS anterior, o header tinha `height:48px`, `flex-wrap:nowrap`, gap de 20 px, grupos com `min-width:auto`, e, no celular, breadcrumb com `max-width:55vw`, `white-space:nowrap` e `overflow:hidden`. A largura mínima combinada impedia redistribuição. Em 320 px: grupo esquerdo 228 px + direito 67 px + gap 20 px + paddings 20 px = 335 px. O botão Sair terminava em x=325, criando 5 px de excesso no documento. Em 187 px, o grupo esquerdo media 154,85 px, o grupo direito terminava em x=251,85 e o documento chegava a 252 px. A medição antecede a correção; o E2E novo também falha contra o baseline em 320 px com esses mesmos retângulos.

A identificação empresarial sintética revelou um segundo limite do mesmo shell aberto: palavra longa sem espaço levava o painel de 250 para scrollWidth 324; em viewport 187 px o painel continuava com 250 px e o botão Fechar ocupava x=194–234. A coleta final espera o fim da transição antes de medir, evitando coordenadas intermediárias da animação.

## Solução localizada

Um bloco de 59 linhas em `styles.css`, sob `.app-shell`, permite altura automática, quebra de linhas dos grupos, `min-width:0`, breadcrumb com quebra visível e usuário com palavras longas acomodadas. Menu, Sair, avatar e chevron mantêm suas dimensões e não encolhem. O grupo esquerdo tem base flexível de 12rem; o direito pode passar para outra linha alinhado à direita. O padding vertical mantém os 48 px anteriores nas larguras usuais.

O painel móvel recebe somente limite `max-width:100%`, logotipo com mínimo flexível e botão Fechar sem encolhimento. O workspace permite quebra de palavras longas. Essas três regras de dimensionamento preservam o desenho, o SVG e o comportamento modal do menu; não há reorganização de grupos ou lógica nova. Não foi adicionado `overflow-x:hidden`, escala visual ou corte de textos/ações.

## Antes/depois — Lançamentos

| Viewport CSS | Documento antes | Documento depois | ScrollWidth header | Altura header |
| ---: | ---: | ---: | --- | --- |
| 1440 | 1440 | 1440 | 1240 → 1240 | 48 → 48 |
| 1024 | 1024 | 1024 | 834 → 834 | 48 → 48 |
| 768 | 768 | 768 | 768 → 768 | 48 → 48 |
| 375 | 375 | 375 | 375 → 375 | 48 → 48 |
| 320 | 325 | 320 | 335 → 320 | 48 → 48 |
| 256 | 290 | 256 | 300 → 256 | 48 → 89 |
| 187 | 252 | 187 | 262 → 187 | 48 → 91 |

A candidata foi medida nas 24 telas canônicas (23 módulos inventariados e Home), em sete larguras: 168 combinações por versão, sem erro JavaScript. Nenhum descendente visível do cabeçalho extrapola seus limites na candidata. No painel aberto de 187 px, largura/scrollWidth = 187/187 e botão Fechar em x=131–171; com nomes longos a 320 px, painel 250/250.

## Referência e limites

[WCAG 2.2 — 1.4.10](https://www.w3.org/TR/WCAG22/#reflow) exige, para conteúdo de rolagem vertical, apresentação equivalente a 320 pixels CSS de largura sem perda de informação ou função e sem rolagem em duas dimensões, com exceções para conteúdo que exige duas dimensões. A altura de 256 px se refere a conteúdo de rolagem horizontal. [Explicação oficial](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Aqui, 256 e 187 px de **largura** são robustez adicional; 187 não é ensaio normativo.

A geometria em 320 px cobre esse recorte de reflow do cabeçalho; não é uma declaração de conformidade WCAG completa. Redimensionar viewport ou ampliar a raiz CSS não prova zoom nativo. A tentativa em Firefox com janela própria no Xvfb, teclas nativas via XTest e captura X11 não demonstrou mudança confiável de viewport/DPR para 200/400%; essa homologação permanece pendente. Não foi usada escala CSS ou emulação de viewport para declarar zoom real.

A raiz a 200% foi testada como ensaio complementar. Como há tipografia em px, foi acrescentada outra simulação que dobra os tamanhos computados do cabeçalho/menu e verifica a ampliação efetiva; isso também não equivale a zoom nativo.

Em 187 px, a Visão Geral tem excesso próprio no conteúdo (documento 220 px), enquanto o header cabe. A Home com nomes sintéticos longos (usuário e empresa), especialmente o token extenso da saudação chega a documento 281 px em 256/187 px, com header dentro da viewport. São limites preexistentes e independentes, mantidos fora do SB-06A; não afetam a ausência de overflow nas larguras de 320 px ou superiores da matriz. P01 fica para SB-06B.

A probe dedicada identifica as causas locais: na Visão Geral, o valor de um indicador genérico termina em x=220,25 tanto antes como depois; o rótulo termina em x=204,60. Na Home com os dois nomes longos, `.silex-home__heading p` termina em x=281 nas duas versões por causa do token sem espaços no nome do usuário; cabeçalhos de seção e partes do banner também excedem a largura extrema. A rolagem horizontal interna de tabelas foi identificada separadamente e não é confundida com esses excessos no documento. Nenhum desses seletores foi modificado.
