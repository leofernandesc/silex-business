# SB-06B — gerenciamento e retorno de foco dos modais

Implementação de P01 pronta para revisão, com ressalva de teste independente T01 descrita abaixo. Somente SB-06B foi executado. Sem push, merge, deploy ou início de SB-06C.

## Baseline e Git

Branch `feat/sb06b-modal-focus`, criada diretamente do aprovado `fc3498e938cd2eef127dd65161ee909d9f67dd73`; workspace inicialmente limpo. Auditoria: `07426cc`. Correção de produção: `4e66679`. Commits posteriores de testes/documentação e hashes completos estão em git-summary.txt no pacote. Nenhum histórico anterior foi reescrito.

## Auditoria e causa

São **23 instâncias JSX de Modal em dez arquivos**. O histórico de 42 representa 14 aberturas × três larguras, não 42 componentes. A varredura atual cobre 15 aberturas × três larguras. [Inventário e padrões](AUDITORIA.md).

No baseline, 0/45 fechamentos por Escape devolvem foco ao acionador; abertura e contenção funcionam em 45/45. A instrumentação mostrou close() com diálogo já desconectado e foco no body. A limpeza passiva de useEffect acontecia depois da remoção do DOM.

## Solução

- useModalFocus centraliza showModal/close em useLayoutEffect, com fechamento enquanto o elemento ainda está conectado.
- Captura acionador e contexto semântico; após o commit verifica conexão, visibilidade, disabled/inert e foco escolhido deliberadamente por outro fluxo.
- Acionador indisponível recebe fallback lógico (região tabulável, diálogo ancestral ou main). Mudança de endereço respeita o novo destino.
- Uma observação limitada à permanência do foco no acionador cobre remoções posteriores pela recarga assíncrona das listas. Encerra quando o usuário segue para outro controle ou abre outro diálogo. Sem timers arbitrários.
- Escape interrompe propagação sintética para preservar um eventual diálogo ancestral; essa composição só existe na fixture de robustez, não nos fluxos atuais auditados.

Props, callbacks e apresentação do Modal preservados. O foco inicial seguro permanece no botão Fechar janela nos cenários auditados. Nenhum formulário ou handler financeiro foi adaptado. O diálogo nativo conserva modalidade, Tab/Shift+Tab, nome acessível e inércia externa. Backdrop não fechava o diálogo e continua com esse comportamento.

**Produção:** frontend/src/ui.tsx e novo frontend/src/useModalFocus.ts. As 14 outras funções de ui.tsx, incluindo Form, Field, Table e SummaryCard, são idênticas ao baseline; contrato de props do Modal idêntico. Nenhum CSS foi alterado.

## Testes e evidências

| Verificação | Resultado |
|---|---|
| Novos testes de componente em navegador real | 51/51 nas três larguras, React StrictMode |
| Novos fluxos operacionais e financeiros | 21/21 nas três larguras |
| Regressões E2E existentes | **248/249**, ressalva T01 |
| Fluxos financeiros existentes executados no baseline | 2/2; mesmos testes/valores/asserções utilizados na candidata |
| Suíte frontend Vitest | 71/71 em baseline e candidata |
| Suíte backend | 69/69 em baseline e candidata; warning Starlette/httpx já existente |
| TypeScript, build Vite e tipagem dos novos testes/fixture | Aprovados; sem script lint disponível |
| Equivalência financeira | Seis respostas de API idênticas, com fixtures descartáveis inicialmente idênticas |
| Retorno de foco na varredura de 45 aberturas | **0/45 → 45/45**; contenção e foco inicial preservados |
| Comparação de modais abertos | Nove pares pixel a pixel idênticos (Clientes/Pagar/Receber × três larguras) |

