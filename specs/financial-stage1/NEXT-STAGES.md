# Arquitetura das próximas etapas — recomendações, sem implementação

A aplicação continua um ERP multissetorial de uma instância/empresa configurada. Nenhuma tabela, migração ou interface dos quatro módulos abaixo foi criada nesta etapa. Não introduzir multitenancy por antecipação. Não usar o tipo de fornecedor ou nome da empresa como classificador setorial global.

| Prioridade / etapa | Reutilização | Mudança futura prevista | Dependências e aceite |
|---|---|---|---|
| 1. Classificação DRE e política de reconhecimento | Categorias, subcategorias, `affects_result`, títulos, pagamentos | Mapeamento gerencial versionado, opcional, com vigência e auditoria; depois read model DRE separado | Aprovar [DRE.md](DRE.md), cobertura de dados, DA/tributos e natureza de descontos. Reconciliação por IDs; desconhecido não vira zero |
| 2. Centros de custos opcionais | Cadastros genéricos e vínculos financeiros existentes | Tabela de centros ativa/inativa; FK anulável em origem econômica; rateios somente se aprovados | Começar com um centro por título, sem obrigar históricos. Definir propagação título/parcelas/baixas e histórico de alterações. Se houver rateio futuro, soma em centavos deve fechar exatamente no total, com regra explícita de resíduo |
| 3. Orçamento anual versus realizado | `BudgetTarget`: metas mensais por categoria/subcategoria e realizado atual por pagamentos na competência | Primeiro read model de 12 meses; não criar outro motor de realizado. Persistência de versão/cenário só se necessária e autorizada | Definir regime, granularidade e duplicação categoria/subcategoria antes de somar. Não misturar soma de meta da categoria com metas das suas subcategorias. Faltante não significa meta zero. Centros opcionais exigem chave única/precedência revista |
| 4. Fluxo de caixa projetado | Caixa realizado (Payment), principal pendente dos títulos, saldos registrados | Endpoint de leitura com cenários e data de referência explícita; sem alterar vencimentos | Uma linha por pendência real; parcial considera apenas saldo principal. Não somar previsão original a baixa já realizada. Títulos cancelados excluídos; estornos recuperam saldo segundo regra existente. Encargos futuros não conhecidos não estimados como certeza |
| 5. Painel executivo e PDF | Dashboard, métricas futuras aprovadas, impressão corrigida em IMP01 | Read model/snapshot identificável e template específico com texto selecionável | Definir dados, filtros, páginas e regime. Esperar prontidão real, não `networkidle` apenas. Preservar tabela/colunas/valores e impressão dos 26 relatórios; não alterar CSV para gerar PDF |

## Contratos e persistência propostos

- Preservar `/finance/dashboard`, `/finance`, `/finance/movements` e os 26 relatórios. Novas visões devem ser aditivas e identificar `basis`, período, instante/data de referência e cobertura de dados. Um read model pode reutilizar serviços existentes; não duplicar regras de baixa, principal pago ou estorno no frontend.
- Qualquer migração futura deve ser aditiva, com chaves estrangeiras anuláveis para históricos, índices e restrições revisados para SQLite. Números de revisão serão escolhidos a partir da main realmente aprovada; não reservar nem executar revisão depois da 0013 agora.
- Centros de custo não são usuários, permissões ou empresas. Capacidade `transport_operations` do PR #11 permanece separada dos dados financeiros genéricos e de qualquer centro.
- Dados de investimento/financiamento e saldos iniciais exigem reconciliação de caixa; sua existência não autoriza incluí-los em receita/EBITDA. APIs continuam autoridade de autorização.
- Importação de orçamento, execução de despesas, cobranças, relatórios fiscais e integração bancária não fazem parte dessas recomendações de leitura.

## Sequência mínima e controle de custo

1. Revisar esta etapa e os critérios DRE com o responsável financeiro.
2. Integrar trabalhos independentes somente com autorização, resolvendo os hunks mapeados em [INTEGRATION.md](INTEGRATION.md).
3. Aprovar uma única etapa futura, seu mapeamento e os exemplos de aceite antes de alterar o schema.
4. Testar dinheiro com inteiros, rateio/competência com fixtures e regressões dos contratos afetados; E2E dirigido desktop/mobile. Evitar repetir matrizes históricas sem alteração relevante.
5. Para publicação, cumprir [PUBLICATION.md](PUBLICATION.md), incluindo backup/restauração e validação dos históricos. Não há autorização de merge ou deploy neste trabalho.
