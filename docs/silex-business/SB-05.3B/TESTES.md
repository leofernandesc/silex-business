# Testes e limites — SB-05.3B

## Ambiente e resultados

Baseline aprovado 86e9400, inicialmente limpo. Arquivos históricos preservados. Fontes isoladas extraídas por git archive; builds/tsbuildinfo/test-results em `/tmp/silex-sb053b-mb6vpfgi`. Quatro bancos fictícios independentes para capturas/operações; nenhum dado real. Fixtures básicas reutilizam scripts aprovados sem alterar seus originais; extensão via APIs existentes gera valores elevados/negativos/zero, 12 meses e competências distintas. Integrity/foreign-key checks constam da matriz.

| Verificação | Resultado |
| --- | --- |
| Frontend baseline | 65/65, dez arquivos |
| TypeScript/build Vite baseline | Aprovados |
| Frontend candidata | 71/71, onze arquivos; seis testes novos de apresentação |
| TypeScript/build Vite candidata final | Aprovados |
| Checagem TypeScript estrita do novo E2E | Aprovada |
| Backend existente preservado | 69/69; um warning anterior Starlette/httpx |
| E2E próprios do Dashboard | 21/21 validados, sete cenários nas três larguras |
| Suíte herdada | **208/210 aprovados**; duas falhas de overflow em Lançamentos no celular |
| Reprodução dessas duas falhas no baseline | Duas falhas iguais, pt-BR/en-US, confirmando problema anterior |
| Respostas financeiras e representação da UI baseline/candidata | Nove pares HTTP e nove pares de UI idênticos |
| V01 | 60/60 cliques direcionados aprovados, observação aberta |
| Estilos de nove telas fora do Dashboard | 27/27 comparações estáveis iguais |
| SHA-256/AST/backup/restauração | Aprovados; snapshot de 2.542 originais |

Não há comando lint configurado. Sem instalação de dependências ou alterações em configurações compartilhadas. Prettier somente nos novos arquivos; git diff --check aprovado. Scripts/evidências próprias acompanham o pacote; logs/traces anteriores completos permanecem locais. Não há retries automáticos.

## Dashboard: sete cenários nas três larguras

1. Seis rótulos/valores e complementos vencidos iguais à API; classificações, ordem e saldos de todas as contas; nenhuma consulta financeira decorativa.
2. Draft não consulta até Atualizar. De/Até continuam date/ISO; captions dd/mm/aaaa. Período 2001 zera movimentos/classificações, mas mantém títulos em aberto e contas atuais; gráfico ainda possui 12 meses. Intervalo invertido conserva 422/Notice.
3. Doze meses, mesmos títulos/tooltips, mesmas expressões/alturas de barras, nomes acessíveis e tabela com ambos os valores. Disclosure Enter, foco do gráfico, setas e última coluna de classificação acessíveis. Contrastes de meses/cabeçalhos verificados após ajuste local.
4. Valores reais da fixture: pequenos, negativos e elevados, incluindo R$ 1.234.567,89. Uma linha, sem elipse/corte; reflow da grade acompanha tamanho do texto. Texto duplicado por tamanho computado, CSS zoom de 200% e metade da viewport; em 187 px CSS, overflow global é tratado separadamente como R02.
5. Carregamento (role=status/aria-busy), contas vazias e erro de consulta por stub estritamente apresentacional de fetch no navegador. Stub não escreve dados nem afirma cobertura do backend vazio; erro/Notice e fallback numérico original preservados.
6. Visitante 401 e operador 403 pelo backend; URL direta não monta Dashboard, redireciona para Visão Geral com aviso e preserva o guard existente.
7. Abrir livro caixa abre `/app#finance`; Voltar/Avançar e refresh retornam ao Dashboard correto e aos valores originais. Dashboard Financeiro continua distinto de `/app#dashboard`.

## Comparação financeira

Três intervalos nas três larguras: padrão, mês histórico e período sem movimentos. JSON completo de `/finance/dashboard?start=…&end=…` idêntico entre cópias de fixture. A UI também coincide nos seis indicadores, informações complementares, tooltips/alturas, texto da tabela de classificação e saldos/nomes/tipos de contas. Não foram normalizados valores financeiros ou mascaradas diferenças. Detalhes em financial-comparison.json.

O período sem movimentos conserva valores elevados de títulos/saldos atuais, comprovando suas janelas distintas. O gráfico termina no mês de end, considerando meses completos; start não altera a série. Classificação usa competência e exclui subcategorias marcadas como sem efeito no resultado. O dado de teste com datas de lançamento e competência distintas foi criado somente pela API no banco descartável.

