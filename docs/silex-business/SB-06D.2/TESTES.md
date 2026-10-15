# Validação SB-06D.2

Somente ambiente isolado e dados fictícios; banco real não usado. Resultados por cenário/resolução em test-matrix.json e resumo em test-results-summary.json.

| Verificação | Cobertura |
| --- | --- |
| Tipos / build | TypeScript e Vite em cópias baseline/candidata; tipagem explícita de novos E2E/configs |
| Frontend | 96 testes em cada versão |
| Backend | 69 em cada versão; aviso Starlette/httpx anterior, sem instalação de dependência |
| E2E principal | 285: 249 anteriores + 18 acessibilidade + nove datas SB-06D.1 + nove do piloto/coletor |
| Modal separado | 72: 51 componente + 21 fluxos; outra fixture para não reutilizar o caixa fechado com vendas |
| Comparação baseline | Nove novos cenários do piloto/coletor na versão aprovada |
| Computados | 201 estados pareados, 71 propriedades, 581.135 valores; retângulos/scroll/estados; zero diferenças |
| Home complementar | 12 pares de sondas normal/hover/foco nas quatro larguras, com seletores adicionais de links |
| Visual | 68 pares principais idênticos; comparações suplementares de relatórios separadas |
| Ordem CSS | Dez estados, incluindo entrada fria, CTA público/login, hashes aquecidos, Voltar/Avançar/refresh |
| Impressão | 24 regras iguais; propriedades de duas telas em print media equivalentes |
| Financeiro | 35 JSON e 30 saídas CSV/print com hashes iguais |

São 357 cenários candidatos distintos, mais nove comparações baseline; não somar novamente os nove do piloto dentro da suíte principal. Os resultados finais efetivos são consolidados pelo script finalize.py, que rejeita falhas, skips, retries ou grupos incompletos.

## Desenvolvimento do instrumento

Uma primeira execução exploratória do coletor parou porque uma asserção negativa buscava `.empty` mesmo quando a tabela carregada já havia removido o placeholder. O critério correto exige **zero placeholders de carregamento**, além de resposta 200, slug, título e cada célula. O log inicial permanece em exploratory, e a ocorrência é registrada em collector-development.json. Não foi falha do produto nem um E2E antigo alterado para passar; a versão final foi executada integralmente nas duas cópias. Não há retries para mascarar falhas.

O teste novo do relatório demonstra uma requisição deliberadamente suspensa **somente no teste**, sem timer, resposta fictícia ou alteração de API, e exige que networkidle sozinho não seja aceito como pronto. Ao liberar a requisição normal, valida a resposta e a tabela real. As nove sondas naturais do suplemento também observaram o estado prematuro.

## Acessibilidade, limites e observações

P01/P02/P03/P04/P06/P08/P09/V02/R02 cobertos pelos testes existentes pertinentes, sem mudança nos seus componentes. A comparação mede fontes, cores, bordas, controles, seleção/desabilitado, foco, hover, erro de intervalo e tabelas roláveis. Igualdade visual não é a única prova.

Texto computado a 200% é simulação, não zoom nativo. Permanecem os excessos anteriores de Lançamentos: 854/768 e 348/320; filtros/conteúdo independentes não foram redesenhados nem escondidos. Outros limites históricos em Home/Visão Geral permanecem. Leitor de tela real, toque físico, zoom nativo e todos os agentes de impressão não homologados.

V01: 60 cliques dirigidos, sessão, carregamento, destino, eventos e erros registrados em v01-navigation.json. A origem histórica continua não comprovada; manter em acompanhamento. T01: suíte pública original executada sem mudar página/asserções/networkidle; uma aprovação não encerra a observação. Resultados efetivos constam no resumo final.
