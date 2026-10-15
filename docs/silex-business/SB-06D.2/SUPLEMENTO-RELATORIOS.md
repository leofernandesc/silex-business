# Suplemento da evidência de relatórios — SB-06D.1

## Diagnóstico

Confirmado visualmente: `docs/evidence/sb06d1/screenshots/candidate-result-monthly-1440.png` mostra seletor **Resultado por competência**, cabeçalho ainda **Fluxo de caixa mensal** e **Carregando registros…**. O coletor antigo selecionava a opção e aguardava apenas networkidle; isso não comprova atualização do estado React, resposta do relatório ou tabela atualizada.

O comportamento de carregamento é legítimo. A captura é prematura. Não foi identificado defeito funcional que justificasse mudar produto, filtros, autenticação ou backend. O arquivo histórico e o ZIP SB-06D.1 permanecem intactos e seus hashes foram preservados.

## Reprodução e novo critério

Com a mesma fixture fictícia, a sequência antiga foi observada no instrumento: após selectOption e networkidle, a tabela ainda carregava em **9/9 sondas naturais** (três versões × três larguras). O novo teste E2E também mantém uma requisição suspensa somente no ambiente de teste para comprovar que networkidle pode coexistir com carregamento. Não altera resposta, dados ou código de produção e não usa timer/retry.

O novo coletor registra:

1. Resposta HTTP 200 do endpoint e slug exatos, com query e hash JSON.
2. Seletor no relatório esperado.
3. Cabeçalho igual ao nome da resposta.
4. Ausência de indicador Carregando.
5. Quantidade de linhas correspondente e todas as células iguais à apresentação esperada dos dados retornados.
6. Fontes/layout concluídos antes da captura.

## Comparações separadas

| Versão | Finalidade |
| --- | --- |
| historical-aa — aa4964d | Antes histórico do SB-06D.1 |
| baseline — 48d6e36 | Depois histórico do SB-06D.1 / antes do piloto CSS |
| candidate — SB-06D.2 | Depois do piloto CSS |

18 capturas suplementares: caixa mensal e resultado por competência, nas três larguras, nas três versões. Todos os grupos de respostas correspondem em hash e consulta, por slug/largura; não igualar os totais de caixa e competência entre si, pois são relatórios distintos.

Entre aa4964d e 48d6e36, o mês textual mudou conforme o incremento de datas aprovado. Entre baseline 48d6e36 e candidata CSS, os dados e a apresentação devem permanecer iguais. A galeria identifica cada contexto; as novas imagens não substituem silenciosamente o acervo antigo.

`report-supplement.json` contém as observações iniciais e as confirmações de prontidão. O suplemento corrige o instrumento/documentação; não modifica a funcionalidade de relatórios. P05 continua parcial.