Os 72 cenários novos cobrem Escape, X, Voltar/cancelamento, confirmar, assíncrono, remoção/ocultação/desabilitação imediata e tardia do acionador, novo destino, histórico, desmontagem, continuidade do fluxo, diálogo aninhado de robustez e controles externos inertes. Clientes, produtos/serviços, parceiros, vendas/recibo/PDV, estoque, caixa, Lançamentos, Pagar/Receber, Conciliação, serviços e administração têm representantes; Empresa e identidade é formulário embutido sem Modal. Os 23 pontos de instanciação possuem representante de abertura/fechamento, sem afirmar teste de todas as combinações de dados.

Os quatro ensaios de retorno de foco no baseline falham como reprodução esperada de P01. Não são falhas novas da candidata. Rodadas exploratórias e falhas de fixture ficam registradas localmente e explicadas em [TESTES.md](TESTES.md). Não se alteraram asserções dos testes existentes, não se removeram validações e não se introduziram retries.

### T01 — espera networkidle na página pública

A única falha da suíte ampla ocorreu em public.spec.ts:173, mobile, na espera networkidle após recarregar a página pública. O DOM/captura já mostrava a página e os recursos finais registrados tinham HTTP 200. Esse cenário não abre diálogos, conforme o fluxo do teste e snapshot; chamadas do hook não foram instrumentadas nesse ensaio. A origem do timeout não foi estabelecida. Não foi modificado roteamento, autenticação, página pública ou o teste existente.

Diagnóstico do mesmo teste sem alterar asserções, três execuções por versão: baseline 3/3, candidata 3/3 aprovadas. A falha original não foi reproduzida no baseline; sua causa permanece não comprovada.

A ocorrência original permanece na matriz como falha; os ensaios diagnósticos adicionais não a substituem nem a transformam em aprovação da rodada ampla. T01 segue em acompanhamento, separada de V01. Evidência sem headers/corpos sensíveis: public-timeout-evidence.json e captura original no pacote.

## Responsividade, acessibilidade e limites

Capturas antes/depois em 1440, 768 e 375 px; galeria HTML em docs/evidence/sb06b/index.html. Conciliação mostra foco inicial; Clientes também foi capturado com fontes computadas duplicadas. Métricas e retorno estão em patterns-and-text200.json. Ampliação de texto simulada não equivale a zoom nativo: a tentativa de teclado em headless não homologou zoom 200/400%. Leitor de tela real e dispositivos físicos não foram homologados; não se declara conformidade WCAG completa.

R02/P03/P08 foram preservadas, com seus testes existentes aprovados. Permanecem os excessos independentes já documentados: Visão Geral chega a 220 px de documento em viewport 187; Home com identificação sintética longa chega a 281 px em 256/187. Cabeçalho, Home e Visão Geral não foram alterados neste incremento.

## Preservação, backup e entrega

Backups anteriores preservados. O ensaio de restauração recupera os 310 hashes do baseline e remove todas as adições em diretório temporário. Os dois arquivos existentes alterados são ui.tsx e PENDENCIAS.md; 308 arquivos anteriores ficam idênticos. Backend e os três arquivos do banco persistente (banco/WAL/SHM) mantêm hashes. Onze ZIPs históricos mantêm seus checksums.

[Procedimento de recuperação](PRESERVACAO.md), preservation-test.json, manifestos SHA-256 e originais dos dois arquivos modificados acompanham o ZIP. Lista completa de fontes, testes, scripts e documentos em [ARQUIVOS.md](ARQUIVOS.md). Evidências geradas são mantidas localmente e no ZIP; caches, builds, bancos, .git e credenciais estão excluídos.

## Situação das pendências e próxima decisão

P01 corrigida e validada no recorte automatizado descrito, sujeita à revisão deste pacote. P02/P03/P06/P08/V02 e R02 conservam seus estados comprovados. P04/P07/P09 pendentes; P05 parcial; V01 em acompanhamento. T01 permanece registrada sem correção fora do escopo.

Recomendação: revisar foco/fallbacks e a ressalva T01, complementar manualmente leitor de tela/zoom quando possível e autorizar explicitamente qualquer próximo incremento. SB-06C não foi iniciado.
