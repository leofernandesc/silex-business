# SB-06C — testes, tentativas e limites

Os resultados finais e cada caso/projeto estão em `test-results-summary.json` e `test-matrix.json`. As execuções finais usam um worker, sem retries, Firefox instalado, dados fictícios e bancos descartáveis. Não foram instaladas dependências nem alteradas as asserções herdadas.

## Cobertura

| Grupo | Cobertura |
| --- | --- |
| TypeScript/build Vite | Cópias baseline/candidata; tipagem adicional do novo E2E |
| Frontend Vitest | 71 casos por versão, 11 arquivos |
| Backend pytest | 69 casos por versão; warning Starlette/httpx preexistente |
| Novo E2E visual | 18 casos: seis padrões × 1440/768/375; inclui 320, placeholder com alpha/Color4, borda ≥3:1, texto ≥4,5:1, semântica, alvos 36/44, P02, teclado/retorno de modal e última coluna |
| Regressão principal | 249 casos existentes, banco próprio: app, navegação, Home, público, R02, Lançamentos/V02, Pagar/Receber/P02/P06, Conciliação e Dashboard |
| Regressão de modal | 72 casos existentes, banco separado: 51 de componente + 21 fluxos operacionais/financeiros; P01, Tab/Shift+Tab/Escape e async |
| Auditoria de telas | 104 combinações iniciais: 26 telas × quatro larguras; três larguras com capturas e diálogos. Estados de hover/foco por classe e menu aberto complementam a matriz |
| Texto computado a 200% | 52 comparações: 13 rotas × quatro larguras. Recarregar cada destino antes de duplicar as fontes evita ampliação cumulativa entre hashes |
| V01 | 60 cliques dirigidos: duas versões × três larguras × dez execuções, com destino, autenticação, carregamento e erros registrados |
| Equivalência financeira | Seis respostas API nas mesmas fixtures; fontes de dados/handlers/cálculos idênticos por SHA |

Todas as 23 telas operacionais constam do inventário, além de Início/login/público. A comparação estabilizada verifica as colunas e excesso horizontal antes/depois. Nenhum dado financeiro foi reduzido ou ocultado para tornar testes verdes.

## Tentativa intermediária e diagnóstico de fixture

Uma primeira execução reuniu 249 regressões e 72 fluxos de modal no mesmo banco. Foram **206 aprovações e duas falhas reais**, antes da interrupção deliberada para alinhar o último CSS e o isolamento. Um caso foi interrompido e 112 não executados; esses números não entram como aprovações da rodada final. Logs/JSON completos continuam locais.

As falhas eram `app.spec.ts:169` (recibo após finalizar venda) e `:403` (finalizar rascunho). O snapshot mostra “Seu caixa está fechado”/“Abra seu caixa antes de finalizar”. O teste de modal `Caixa: confirmação assíncrona…` fecha o caixa no fim de cada projeto. Os testes antigos seguintes pressupõem caixa aberto. A consulta `/cash-sessions/current` confirmou null nas duas versões com a fixture fechada e caixa aberto na fixture inicial.

Os **dois testes originais foram reexecutados no baseline aprovado**, com cópia da fixture fechada, e reproduziram as mesmas falhas. Resultado esperado dessa investigação: 0/2 aprovados, sem retries/alteração das asserções. `closed-baseline-diagnosis.json` e `cash-precondition.json` registram a investigação. Não é uma falha nova do CSS nem um motivo para modificar o caixa/PDV do produto.

A validação final separa 249 regressões de 72 testes de modal em fixtures novas, conforme a organização aprovada no SB-06B. Os 18 testes de estilo são medidos em outra cópia estável. Erros de protocolo do Firefox durante a interrupção são preservados no log intermediário, sem atribuição automática ao produto.

## Instrumentos e novas capturas

A coleta inicial podia registrar o carregamento logo após mudar hash. Capturas finais usam reload e aguardam conteúdo; a Visão Geral tem rechecagem própria com título e banner presentes. Arquivos intermediários não foram apagados nem usados como prova de perda de colunas.

O parser inicial de placeholder não escalava canais `color(srgb …)` para 0–255. Foi corrigido, e os placeholders receberam cor explícita acessível. As matrizes recompõem os valores intermediários quando necessário. Uma primeira simulação de texto conservava fontes inline entre hashes e produzia ampliação cumulativa; foi descartada como medição de 200%, preservada localmente e repetida com reload por destino. Não há mudança de produto para acomodar esses instrumentos.

## Limitações

- Atalhos Ctrl+Equal no Firefox headless não modificaram innerWidth/DPR/visualViewport.scale. **Zoom nativo 200/400% não homologado.** Texto computado duplicado e viewport reduzida são ensaios distintos.
- Texto a 200% conserva excessos preexistentes no conteúdo da Visão Geral e em filtros de Lançamentos/Pagar/Receber, além de Estoque a 320. `text200-matrix.json` distingue origem e confirma ausência de aumento pela candidata. Home/Visão Geral em larguras extremas conservam seus limites anteriores.
- Gradientes: estimativas por DOM Range/pixels adjacentes complementam a medição sólida; não certificam cada pixel sob glyphs e overlays. O parágrafo clareado pelo ícone foi corrigido conservadoramente para branco e testado.
- Desabilitados/decoração/exceções de alvo são classificados, não aprovados ou reprovados por limiar universal. Popups nativos, toque físico e leitor de tela real não têm homologação completa.
- V01 e T01 continuam em acompanhamento; novas aprovações não identificam as causas históricas. Não houve alteração de página pública, rotas, autenticação ou asserções para fazê-las passar.
