# Inventário funcional consolidado

Inspeção do código aprovado, complementada pela execução: `surfaces.json` registra títulos, campos, ações, cabeçalhos de tabelas, linhas, fontes e geometria de 26 superfícies em cinco larguras. Não confundir abertura de uma tela com teste de todas as combinações de negócio. A matriz TESTES.md discrimina fluxos executados.

Registro central: `frontend/src/navigation/routes.ts`. São **24 destinos autenticados distintos** (23 operacionais + Início), mais o alias legado `finance-suppliers` para Fornecedores. Público e login completam 26 superfícies. A = administrador; O = operador. A autorização real continua no backend; disponibilidade no frontend não concede acesso.

| Destino | Perfil | Fonte principal / dados | Recursos existentes confirmados |
|---|---|---|---|
| `/` | Público | public/PublicPage; conteúdo estático | Seções, âncoras, menu responsivo, demonstrações rotuladas fictícias, Entrar; sem consulta privada, contratação ou cadastro público |
| `/entrar` | Público/sessão | App/Login; auth/login, auth/me | Credenciais, erros, retorno validado, persistência; sessão válida retorna ao ERP |
| `home` | A/O | home/AuthenticatedHome; usuário/empresa do shell | Boas-vindas, empresa, atalhos/grupos permitidos, Visão Geral independente; sem indicadores financeiros ou nova seleção empresarial |
| `dashboard` | A/O | App/DashboardPage; dashboard | Vendas hoje/mês, últimas vendas, estoque baixo, caixa; financeiro adicional somente A; vendas filtradas pelo usuário para O |
| `customers` | A/O | catalog/Customers; customers | Busca por campo, ativo, paginação, cadastro/edição/inativação, CSV |
| `products` | A/O leitura; A escrita | catalog/Products; products | Produtos/serviços, busca/tipo/grupo/ativo, paginação, CSV; cadastro/edição/estoque conforme autorização |
| `suppliers` | A | partners/PartnerRegistry; suppliers(kind=supplier) | Busca por campo/PIX, ativo, paginação, cadastro/edição/inativação; sem exportação própria |
| `day-workers` | A | partners; suppliers(kind=day_worker) | Diaristas, contato/documento, valor referência, tipo/chave/titular PIX; cadastro não executa pagamento |
| `subcontracted-freight` | A | partners; suppliers(kind=subcontracted_freight) | Frete subcontratado, contato/documento/PIX; seleção em títulos e custos de serviço |
| `stock` | A | operations/StockPage; stock-movements | Busca/tipo/produto/período, paginação, entrada/saída/inventário com motivo, CSV; serviços não movimentam estoque |
| `pos` | A/O | sales/PointOfSale; products/customers/cash/sales | Catálogo/carrinho, quantidades/desconto, cliente, dinheiro/PIX/cartão/a prazo; requer caixa; sem TEF/fiscal |
| `sales` | A/O próprio escopo | sales/SalesPage/SaleDetail; sales | Busca/status/período, paginação, detalhe, finalizar rascunho, recibo não fiscal, CSV, cancelamento autorizado |
| `service-orders` | A | serviceOrders; service-orders | Listar/filtrar, cadastrar/editar, detalhe, custos contratados, gerar títulos explicitamente, cancelar; gerar não paga/recebe automaticamente |
| `cash` | A/O próprio caixa | operations/CashPage; cash-sessions | Abrir/fechar/conferir, valores esperado/contado/diferença, histórico paginado; fundo de abertura não é receita |
| `finance` | A | ledger/LedgerPage; finance/movements | Livro caixa, períodos/filtros aplicados, saldos/indicadores, paginação, criar movimento/estorno, CSV/impressão |
| `finance-dashboard` | A | financePlanning/FinanceOverview; finance/dashboard | Seis indicadores com janelas distintas; 12 meses entradas/saídas e alternativa tabular; classificação, contas, De/Até/Atualizar, Abrir livro caixa; sem modal/export próprio |
| `finance-reconcile` | A | financePlanning/FinanceReconciliation; finance/ofx/imports | Seleção de conta para importar OFX local, histórico paginado, prévia/duplicados, sugestões e confirmação manual, criar título ou ignorar com motivo; sem sincronização bancária, busca/período, export ou desfazer próprio |
| `finance-payable` | A | finance/FinancePage expense; finance | Busca, tipo fixo, conta/categoria/beneficiário/documento/período/status, paginação, criação/recorrência, detalhe, baixa parcial/integral/encargos/desconto, comprovantes, estorno/cancelamento permitido, CSV/print |
| `finance-receivable` | A | finance/FinancePage income; finance | Mesma base de títulos com semântica de receita/cliente; não equiparar beneficiário/PIX de despesa a recebimento; filtros/baixas/histórico/CSV/print existentes |
| `finance-accounts` | A | financeCatalog/FinanceCatalog accounts; accounts | Busca/ativo, cadastro/edição/inativação, saldo inicial/referência/dados bancários/taxas; não consulta banco externo |
| `finance-categories` | A | financeCatalog; categories | Busca/ativo, cadastro/edição/inativação, direção e classificação financeira; sem export próprio |
| `finance-subcategories` | A | financeCatalog; subcategories | Busca/ativo, categoria/classificação/grupo/afeta resultado, cadastro/edição/inativação |
| `finance-reports` | A | financePlanning/FinanceReports; reports/catalog + slug | 26 relatórios confirmados no catálogo; seleção/período/campos aplicáveis, tabela/paginação, CSV/impressão, orçamento mensal; não são 26 telas novas independentes |
| `users` | A | users/UsersPage; users | Listagem/paginação, cadastro/edição, perfil/ativo/senha conforme formulário; sem novo perfil |
| `audit` | A | users/AuditPage; audit | Histórico paginado com usuário/ação/registro/timestamp; não editar/apagar eventos pela interface |
| `company-settings` | A | settings/CompanySettingsPage; company-settings | Editar identificação global da empresa e nome de apresentação legado; não é seleção multitenant |

## Componentes e estados

`ui.tsx`: PageTitle, Notice, Badge, SearchBox, ActiveFilter, Dates, Table, Pagination, Modal, Field, Form, SummaryCard e useLoad. Table preserva carregamento/vazio; useLoad expõe erro; Form mantém validação/erro/busy; detalhes de foco em useModalFocus. Shell/menu em App e hooks navigation; Brand usa SVGs oficiais/Inter local. Famílias financeiras têm CSS específico; público e Home têm seus componentes/estilos próprios.

Não há uma ordenação interativa universal: a maioria das listas usa a ordenação definida na API, com paginação e filtros próprios. Não anunciar cabeçalhos clicáveis onde não existem. Na Conciliação, seleção de conta controla **importação**, não filtra todo o histórico. Não existe edição/desfazimento genérico para todas as entidades.

## Ausentes ou dependentes de decisão

Não implementados: isolamento por cliente/CNPJ, tenant selector, assinatura/planos/cobrança recorrente comercial, checkout/cadastro público, NF-e/NFC-e/NFS-e operacional, TEF, conexão/sincronização bancária automática. Recorrência de títulos financeiros não é assinatura SaaS. PIX cadastrado/copiado não transfere dinheiro. Recibo é não fiscal. Hospedagem pública/HTTPS/produção não homologados neste incremento.

Marca fixa Silex Business; `company_name` identifica a empresa global; `brand_name` é apresentação configurável legada. Impressão backend ainda contém Gestão e datas ISO: ocorrência preexistente documentada, sem alteração fiscal ou de template.
