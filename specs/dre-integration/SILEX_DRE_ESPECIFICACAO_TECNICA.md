# Silex Business — Especificação técnica: DRE gerencial e consolidação de fluxos

**Documento:** ST-DRE-UX-001 · **Versão:** 1.0 (especificação aprovada quanto à direção; implementação não iniciada)  
**Data de referência:** 08/11/2026 · **Repositório:** `leofernandesc/silex-business`  
**Baseline auditada:** PR [#14](https://github.com/leofernandesc/silex-business/pull/14), HEAD `00fcaa5f869d702dda6ad535d264a0216dd11b65`, base `integration/erp-full-regression`.  
**Estado operacional:** PR em Draft na verificação; nenhum merge, deploy, migração ou acesso aos dados reais autorizado.

## 1. Objetivos e decisões aprovadas

Entregar uma **DRE gerencial por competência econômica** aproveitando operações já cadastradas, sem um segundo livro financeiro. Junto dela, corrigir recebíveis parciais, consolidar a navegação e eliminar passos repetidos. Cinco decisões do proprietário:

1. Reconhecer o fato econômico, aproveitando **vendas finalizadas, serviços realizados e títulos cuja natureza/competência seja confirmada**; pagamento não é critério universal de reconhecimento.
2. Incorporar mapeamento da DRE **nas categorias e subcategorias existentes**, com precedência da subcategoria quando explicitamente configurada; não criar plano paralelo.
3. Quando faltar custo, classificação, tributo ou outra informação material, exibir **DRE parcial com avisos e totais afetados indisponíveis**, nunca zero fictício.
4. **Preservar o histórico** e permitir reclassificação retroativa **apenas supervisionada, rastreável e reversível**.
5. Oferecer **geração contextual e confirmada** de títulos a partir de ordens de serviço, sem criação automática silenciosa nem repetição dos valores já informados.

Também aprovadas: unificar **Início + Visão geral**, manter **Financeiro → Visão financeira**, unificar visualmente categorias/subcategorias em **Plano financeiro**, inserir a DRE em **Relatórios Financeiros**, reaproveitar orçamento, filtros, CSV e impressão, e **unificar a regra de recebíveis**.

## 2. Limites de escopo

**Incluído:** DRE gerencial com reconciliação e cobertura, mapeamento versionado, revisão de eventos não classificáveis, vínculos a operações existentes, UI/UX, APIs, migrações aditivas e testes. Preservar os 26 relatórios atuais e contratos já usados.

**Excluído:** DRE legal/fiscal; escrituração contábil oficial; ECD/ECF; emissão de notas; cálculo tributário automático; estoque valorizado/CMV presumido; integração Mercado Pago, assinaturas, bloqueio de licença, multitenancy, PostgreSQL, infraestrutura Railway e alteração do banco da instância existente. O futuro módulo de custos de estoque **não pode ser falsamente substituído por preço de venda ou saldo de estoque**.

## 3. Inventário verificado do sistema

| Entidade/fluxo | Situação comprovada no HEAD | Consequência para DRE |
|---|---|---|
| `Sale`, `SaleItem`, `Product`, `StockMovement` | Venda finalizada gera `FinanceEntry` vinculada por `sale_id`; à vista gera `Payment`; `Sale.finalized_at` existe; produto tem preço e quantidade, não custo contábil suficiente | Uma única receita econômica por venda; não contar venda + título + pagamento; CMV desconhecido |
| `ServiceOrder`, `ServiceOrderCost`, `ServiceOrderTitleRun` | Valor contratado, custos previstos, data de serviço e status; botão separado **Gerar títulos** produz contas a receber/pagar, ligadas por `service_order_id` e `service_order_cost_id`; `completed_at` não existe | Conclusão precisa registrar uma data/evidência; não tomar mero orçamento como receita/custo realizado |
| `FinanceEntry` | Valor principal, direção, categoria/subcategoria, origem, competência, vencimento, recorrência, status, ligações com venda e serviço | Fonte canônica do principal quando o fato econômico estiver reconhecido; status do título **não** é confirmação contábil |
| `Payment` | Principal, juros, multa, desconto, lançamento, competência, reversão e quitação parcial | Fonte de caixa e eventuais encargos, não segundo principal da DRE |
| `Category`/`Subcategory` | `classification=operating/investment/financing`, `result_group` livre, `affects_result` booleano | Não define receita bruta/deduções/custo direto/DA/IR e CSLL; exige mapeamento novo |
| `BankStatementImport/Item` | OFX associa transação a título existente **ou** cria lançamento se não há título; `payment_id` já existe | DRE lê o fato vinculado uma única vez; não reconhece extrato importado como nova receita |
| `MonthlyBudget` | Meta por categoria/subcategoria; realizado por pagamentos | Orçamento não é fato econômico; comparação somente com bases compatíveis |
| `CompanySetting` | Uma empresa por instância | Não introduzir `tenant_id` nem misturar faturamento do Silex com financeiro do cliente |
| Autorização | DRE/financeiro apenas administrador; transporte possui capacidade específica por usuário | DRE, detalhe e CSV devem respeitar controle de acesso, inclusive a dados especializados |

**Código de referência:** [`models.py`](https://github.com/leofernandesc/silex-business/blob/00fcaa5f869d702dda6ad535d264a0216dd11b65/backend/app/models.py), [`services.py`](https://github.com/leofernandesc/silex-business/blob/00fcaa5f869d702dda6ad535d264a0216dd11b65/backend/app/services.py), [`service_orders.py`](https://github.com/leofernandesc/silex-business/blob/00fcaa5f869d702dda6ad535d264a0216dd11b65/backend/app/service_orders.py), [`reporting.py`](https://github.com/leofernandesc/silex-business/blob/00fcaa5f869d702dda6ad535d264a0216dd11b65/backend/app/reporting.py). Especificação anterior: [`specs/financial-stage1/DRE.md`](https://github.com/leofernandesc/silex-business/blob/00fcaa5f869d702dda6ad535d264a0216dd11b65/specs/financial-stage1/DRE.md).

## 4. Regra estrutural: uma operação, um fato econômico

Cada componente econômico reconhecido precisa de **identidade canônica estável**, separada da multiplicidade de documentos e pagamentos:

- `sale:<sale_id>:principal` → título `FinanceEntry.sale_id`, se existente; valor líquido da venda finalizada. `SaleItem` permite verificar bruto/desconto, não gerar segunda receita.
- `service_order:<id>:revenue` → `FinanceEntry.service_order_id` de receita, quando a prestação for confirmada; o título não é um evento adicional.
- `service_order_cost:<cost_id>:principal` → `FinanceEntry.service_order_cost_id`, quando incorrido e confirmado; o custo contratado sozinho é **previsão**.
- `finance_entry:<id>:principal` → títulos manuais/OFX/recorrentes **não** já cobertos por venda/OS. Admissível depois de confirmação do reconhecimento aplicável.
- `payment:<id>:interest|fine|discount` → somente componentes distintos do principal e após decisão de natureza econômica; reversões vinculadas por `reversal_of` geram ajuste com traço auditável.

Criar uma **camada de leitura (`dre_facts` conceituais)** em Python/SQLAlchemy, não uma segunda tabela de receitas e despesas editável manualmente. Persistir apenas **mapeamentos, decisões excepcionais, evidências de reconhecimento e revisões**, sem replicar `FinanceEntry` ou `Payment` como lançamento paralelo.

**Invariantes obrigatórias:**

1. O mesmo `source_type/source_id/component` não pode contribuir duas vezes para o resultado do mesmo estado contábil; reforçar com chave canônica e testes.
2. Baixa parcial altera caixa e saldo a receber/pagar, **não** cria segunda receita/custo econômico de principal.
3. Fato de venda a prazo pode ser reconhecido antes do recebimento; recebimento posterior não altera o principal reconhecido.
4. Cancelamento de título, estorno de pagamento e cancelamento econômico do serviço **não são sinônimos**; ajustes seguem política explícita e preservam evento/ID original.
5. Não transformar depósitos, transferências, aportes, empréstimos (principal), saldo inicial ou compras de imobilizado em receitas/despesas de DRE.
6. `Payment.amount_cents = principal + juros + multa − desconto`, com sinais do módulo atual, deve reconciliar ao caixa, mas **jamais** ser somado de novo ao principal reconhecido.

## 5. Política de reconhecimento — primeira versão

### 5.1 Vendas

- **Evento:** `Sale.status=finalized`, data civil de `Sale.finalized_at` em `America/Manaus`, desde que não haja informação de que a obrigação de desempenho ainda esteja pendente. Se o item representar serviço com entrega futura, marcar pendência para validação, sem presumir reconhecimento.
- **Valor:** `Sale.total_cents`, vinculado ao principal do título originado da venda. Para exibir receita bruta e desconto comercial, conferir a igualdade entre soma de `SaleItem.total_cents`, `Sale.discount_cents` e total final. **Descontos do pagamento** não podem ser confundidos com descontos comerciais da venda.
- **À vista ou crédito:** idêntico reconhecimento do principal. `Payment` serve ao caixa.
- **Cancelamento/estorno:** registrar ajuste/revisão com data econômica sustentada; nunca apagar o reconhecimento anterior ou retroagir silenciosamente um mês fechado/revisado.

### 5.2 Ordens de serviço

- **Evento:** transição validada para `completed` significa serviço realizado, com `completed_on` (data civil) preenchido no **mesmo fluxo**; adicionar campo de auditoria `completed_at` ou equivalente consistente com migração, capturando quem confirmou. A data planejada `service_date` não substitui confirmação da execução.
- **Receita:** somente se houver título associado e serviço efetivamente concluído; usar o valor contratado reconhecível, sem contar novamente os pagamentos. Se a prestação for por etapas, adiantamento ou tiver reconhecimento parcial, marcar como **pendente de política/validação**, sem automatismo fictício.
- **Custos:** `ServiceOrderCost.agreed_amount_cents` é previsão de contratação, não evidência isolada de incorrência. Na conclusão, oferecer confirmação contextual de quais custos efetivamente incorreram, reutilizando fornecedores, valores e descrições; se não forem comprovados, manter pendentes. Se o custo ocorrer em data distinta, admitir decisão por item, na própria operação ou na pendência financeira — nunca repetir o cadastro.
- **Títulos:** continuar usando o endpoint atual de geração **uma única vez** e a proteção `ServiceOrderTitleRun`; exibir um convite contextual de geração ao registrar conclusão ou quando uma OS concluída estiver sem títulos. Se o usuário recusar, **OS continua concluída**, mas DRE marca a lacuna e fornece retorno para a operação. Modal único confirma conta, vencimento e competência sem preencher novamente receita/custos.
- **Permissões:** nunca expor fretes subcontratados ou seus custos em DRE/drill-down/exportação de usuário sem capacidade `transport_operations`, mesmo se estiver autenticado como administrador genérico. Definir agregação segura versus ocultação conservadora; não apresentar somatório incompleto como completo.

### 5.3 Títulos manuais, recorrências e OFX

- `FinanceEntry.status=open|partial|paid` trata da **liquidação**, não prova fato econômico reconhecido. Para entradas sem vínculo confiável com venda/OS, adicionar confirmação de **natureza/competência reconhecida** no fluxo do próprio título/movimento, ou pendência administrativa que o leva de volta ao registro existente. Não criar tela para lançar na DRE.
- Se um fato estiver documentado e a confirmação for válida, reconhecer o **principal uma vez** na data econômica aprovada, mesmo sem baixa.
- Recorrências futuras criadas em lote são compromissos/títulos: **não reconhecer automaticamente todas** no dia da criação. Reconhecer por período e evidência/evento aplicável.
- OFX conciliado com título usa **o mesmo título**; OFX que criou título pode necessitar confirmação de classificação/competência quando a descrição bancária for insuficiente. Não inferir competência econômica da data do extrato em todos os casos.

### 5.4 Encargos, impostos, investimentos e estoques

- Juros, multas e descontos financeiros: tratamento econômico próprio, sem incorporar automaticamente ao valor bruto de vendas. Sem distinção de desconto comercial/financeiro e de multas operacionais/financeiras, **classificação pendente**.
- Impostos sobre vendas e lucro: somente valores registrados/classificados e atribuíveis à competência; **não calcular impostos por alíquota presumida**.
- Depreciação/amortização: sem inventário de ativos e reconhecimento conhecido, registrar **componente desconhecido**; não mostrar EBITDA/EBIT/lucro líquido definitivo.
- Produtos/estoque: quantidade e preço disponíveis, mas **não** há custo valorizado suficiente para CMV. Para empresas comerciais, o CMV fica pendente até a implementação de custeio ou evidenciação por outra origem confiável. Não usar faturamento como margem bruta.
- Uma declaração supervisionada de **inexistência comprovada** de determinado componente, com vigência e responsável, pode caracterizar zero verdadeiro; ausência de cadastro não significa zero.

## 6. Fórmulas e estados de cobertura

Usar **centavos inteiros** em toda soma; `Decimal` apenas na apresentação de percentuais, com arredondamento definido. Receitas, deduções, custos e despesas têm magnitudes positivas na tabela, ajustes com sinal econômico explícito.

| Código | Linha | Cálculo |
|---|---|---|
| `RB` | Receita bruta | Soma receitas operacionais reconhecidas antes de deduções aprovadas |
| `DED` | Deduções | Devoluções, abatimentos comerciais, tributos sobre vendas identificados |
| `RL` | Receita líquida | `RB − DED` |
| `CD` | Custos diretos/CMV/CSP | Custos reconhecidos com evidência, inclusive serviços prestados; CMV só com custo confiável |
| `LB` | Lucro bruto | `RL − CD` |
| `DO` | Despesas operacionais | Despesas reconhecidas, não financeiras, nem DA separada |
| `OR`, `OD` | Outras operações | Receitas e despesas operacionais específicas, sem depósito de desconhecidos |
| `DA` | Depreciação/amortização | Valor conhecido e não duplicado em CD/DO |
| `EBIT` | Resultado operacional | `LB − DO + OR − OD − DA` |
| `EBITDA` | Indicador gerencial | `EBIT + DA`, **somente com componentes conhecidos** |
| `RF` | Resultado financeiro | Receita financeira − despesa financeira |
| `TL` | Tributos sobre lucro | Valores reconhecidos, sem duplicar tributos sobre receita |
| `LL` | Lucro/prejuízo gerencial | `EBIT + RF − TL` |

**Estados por linha:** `complete` (classificação e fonte comprovadas, inclusive zero confirmado), `partial` (subtotal conhecido, mas faltam fontes/itens), `unavailable` (não há base suficiente), `not_applicable` (motivo explícito e válido). Dependências transmitem incompletude: um `CD` incompleto bloqueia **LB, EBIT, EBITDA e LL como totais finais**. Pode-se mostrar **valor parcial claramente identificado**, nunca rotulá-lo de lucro final. Margens só quando denominador e numerador forem completos, e receita líquida positiva; demais casos “não aplicável” com motivo.

**Reconciliar:** `EBITDA = LL + TL − RF + DA` quando todos componentes forem completos. O resultado realizado por baixas que já existe no dashboard **não** é a DRE; manter contratos e legenda próprios.

## 7. Mapeamento e persistência: desenho proposto (não migração já criada)

Desenvolver revisões Alembic **aditivas após a revisão 0013**, ajustando a numeração ao HEAD real da branch antes de codificar. Modelos e nomes abaixo são proposta; exigir revisão de migrations/constraints SQLAlchemy+SQLite.

### 7.1 `dre_category_mapping_history`

Campos recomendados: `id`, `category_id`, `subcategory_id` nullable (regra de categoria quando nulo), `dre_line_code` ou `outside_dre`, `valid_from`, `valid_to` nullable, `revision`, `reason`, `actor_user_id`, `recorded_at`, `supersedes_id`. Regras:

- Na leitura de um fato, **subcategoria explícita** prevalece sobre categoria. Sem mapeamento, item aparece como **não classificado**.
- `affects_result=false`: política consistente e explícita; fora da DRE apenas com justificativa verificável. Sinalizar conflitos entre `affects_result` e mapeamento como **pendências**, não excluir silenciosamente.
- Proibir períodos de vigência sobrepostos para mesmo alvo; SQLite exige validação transacional além de índices. `UNIQUE` simples em colunas nullable não basta para unicidade do mapeamento de categoria.
- Nunca alterar uma linha histórica in place: encerrar vigência, criar revisão, auditar usuário/motivo e listar períodos impactados. Alteração retroativa exige prévia de diferenças e confirmação administrativa.
- Não fixar `category.name == 'Vendas'` como classificação DRE universal: dados antigos possuem categorias genéricas. A classificação DRE deve ser explícita.

### 7.2 `dre_recognition_decisions`

Campos recomendados: `id`, `source_type`, `source_id`, `component`, `decision` (`recognize|pending|not_applicable|adjust`), `economic_date` nullable, `evidence_kind`, `reason`, `actor_user_id`, `recorded_at`, `revision/supersedes_id`. Opcional: `source_revision_fingerprint` para detectar mudança da fonte. Sem valores monetários duplicados por padrão; qualquer **ajuste econômico explícito** deve referenciar fato original, ter sinal/valor, prova e trilha própria.

### 7.3 `dre_period_reviews` / `dre_component_assertions`

Para uma DRE revisada, registrar período, versão de política/mapeamento, responsável, data e checksum/conjunto de entradas ou snapshot derivado; impedir reinterpretação silenciosa de período revisado. **Não** criar fechamento contábil irreversível na primeira versão. Declarações de componente comprovadamente zero devem identificar rubrica, vigência, prova/motivo e responsável; nunca criar valor zero por ausência de informação.

### 7.4 Extensões estritamente necessárias

Adicionar data de conclusão validada à OS e eventual confirmação no fluxo do título; não introduzir entidade `dre_entries` editável para duplicar receita/despesa. `Sale`, `FinanceEntry`, `Payment`, `ServiceOrder` e `Category` existentes continuam os registros operacionais. Preservar IDs, FKs e dados.

## 8. API: contratos propostos

Endpoints `admin` e retornos com tipos consistentes; detalhes sensíveis também sujeitos à capacidade específica de transporte.

| Método | Rota proposta | Responsabilidade |
|---|---|---|
| GET | `/api/finance/dre?start=YYYY-MM-DD&end=YYYY-MM-DD` | Resumo estruturado, linhas, totais, status/cobertura, versão e `as_of` |
| GET | `/api/finance/dre/items?line=RB&start=...&end=...&page=...` | Drill-down paginado com `source_type/id`, valor, data, classificação, justificativa e origem; sem vazamento de capability |
| GET | `/api/finance/dre/issues?start=...&end=...` | Pendências agrupadas por origem/causa, links seguros para cadastro original |
| GET | `/api/finance/dre.csv?start=...&end=...` | Exportação de **todo o período**, não somente página visível, com metadados de cobertura |
| GET | `/api/finance/dre/mappings` | Regras de categorias/subcategorias e vigência |
| POST | `/api/finance/dre/mappings` | Nova revisão de mapeamento, motivo, `expected_revision`, prévia de impacto retroativo |
| POST | `/api/finance/dre/recognition-review` | Confirmação ou correção vinculada ao fato de origem, com auditoria e idempotência |
| GET | `/api/finance/dre/reconciliation?...` | Comprovação principal reconhecido vs títulos/baixas, ajustes e não classificados |

- Datas civis ISO válidas, `start <= end`, limite de intervalo/paginação, sem injeção em filtros, sem N+1 em relatórios significativos.
- Esquema de resposta **não** pode fornecer `LL/EBITDA` numérico como final se `status != complete`; se houver subtotal, campo distinto `known_amount_cents` e aviso material.
- Aplicar `Cache-Control: no-store` a dados financeiros quando apropriado; rejeitar exportação não autorizada; CSV seguro contra formula injection e caracterização correta de totais.
- Modelos Pydantic com validações de referência, competência e natureza; qualquer alteração de política exige `reason` e auditoria.
- **Não** alterar o significado ou assinatura de `/api/dashboard`, `/api/finance/dashboard`, `/api/finance/reports/{slug}`, salvo extensão aditiva deliberada e teste de compatibilidade.

## 9. UX e navegação — estado final desejado

### 9.1 Início (unificação)

- Um único item de menu **Início**, reunindo identidade empresarial, atalhos e indicadores operacionais atuais. Não manter Início e Visão geral como duas telas concorrentes.
- Usar indicadores de vendas/PDV/estoque quando relevantes, e serviços/pedidos quando presentes/permitidos. Não assumir que todo cliente vende em PDV nem que todos têm transporte. Adaptar apresentação com base em permissões e dados, não usar `tenant_id`.
- Operador: somente vendas próprias/caixa próprio conforme backend atual; não exibir DRE, títulos financeiros globais nem dados de outros operadores. Admin: visão global autorizada. Fallback para carga/erro sem apresentar zero falso.
- Preservar endereços antigos `#dashboard` com **alias/redirect interno compatível**, evitando quebra de links e perda de foco/estado; `#home` será canônico. Revalidar back/forward, refresh, teclado e mobile.

### 9.2 Financeiro → Visão financeira

- Manter análise de caixa, saldo, contas em aberto, vencimentos, série histórica e resultados por baixas. Renomear de `Dashboard` para **Visão financeira**, mantendo `finance-dashboard` como ID/URL compatível.
- Corrigir `/api/dashboard` para usar **a mesma função de saldo devedor restante** de `/api/finance/dashboard`: incluir `open` e `partial`, calcular `amount_cents - principal_paid`, com vencido em dia civil coerente. Evitar dois cálculos independentes.
- O indicador `result_groups` atual **permanece identificado como resultado das baixas**, jamais sendo renomeado para DRE. Acrescentar apenas atalho/resumo DRE computado pelo novo motor, com estado de cobertura.

### 9.3 Financeiro → Plano financeiro

- Uma tela com categorias expansíveis e subcategorias existentes, busca, filtros, ativo/inativo, edição contextual e classificação DRE no **mesmo formulário** de categoria/subcategoria.
- Preservar APIs e registros (`/api/categories`, `/api/subcategories`). Para classificação DRE, consultar a API de mapeamento versionado; jamais alterar `classification` ou `result_group` silenciosamente como efeito colateral.
- URLs anteriores `finance-categories` e `finance-subcategories` permanecem como aliases que abrem a aba/âncora correta do Plano financeiro. Introduzir rota canônica `finance-plan` se conveniente.
- Sem segundo cadastro de receita/despesa. Edição com prévia de impacto retroativo e audit trail.

### 9.4 Financeiro → Relatórios Financeiros → DRE

- Inserir DRE como **visão/tipo de relatório**, reutilizando seleção de período, apresentação tabular, estados de carga/erro, impressão e exportação. DRE **não** vira lançamento separado.
- Exibir rubricas com expansões/drill-down, estado `completo/parcial/indisponível`, valor classificado, valor não classificado e indicação de fonte; links conduzem à venda, OS ou lançamento já existente.
- Reutilizar `MonthlyBudget` apenas como comparação opcional de metas versus realizado, com aviso explícito quando os regimes forem diferentes; não somar orçamento na DRE.
- Garantir impressão do **demonstrativo inteiro**, e não só da página visível; preservar a impressão e os CSVs dos 26 relatórios existentes.

### 9.5 Serviços e pedidos

- Ao concluir OS, apresentar confirmação de data efetiva, revisão de custos incorridos e, se não houver títulos, **ação contextual para gerá-los**. Não pedir novamente cliente, descrição, valores negociados e custos.
- Se o usuário cancelar/adiar a geração, manter estado da OS e indicar `Títulos pendentes`; não fabricar dados na DRE.
- Manter o endpoint de geração idempotente e o bloqueio de alteração do contrato após títulos; transição de status e geração devem ser protegidas contra duplo clique/concor­rência e reentrância.

## 10. Exceções e reconciliação

- Duplicidade por origem: venda/título/pagamento, OS/títulos/pagamento, OFX/título/pagamento, recorrência e estorno.
- Revisão de classificação depois do lançamento; excluir/reativar categoria; `affects_result=false` em conflito.
- Receita de serviço faturado antecipadamente; serviço concluído antes de gerar títulos; custo previsto não incorrido; venda de serviço entregue posteriormente.
- Desconto comercial da venda vs desconto de liquidação; juros/multa financeiramente distintos.
- Custo de estoque não disponível; tributos e DA desconhecidos; zero confirmado com responsabilidade.
- Pagamento parcial antes/depois do reconhecimento; cancelamento sem recebimento; estorno em outro mês; reembolso depois de fechamento; período revisado que sofreu alteração retroativa.
- Exportar a mesma classificação e os mesmos status da tela. Totais de DRE, origem e reconhecimentos devem reconciliar centavo a centavo.

## 11. Segurança, integridade e desempenho

- Financeiro/DRE protegido por admin no servidor; capability transportes aplicada **a agregados, detalhes e CSV**. Testar acesso por URL direta, páginas e exportação.
- Não expor nome/CPF/CNPJ de fornecedor especializado ao perfil sem permissão; se um total não puder ser mostrado integralmente, marcar indisponibilidade em vez de mostrar número enganoso.
- Migrations Alembic aditivas e ensaio de upgrade/rollback em **cópia sintética/restaurada autorizada**; sem `drop_all`, truncamento, recriação de DB ou backfill destrutivo.
- Histórico legado importado sem confirmação automática; oferecer relatório de lacunas e prévia de classificação, nunca fazer update em massa no histórico financeiro sem revisão.
- Eficiência: agregar em SQL ou lotes, paginar drill-down, índice para origem/competência/versões; evitar consultas por linha em meses volumosos.
- Limites de payload e tempo mantidos; audit logs sem valores pessoais sensíveis desnecessários e sem segredos.

## 12. Critérios objetivos de aceite

1. Venda finalizada por R$ 1.000 a prazo, paga em parcelas de R$ 300+R$ 700: **um** fato econômico de receita de R$ 1.000; caixa acompanha 300/700; nenhum reconhecimento adicional na última baixa.
2. Venda concluída em novembro e paga em dezembro: DRE de novembro reconhece receita se mercadoria/serviço já entregue; recebimento em dezembro não move a receita entre meses.
3. OS de R$ 5.000 concluída, com R$ 2.000 de custos confirmados e títulos gerados: fatos 5.000/2.000 uma vez, com vínculo e competência aprovados, independentemente do mês de liquidação; custos **não confirmados** não são considerados como zero.
4. OS concluída sem títulos: DRE sinaliza pendência, não inventa entrada financeira; ação contextual gera títulos uma única vez, com usuário confirmando.
5. Importação OFX associada a título existente: nenhuma nova receita/custo; apenas baixa. Importação repetida e idempotência não causam dupla contagem.
6. Parcial e estorno em meses distintos: caixa/baixas mudam por período; DRE mantém trilha econômica e ajustes aprovados; não duplica principal.
7. Categoria/subcategoria alterada depois do fato: período anterior pode ser reproduzido com versão antiga; reclassificação retroativa requer prévia e aprovação.
8. Categoria sem mapeamento, CMV ou DA ausente: cobertura incompleta, dependentes indisponíveis; **nunca** `LL=0` por ausência de informação.
9. Recebível parcial de 1.000 com 400 quitados: Início/Visão financeira exibem pendente de **600**, não 0 nem 1.000.
10. Admin sem capability de transportes não obtém dados especializados via DRE, CSV, drill-down ou agregados; operador não acessa DRE.
11. `#dashboard` antigo abre Início; `#finance-dashboard` continua Visão financeira; `finance-categories`/`finance-subcategories` abrem seção correta do Plano financeiro.
12. DRE CSV/print cobre período completo, preservando zeros confirmados, ausências e referências; 26 relatórios antigos não mudam de significado.
13. Nenhum registro financeiro real ou publicação modificados. Fluxos completos de comércio e serviços, desktop/mobile, Chromium/Firefox, sem skips/retries ocultos.

## 13. Dependências e pontos de validação antes da fórmula de produção

**Decisões de direção já aprovadas.** Ainda exigem definição criteriosa no desenvolvimento: evidência de entrega na venda de serviços, regras para adiantamentos e prestações parciais, reconhecimento de custos de OS, base de tributos, desconto de liquidação, DA, CMV e protocolo de revisão de histórico. Ao faltar definição, comportamento obrigatório é **pendência claramente exibida**, não um cálculo inventado ou bloqueio de toda a implementação.

Revisão por profissional contábil é recomendada para homologar as políticas e rubricas que envolvam competência, tributos, CMV e DA. A DRE permanece gerencial, e não substitui obrigação oficial.

## 14. Referências e restrição operacional

- HEAD inspecionado `00fcaa5f869d702dda6ad535d264a0216dd11b65`, PR #14 aberto/Draft no momento da checagem.
- Referência técnica do repositório: `specs/financial-stage1/DRE.md`, `dre-examples.json`, `backend/tests/test_dre_specification.py` (testes **somente de especificação**, não motor).
- PR #14 contém melhorias financeiras, contratos e CI; **não presumir que foi integrado**. Corrigir primeiro a recuperação UX da conciliação OFX (`financePlanning.tsx`, tratamento de `imports.error`) e contabilizar a inconsistência de recebíveis `api.py:637–651` no novo trabalho.
- **Proibido sem autorização separada:** merge, deploy, variáveis Railway, volumes, banco persistente, credenciais ou usuários reais.
