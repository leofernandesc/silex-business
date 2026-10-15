# Silex Business — SB-06D.2

Análise executável da cascata e um piloto de organização CSS. Baseline `48d6e36c0c865fec198f1dd03dab573505418063`; branch `feat/sb06d2-css-pilot`. Nenhuma outra família reorganizada; SB-06E não iniciado. Sem push, merge ou deploy.

## Alteração de produção

**Somente ledger.css**, três linhas removidas. A regra comum de span/small nos indicadores de Lançamentos passa a conter font-size. A regra isolada de span e a declaração repetida de small deixam de ser necessárias; line-height de small permanece específico. Não há novos valores, seletores, tokens ou comportamento.

Benefício concreto: **um ponto de manutenção**, em vez de dois, para a tipografia comum dos títulos/detalhes dos quatro indicadores. Ganho pequeno e localizado; não se promete melhora perceptível de desempenho. [Justificativa, consumidores, ordem e especificidade](PILOTO.md).

Nenhum TSX funcional, handler, API, banco, regra financeira, auth, permissão, rota, cálculo, template ou componente compartilhado foi alterado. Dos oito CSS, sete são byte a byte iguais; tokens, estilos globais e ordem de importações permanecem intactos. Total de regras: **999 → 998**; ledger: **76 → 75**. Isso não elimina os 76 grupos históricos de seletores repetidos nem encerra P07.

## Evidências de equivalência

- Rastros ordenados de declaração por seletor/contexto idênticos, expandindo listas sem mudar especificidade (0,2,1).
- Matriz principal: 201 estados pareados, quatro larguras, **581.135 propriedades de estilo**, além de geometrias/estados; zero diferenças.
- **68 pares PNG idênticos byte a byte**. Sondas adicionais de links da Home em hover/foco e ordem em dez estados de navegação complementam a matriz.
- 24 regras de impressão intactas, duas telas com estilos computados em media print equivalentes. Isso não é homologação de todos os drivers/PDF.
- 35 respostas JSON e 30 exportações/impressões iguais em dados fictícios idênticos. Backend e todos os contratos/fontes de negócio mantêm hashes.

[Matriz e método](MATRIZ.md), [testes e limites](TESTES.md). Valores, fontes, SVGs e cores semânticas permanecem aprovados. Não houve aparência alterada para justificar a reorganização.

## Suplemento de relatório mensal

A imagem histórica candidate-result-monthly-1440 do SB-06D.1 mostrava carregamento após selecionar Resultado por competência. O predicado networkidle não esperava a tabela correta. A sequência foi observada em nove sondas naturais; o novo coletor exige resposta do slug, título e todas as células correspondentes. São 18 capturas suplementares estabilizadas, distinguindo antes/depois do incremento de datas e antes/depois do CSS. [Diagnóstico](SUPLEMENTO-RELATORIOS.md).

Não houve correção no produto ou em seus filtros. Imagens, relatórios, fontes de evidência e ZIPs anteriores permanecem intactos.

## Testes e recuperação

TypeScript/build, frontend 96 e backend 69 em cada versão aprovados; **357 cenários candidatos e nove comparações baseline aprovados**, com zero retries. Os 12 pares adicionais de Home coincidem. V01: 60/60 destinos corretos, sem pageerror/falha de rede observados; T01: 21/21 testes públicos aprovados. Ambos continuam em acompanhamento. Detalhes em TESTES.md e test-results-summary.json. P01/P02/P03/P04/P06/P08/P09/V02/R02 têm regressões pertinentes. Não foram alterados testes antigos nem introduzidos retries.

Backup externo dos **374 arquivos aprovados**, originais dos arquivos efetivamente alterados e hashes SHA-256. Restauração ensaiada em diretório temporário, com remoção das novas fontes do incremento. Banco persistente somente teve hashes lidos; testes usam fixtures descartáveis. [Procedimento](PRESERVACAO.md).

Galeria `docs/evidence/sb06d2/index.html`; pacote `SB-06D.2-review.zip`, com manifesto interno, diff, commits e evidências essenciais. Sem .git, bancos, credenciais, traces, caches ou builds. Acervo completo local preservado.

## Pendências e próxima decisão

P07 **parcial**; P05 **parcial e inalterada**. V01/T01 permanecem em acompanhamento, sem conclusão causal a partir de testes aprovados. Larguras excessivas antigas com texto ampliado e limites de Home/Visão Geral continuam documentados; zoom nativo/leitor real não homologados. Não se declara conformidade WCAG integral nem prontidão de produção.

O benefício do piloto está demonstrado; recomenda-se **manter o restante da cascata atual** até necessidade concreta e autorização de outra família. Shell, tabelas, Modal, impressão e migração de tokens continuam adiados por risco. Aguarda revisão explícita; não iniciar outra reorganização automaticamente.
