# Campos de data restantes — P05

Inventário revisado no código aprovado `0ea8ed077afba7c00779f81be765d1bacfbd3ae1`, complementando [DATAS SB-06D.1](../SB-06D.1/DATAS.md) e [INPUTS-NATIVOS SB-06D.1](../SB-06D.1/INPUTS-NATIVOS.md). Nenhum campo desta matriz foi alterado no SB-07B.

## Controles de entrada

O código de produção contém 20 declarações `type=date` e duas `type=month`. O componente `Dates` declara dois campos e é usado em Vendas e Estoque; em execução isso representa quatro filtros, elevando a 22 os controles `date` distribuídos entre as telas. As duas declarações `month` mantêm granularidade mês/ano. Testes e fixtures estão excluídos da contagem.

| Área / campo | Estado da conferência pt-BR no frontend | Classe de risco | Prioridade / estimativa de impacto | Observação |
|---|---|---|---|---|
| Serviços — Data do serviço, Vencimento, Competência | Legenda `dd/mm/aaaa` adicionada no SB-07A; testes automatizados, ainda sem validação humana | Cadastro/financeiro | Média; risco de leitura reduzido, eficácia humana não medida | Roteiro deste incremento valida clareza e seletor |
| Conta financeira — Referência do saldo inicial (`financeCatalog.tsx`) | `date` nativo sem legenda | Ambiguidade com potencial impacto financeiro | Alta; data ancora saldo inicial | Primeiro candidato após Serviços; preservar limite `max` e payload |
| Frente de Caixa e detalhe/finalização de venda a prazo (`sales.tsx`, dois campos) | `date` nativo sem legenda | Ambiguidade com potencial impacto financeiro | Alta; define vencimento do recebível | Validar como campos distintos; preservar `min` e serialização ISO |
| Lançamentos — De/Até; Data de lançamento/competência (`ledger.tsx`, quatro campos) | `LedgerDateField`, legenda `dd/mm/aaaa` | Ambiguidade com potencial impacto financeiro | Média; apresentação auxiliada, compreensão ainda não medida | Incluir no próximo estudo humano se expandir escopo |
| Contas a Pagar/Receber — De/Até e vencimento/competência (`finance.tsx`, quatro campos) | `LedgerDateField`, legenda | Ambiguidade com potencial impacto financeiro | Média; filtros/títulos financeiros, interpretação humana não medida | Reutilizar roteiro para comparar |
| Dashboard Financeiro — De/Até (`financePlanning.tsx`, dois campos) | `LedgerDateField`, legenda | Ambiguidade com potencial impacto financeiro | Média; afeta janela de consulta, sem persistir data | Comparar compreensão de filtro e valor |
| Relatórios Financeiros — De/Até (`financePlanning.tsx`, dois campos) | `date` nativo sem legenda | Apresentação/filtro financeiro | Média; intervalo errado pode omitir/incluir registros | Candidato subsequente; separar de formato textual do relatório |
| Vendas e Estoque — filtros De/Até (`ui.tsx` `Dates`, instâncias em `sales.tsx` e `operations.tsx`) | Dois `date` nativos sem legenda por instância | Ambiguidade em operação/filtro | Baixa a média; altera conjunto exibido, não a data persistida | Quatro usos em execução; qualquer futura correção compartilhada afeta ambas as telas |
| Orçamento mensal — filtro `month` e mês somente leitura (`financePlanning.tsx`) | Dois controles de mês; suporte/desenho varia por navegador | Controle nativo sem ambiguidade dia/mês demonstrada | Baixa para P05; apresenta granularidade mês/ano | Não converter para data nem inventar dia |

## Apresentação textual, exportação e impressão

| Área | Comportamento confirmado | Classe | Prioridade |
|---|---|---|---|
| Listagens/detalhes frontend | `dateOnly` apresenta datas civis em `dd/mm/aaaa`; timestamps usam formatador próprio | Apresentação textual secundária | Baixa; não misturar datas civis e instantes |
| Relatórios frontend | Colunas de data usam `dateOnly`; agrupamentos mensais aprovados exibem mês/ano | Apresentação textual secundária | Baixa no painel; heurística legada de algumas strings permanece documentada |
| CSV e impressões financeiras gerados pelo backend | Parte dos contratos continua serializando datas ISO | Relatórios e impressão | Média para interpretação humana ao abrir/ imprimir; fora da correção visual SB-07A | Revisar saída e contrato em etapa própria; não mudar neste incremento |
| Dados de OFX/importações | Data do extrato apresentada textualmente; parser e contrato são backend | Operação/importação | Média se data de origem divergir da conferência do usuário | Sem novo teste de importação humana nesta etapa |

## Evidência de navegadores

No Firefox instalado, o SB-06E registrou divergência de desenho nativo para `2026-03-04` em locale pt-BR. O SB-07A confirmou que a legenda do serviço exibe `Data: 04/03/2026` e preserva o valor ISO em criação/edição. Esses são resultados técnicos, não evidência de que pessoas entenderam a indicação.

Nesta máquina há Firefox instalado; Chromium/Chrome não está instalado nem disponível no cache Playwright. Não foi instalado software no SB-07B. A renderização e o popup de calendário no Chrome permanecem por verificar em outro ambiente. Nenhum celular físico foi disponibilizado nesta preparação.

## Priorização sugerida, sem implementação

1. **Alta:** duas datas de vencimento de venda a prazo; referência do saldo inicial. Tratar em piloto após sessões humanas com Serviços e teste Chrome/Firefox, porque erro pode alterar vencimento ou referência financeira.
2. **Média:** filtros de período dos relatórios financeiros e revisão comparativa de campos com legenda em Lançamentos, Pagar/Receber e Dashboard. Mensurar interpretação de intervalos sem alterar critérios nem API.
3. **Baixa/média:** filtros compartilhados de Vendas/Estoque; avaliar se uma legenda no componente `Dates` resolve sem impacto de layout em ambas as telas.
4. **Separado:** CSV/impressão ISO e mês `type=month`; revisão de contratos/saídas requer escopo próprio e não se resolve como ambiguidade de campo `date`.

Estimativas são priorização qualitativa de escopo, não medição de incidência. Os demais controles sem falha de interpretação comprovada não são declarados seguros universalmente; apenas não há evidência comparável para classificá-los como divergência observada.
