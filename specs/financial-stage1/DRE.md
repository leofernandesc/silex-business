# DRE gerencial — especificação proposta, não implementada

Estado: especificação para decisão. Não é DRE fiscal, escrituração contábil ou homologação de critérios de reconhecimento. Não copiar fórmulas não verificadas da referência. O Dashboard continua apresentando os cálculos existentes.

## Fonte e limites atuais

A análise parte de `backend/app/models.py`, `services.py`, `reporting.py` e `financial.py`. Valores monetários são centavos inteiros; datas civis ISO não são timestamps.

| Dado existente | Uso possível | Limitação |
|---|---|---|
| FinanceEntry: principal, direção, competência, vencimento, status, categoria/subcategoria | Títulos e direitos/obrigações | Título não comprova sozinho receita auferida, custo consumido ou documento fiscal |
| Payment: principal, juros, multa, desconto, valor líquido, lançamento, competência, estorno | Caixa realizado e encargos discriminados | Competência é copiada do título; não há política de fechamento/reconhecimento contábil |
| Category.classification: operating/investment/financing; result_group livre | Agrupamento gerencial existente | Não identifica receita bruta, deduções, custo direto, depreciação ou imposto sobre lucro |
| Subcategory.affects_result | Exclusão explícita do resultado atual | Não substitui classificação DRE; ausência de subcategoria é permitida |
| Product e StockMovement | Quantidade e preço de venda | Não existe custo de aquisição/valorização de estoque suficiente para CMV defensável |
| Budget mensal por categoria/subcategoria | Meta versus despesas pagas por competência | Não é orçamento anual integrado à DRE |

`finance_dashboard.result_groups` soma **baixas realizadas pela competência da baixa**, com o sinal associado à direção do título. Estorno reduz o grupo original. Já entradas/saídas de caixa classificam cada Payment pelo sinal efetivo: estorno de despesa é entrada. São visões diferentes, não inconsistência a corrigir com novos cálculos nesta etapa. Pendências, saldos iniciais e empréstimos não são receita operacional automaticamente. Saldo registrado no ERP não equivale a saldo bancário externamente confirmado.

## Estrutura e fórmulas propostas

Convenção do demonstrativo: receitas e deduções/custos/despesas apresentados em colunas de magnitudes positivas, com sinal indicado na fórmula; ajustes/estornos mantêm sinal econômico. Cada fato deve entrar uma vez. Os exemplos assumem classificação completa e confirmada, sem itens desconhecidos.

| Linha | Fórmula em centavos |
|---|---|
| Receita bruta (RB) | Soma de receitas operacionais reconhecidas, antes de deduções |
| Deduções (DED) | Devoluções, abatimentos comerciais e tributos sobre vendas, conforme política aprovada |
| Receita líquida (RL) | RB − DED |
| Custos diretos (CD) | Custos dos bens/serviços reconhecidos; neste modelo, sem DA separada abaixo |
| Lucro bruto (LB) | RL − CD |
| Despesas operacionais (DO) | Administrativas/comerciais, sem resultado financeiro, tributos sobre lucro ou DA separada |
| Outras receitas/despesas operacionais (OR/OD) | Classificadas explicitamente; não usar como depósito de itens desconhecidos |
| Depreciação/amortização/exaustão (DA) | Valor reconhecido conhecido e segregado; nunca inferir zero porque falta cadastro |
| Resultado operacional (EBIT) | LB − DO + OR − OD − DA |
| EBITDA gerencial | EBIT + DA, somente com DA e demais componentes demonstráveis |
| Resultado financeiro (RF) | Receitas financeiras − despesas financeiras |
| Resultado antes dos tributos sobre lucro | EBIT + RF |
| Tributos sobre lucro (TL) | IR/CSLL ou equivalentes gerenciais reconhecidos conforme decisão; sem duplicar tributos sobre vendas |
| Lucro líquido gerencial (LL) | EBIT + RF − TL |

Reconciliação obrigatória quando todos os componentes forem conhecidos: `EBITDA = LL + TL − RF + DA`. Se a DA já estiver embutida em CD/DO em uma fonte futura, não subtraí-la novamente; a classificação deverá separá-la ou documentar sua alocação. Investimentos, principal de empréstimos, aportes, distribuição de resultado, transferências e saldos iniciais ficam fora da DRE, embora possam afetar caixa.

Margens propostas: bruta `100 × LB/RL`; operacional `100 × EBIT/RL`; EBITDA `100 × EBITDA/RL`; líquida `100 × LL/RL`. Divisão apenas para apresentação, sem reintroduzir arredondamento em valores monetários. Proposta: se RL ≤ 0, apresentar “não aplicável” com motivo, mantendo os valores absolutos. Essa política, inclusive a interpretação de receita líquida negativa, exige aprovação antes de implementação. Em RL positiva, prejuízo produz margem negativa normalmente. Percentuais com duas casas e arredondamento decimal definido; não usar floats para somar dinheiro.

## Mapeamento proposto

