# Piloto — metadados dos indicadores de Lançamentos

## Decisão após Fase A

Baseline aprovado `48d6e36c0c865fec198f1dd03dab573505418063`. Backup dos 374 arquivos verificado antes de qualquer CSS. Matriz inicial de 201 estados em 1440/768/375/320, com tipografia, layout, cores, bordas, interações, tabelas e texto computado 200%. Ordem real de CSS registrada em dez estados de navegação pública/login/Home/módulos/Voltar/Avançar/refresh.

**Uma família:** títulos e detalhes dos quatro indicadores de Lançamentos, seletores `.silex-ledger .summary-card span` e `.silex-ledger .summary-card small`, em ledger.css. Não modificar SummaryCard, dinheiro, grid, contas, Dashboard, tabelas, shell ou Modal.

## Dificuldade concreta e benefício

Três regras adjacentes, a partir da linha 77, repetem o mesmo token font-size em dois pontos: span e small. A cor já é comum. Alterar a tipografia dessa família exigia editar duas declarações equivalentes e poderia deixar título/detalhe divergentes. Reunir font-size na regra comum deixa **um ponto de manutenção** para essa propriedade, preservando line-height específico do detalhe.

Não se escolheu o público ou uma camada global. A redução de linhas não é o critério: o benefício é remover a duplicação de uma decisão tipográfica comprovadamente comum. O ganho é pequeno e declarado como tal; não resolve P07 integralmente.

## Cascata e especificidade

- Ambos os seletores possuem especificidade **(0,2,1)**; não se trocam seletores nem se aumenta prioridade.
- A regra comum e as duas específicas são adjacentes no mesmo `@media screen`, sem regra concorrente entre elas. span e small são tipos distintos.
- Declarações por seletor continuam na mesma sequência: cor e font-size; small conserva line-height posterior. O script compara todos os rastros ordenados de propriedades/valores/important/contexto do arquivo após expandir listas de seletores.
- Estilos globais (`.summary-card span/small`) e suas media queries ficam intactos. O App CSS continua após o CSS de entrada. Tamanho efetivo inicial: **12 px**, line-height **18 px**, em todas as quatro larguras, inclusive apesar de valores legados menores nos estilos gerais.
- Nenhum literal é substituído por token: utiliza-se exatamente o token já existente, `--silex-size-caption`.
- Print permanece fora de `@media screen`; todas as 24 regras de impressão históricas devem continuar iguais.

## Validação e interrupção

Aplicar somente após matriz e ordem baseline completas. Comparar cada propriedade computada e medição correspondente, sem aprovar discrepância pela aparência do screenshot. Qualquer diferença inesperada exige diagnóstico e correção do piloto ou sua retirada; não ampliar a família.

Arquivos gerados `pilot-original-rules.json` e `pilot-static-proof.json` registram originais, contexto e prova. Comparações finais, testes e revisão ficam no relatório; não presumir aprovação antes desses resultados.