## Responsividade e acessibilidade

Capturas em 1440/768/375, com fonte Inter local carregada, valores completos, filtros, seis indicadores, gráfico, classificações/contas, foco, última coluna e texto ampliado. Tabelas mantêm colunas e possuem rolagem interna com orientação e acesso por teclado; gráfico preserva todas as séries e pode rolar em área própria. Alternativa tabular não exige perceber cor/posição; legenda distingue texto e padrão além da cor. Contraste foi medido em recortes equivalentes de texto/controles, não como certificação geral do ERP.

Recorte textual: 29 ocorrências abaixo de 4,5:1 por largura no baseline e zero na candidata após ajustes locais (mensagens auxiliares, meses, cabeçalhos e contas). P04 global continua aberta. Bordas dos campos e botão secundário usam token de controle; foco de 2 px/offset de 3 px azul médio. Rótulos, headings e estados foram inspecionados no DOM/teclado. Leitor de tela real, dispositivos físicos e zoom nativo do navegador não foram homologados.

R02: no celular, viewport 187/documento 252 antes/depois; raiz candidata de 163/scroll 163. CSS zoom de 200%: documento 584 em ambas, raiz candidata de 164/164. Em1440/768 e texto ampliado, o Dashboard não introduz overflow de página. Não se declara conformidade completa do shell em reflow.

V01: dez cliques por largura em cada versão,60 ao todo. Logs registram sessão autenticada 200, carregamento concluído, fontes prontas, destino esperado/observado, hash/popstate, console e resultado individual. Todos passaram. Esse cenário estável não cobre todas as corridas possíveis durante carregamento nem determina a causa histórica; V01 permanece aberta e roteamento não foi alterado.

## V02 — duas falhas herdadas justificadas, sem correção fora do escopo

Suíte herdada executou 210 cenários: 208 passaram; os testes P05 de Lançamentos em pt-BR/en-US no celular passaram suas asserções de ISO/caption/required/max, mas falharam no overflow final. Os valores elevados da fixture expõem a grade de duas colunas de Lançamentos, cujo número de 24 px ultrapassa o cartão. Os dois testes também falham na cópia do baseline aprovado.

Sondagem adicional nas cópias visuais, com dados idênticos e o mesmo fluxo: documento 401 px em viewport 375 nas duas versões, valores/estilos iguais e nenhum `.silex-financial-dashboard` montado. Evidências: legacy-ledger.json, baseline-ledger-results.json e capturas before/after. Isso separa o problema anterior de uma regressão deste incremento. Nenhuma redução dos valores de teste, mudança de asserção ou ajuste em ledger.css/SummaryCard foi feito para obter aprovação artificial.

V02 registrada no documento central, gravidade média; correção requer autorização específica para Lançamentos. Não se afirma que todos os testes herdados passaram. Demais módulos, P02/P03/P06/P08, Conciliação e permissões permanecem validados.

## Tentativas e ajustes de validação

- Novo teste unitário foi inicialmente nomeado .test.tsx; o glob existente aceita apenas .test.ts. Renomeado e usado createElement, sem alterar vitest.config. Resultado final 71 testes, incluindo os seis novos.
- Primeira ferramenta de comparação usou URL relativa sem baseURL; corrigido somente o contexto do script. A comparação final usa espera pelos valores e registra nove pares iguais.
- Texto Pico destinado a sr-only era visível no CSS legado. Regra local de texto visualmente oculto preserva o conteúdo; primeira versão sem conter seu posicionamento gerou overflow móvel após rolar. Posicionamento contido por mês corrigiu a regressão, validada novamente nas três larguras. Nenhuma expressão de altura/dado foi alterada.
- Uma captura foi iniciada durante a reconstrução da cópia isolada e registrou assets de versões intermediárias; não integra a revisão final. Capturas finais foram regeneradas após build concluído. Logs dessa tentativa permanecem locais.
- Primeira auditoria de contraste encontrou falhas herdadas em meses/cabeçalhos; CSS local passou a consumir token de texto. Testes/medição finais aprovados; nenhum styles.css compartilhado alterado.
- Testes históricos recebem apenas guard de diretório temporário e porta isolada nas cópias de app/home/navigation/public. Diffs/hashes registram a adaptação; ações/asserções e fontes originais preservadas. Nenhuma espera de fonte foi acrescentada aos cliques originais desses testes.