Criar futuramente um mapeamento **opcional, versionado e auditável** de categoria/subcategoria para uma única linha DRE; precedência da subcategoria explícita sobre categoria. Não alterar classificação histórica silenciosamente. `affects_result=false` deve ser respeitado; conflito com mapeamento exige correção administrativa explícita. Categorias sem mapeamento produzem “não classificado”, com valor e IDs conciliáveis; não excluir nem assumir zero. Combinação incompatível com a direção econômica deve ser apontada.

A cobertura precisa ser informada por período/linha. Totais derivados que dependem de classificação ou DA/TL desconhecida ficam indisponíveis, não falsamente completos. Um zero só é confirmado por dados completos ou declaração explícita válida de inexistência do componente. Nenhuma categoria global receberá classificação específica de transportadora; custos especializados continuam sujeitos às capacidades do PR #11, sem ocultar o histórico financeiro geral autorizado.

## Critérios temporais e ajustes a decidir

| Tema | Proposta verificável | Decisão/limitação antes da implementação |
|---|---|---|
| Competência | DRE principal por fato econômico reconhecido; mostrar regime e período aplicados | Aprovar origem de reconhecimento: FinanceEntry sozinho não resolve reconhecimento, estoque ou impostos |
| Liquidação | Visão separada “realizado por baixa”; Payment.posting_date identifica caixa | Não chamar uma soma de pagamentos de DRE integral por competência |
| Parcial | Caixa: somente principal efetivamente baixado + encargos líquidos; pendente pelo principal restante | Competência: reconhecer fato integral ou parcelas conforme política aprovada, sem duplicar título e pagamento |
| Juros e multa | Segregar componentes de Payment; propor RF | Aprovar tratamento de multas operacionais versus financeiras |
| Desconto | Identificar comercial versus financeiro | Campo atual não distingue natureza; não inferir dedução da receita nem custo financeiro automaticamente |
| Estorno | Ajuste com ID original, sinal e período identificáveis; preservar trilha | Aprovar período do ajuste versus reabertura; não editar período encerrado silenciosamente |
| Cancelamento | Título cancelado sem caixa não altera caixa; caixa já ocorrido requer eventos existentes | Cancelar título não prova anulação de fato econômico; verificar antes de retirar receita/custo da DRE |
| Pagamento de investimento/financiamento | Caixa permanece; excluir principal da DRE | Segregar encargos elegíveis de principal; não tratar classificação livre como plano contábil completo |
| Impostos e estoque | Só valores explicitamente conhecidos e atribuíveis ao período | Sem emissão fiscal, apuração tributária e custo de estoque homologados, resultado é gerencial e limitado |

## Exemplos fictícios e resultados esperados

O arquivo [dre-examples.json](dre-examples.json) é uma especificação executável de aritmética, não um motor DRE de produção. `test_dre_specification.py` verifica centavos, sinais, reconciliação EBITDA e margens usando Decimal.

| Caso | RB | DED | RL | CD | DO | DA | EBIT | EBITDA | RF | TL | LL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Completo (centavos) | 1.000.000 | 50.000 | 950.000 | 380.000 | 190.000 | 20.000 | 360.000 | 380.000 | −10.000 | 90.000 | 260.000 |
| Centavos (centavos) | 100.001 | 3.333 | 96.668 | 40.001 | 20.002 | 1.001 | 35.664 | 36.665 | −433 | 7.891 | 27.340 |

Caso completo: margem bruta 60,00%; operacional 37,89%; EBITDA 40,00%; líquida 27,37%. Caso centavos: 58,62%; 36,89%; 37,93%; 28,28%. Valores de OR/OD conhecidos como zero nesses exemplos. Casos adicionais cobrem prejuízo, receita zero/negativa e componente desconhecido.

Exemplo de parcial real dos testes: título 10.001; principal baixado 3.001; juros 101; multa 17; desconto 37. Caixa líquido `3.001+101+17−37=3.082`; pendente `10.001−3.001=7.000`. Não reconhecer os 10.001 novamente a cada parcela. Após estorno, pendente 10.001 e caixa líquido acumulado zero, com os dois eventos preservados. O teste backend reconcilia esses números sem alterar o algoritmo existente.

## Decisões necessárias e critérios de passagem

Antes do motor DRE: aprovar regime de reconhecimento, plano/mapeamento, política de desconto/multa/estorno, custos diretos/estoque, DA e tributos; definir fechamento e versionamento. Validar com responsável financeiro/contábil apropriado. Depois: adicionar read model separado, sem alterar os 26 relatórios, com rastreio até IDs originais, indicadores de cobertura, testes de parcelas/ajustes e comparação centavo a centavo. Nenhuma fórmula dependente dessas decisões foi instalada na aplicação nesta etapa.

Referências conceituais oficiais: [Resolução CVM 156](https://conteudo.cvm.gov.br/legislacao/resolucoes/resol156.html) para reconciliação de LAJIDA/LAJIR e [CPC 26, documento oficial CVM](https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_26_R1_rev_13.pdf) para apresentação. A Resolução trata de divulgação por companhias abertas; não se presume aplicabilidade direta a este ERP ou cumprimento normativo. A especificação não substitui análise profissional nem verificação da norma aplicável à entidade.
