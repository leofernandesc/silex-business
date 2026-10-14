# Auditoria da arquitetura frontend e da marca

Leitura estática em 13/10/2026; não executados backend, banco, testes de aplicação ou nova captura do ControlMax. Caminhos abaixo relativos à raiz `controlmax-inspired`.

## Arquitetura atual

React 19, TypeScript e Vite; Lucide para ícones. Sem React Router e sem biblioteca de estado global. `main.tsx` monta App em StrictMode e importa `styles.css`. `App.tsx` reúne autenticação, menu, shell, login e dashboard em cerca de 659 linhas. CSS global com cerca de 2.192 linhas e dois blocos `:root` (1 e 2049), além de repetição de seletores para sidebar/topbar/botões/cartões.

`api.ts` faz fetch de mesma origem com prefixo `/api`; eventos de expiração em 401 de operações, exceto login/me. `types.ts`, `format.ts` e `financeDates.ts` centralizam contratos, representação monetária/quantidades e datas. Não modificar esses comportamentos para a migração visual.

Servidor: FastAPI entrega assets em `/assets` e fallback index.html para paths não API, quando há build e `serve_frontend` ativo. Isso favorece separação por pathname sem depender de nova biblioteca de rotas. Ainda será necessário validar acesso direto `/entrar` e `/app` no ambiente Vite e no destino de hospedagem antes do SB-03. Não assumir que todo proxy futuro já tenha fallback.

## Componentes e reaproveitamento

| Arquivo | Conteúdo reutilizável | Estratégia futura |
| --- | --- | --- |
| `frontend/src/ui.tsx` | PageTitle, Table, Pagination, Modal, Field, Form, Badge, Notice, SummaryCard, SearchBox, ExportButton, Dates, ActiveFilter | Preservar interfaces e eventos; aplicar tokens e estados em pequenas revisões |
| `App.tsx` | Brand, Login, shell/menu, DashboardPage | Extrair componentes sem alterar consultas ou ações; Brand fixo; Dashboard independente |
| `catalog.tsx` | Clientes, produtos/serviços e formulários | Migrar estilos sobre componentes existentes |
| `partners.tsx` | Fornecedores, Diaristas, Frete Subcontratado, PIX | Conservar validações, filtros, inativação e fluxo de cópia |
| `operations.tsx` | Estoque, caixa e formulários | Preservar quantidade, abertura/fechamento e escopo do usuário |
| `sales.tsx` | PDV, vendas, detalhe e recibo | Preservar fechamento, itens, pagamento e impressão |
| `serviceOrders.tsx` | Pedidos/serviços, custos, geração de títulos | Preservar vínculos e ações explícitas |
| `ledger.tsx` | Livro caixa, filtros, movimentos, estornos e impressão | Prioridade visual; manter semântica efetiva de entrada/saída |
| `finance.tsx` | Pagar/receber, título, baixa, anexos, histórico | Preservar centavos, status, idempotência e contratos |
| `financePlanning.tsx` | Dashboard financeiro, conciliação OFX, relatórios e orçamento | Preservar séries, consultas e alturas calculadas dos gráficos |
| `financeCatalog.tsx` | Contas, categorias e subcategorias | Preservar inativação e associações |
| `settings.tsx`, `users.tsx` | Empresa, usuários e auditoria | Dados de cliente separados da marca; regras de autorização preservadas |

Modal já utiliza diálogo nativo; Form preserva busy, erro e bloqueio de fieldset; Field associa label ao controle. Não trocar esses componentes por maquetes. Reaproveitar estruturas de painel, toolbar, tabela, form-grid, summary-grid, period-tabs, account-strip, print-only, feedback e menu, com inspeção dos seletores reais antes de cada alteração.

## Inventário de telas e permissões atuais

Hash atual sem `/`; A = administrador, O = operador. Para rotas compartilhadas, o backend pode limitar registros ao usuário. Acesso indicado é do menu/guard atual, não novo modelo de permissões.

| Hash | Tela | Componente | Acesso |
| --- | --- | --- | --- |
| `dashboard` | Visão Geral | DashboardPage / App.tsx | A/O |
| `customers` | Clientes | Customers | A/O |
| `products` | Produtos ou Serviços | Products | A/O |
| `suppliers` | Fornecedores | PartnerRegistry supplier | A |
| `day-workers` | Diaristas | PartnerRegistry day_worker | A |
| `subcontracted-freight` | Frete Subcontratado | PartnerRegistry subcontracted_freight | A |
| `stock` | Estoque | StockPage | A |
| `pos` | Frente de Caixa | PointOfSale | A/O |
| `sales` | Vendas | SalesPage | A/O |
| `service-orders` | Serviços e pedidos | ServiceOrdersPage | A |
| `cash` | Controle de caixa | CashPage | A/O |
| `finance` | Lançamentos Despesa/Receita | LedgerPage | A |
| `finance-dashboard` | Dashboard financeiro | FinanceOverview | A |
| `finance-reconcile` | Conciliação Bancária | FinanceReconciliation | A |
| `finance-payable` | Contas a Pagar | FinancePage expense | A |
| `finance-receivable` | Contas a Receber | FinancePage income | A |
| `finance-accounts` | Cadastro de Contas | FinanceCatalog accounts | A |
| `finance-categories` | Categorias | FinanceCatalog categories | A |
| `finance-subcategories` | SubCategorias | FinanceCatalog subcategories | A |
| `finance-reports` | Relatórios Financeiros | FinanceReports | A |
| `users` | Usuários | UsersPage | A |
| `audit` | Histórico de operações | AuditPage | A |
| `company-settings` | Empresa e identidade | CompanySettingsPage | A |
| `finance-suppliers` | Alias legado Fornecedores | PartnerRegistry supplier | A |

## Constatações relevantes

1. Guest sempre vê Login; não há rota pública comercial. Página inicial do ERP equivale hoje ao dashboard.
2. Hash inicial vazio usa `dashboard`; listener `hashchange` e `navigate()` controlam páginas. Não há tratamento de pathname/popstate; login bem-sucedido chama `navigate("dashboard")`, perdendo destino solicitado.
3. Guard deriva safePage do papel; desconhecido/não permitido resulta em dashboard. Grupo financeiro pode permanecer visível ao operador porque a renderização de financeMenu não aplica o mesmo filtro do guard (App.tsx perto de 230–271). Não significa acesso autorizado à API. Planejar registro único de disponibilidade para menu, home e guard, sem alterar políticas.
4. Empresa atual vem de `/company-settings`: um conjunto de configuração global, sem seletor ou isolamento multitenant demonstrado. Home deve mostrar empresa ativa configurada; não desenhar um seletor fictício.
5. O container da página usa key safePage e remontagem ao navegar. Evitar mudanças acidentais de persistência/reset de filtros, paginação e formulários ao extrair o shell.
6. CSS combina paletas azul/verde antigas e novas. `--navy` sobrescrito como branco pode afetar login mobile; grupos de seletores globais e estilos print exigem migração controlada, não um override gigantesco.
7. Inter é apenas citada na stack atual; fontes reais estão incluídas somente nos protótipos SB-01.
8. Algumas classes de custos de serviços não têm regras próprias. Revisar com a tela correspondente no SB-06, sem introduzir mudança funcional.

## Auditoria de referências à marca

| Localização confirmada | Referência | Substituição planejada |
| --- | --- | --- |
| `frontend/index.html:9,11` | Descrição e título Gestão | Metadados fixos Silex Business, conteúdo aprovado |
| `App.tsx:210,277,292,368` | Marca vem de company.brand_name ou Gestão | Marca fixa em logo/cabeçalho/rodapé; cliente em região distinta |
| `App.tsx:375,429` | Brand default Gestão e assinatura login | Logo oficial e nome Silex Business |
| `sales.tsx:524` | h2 Gestão no recibo | Assinatura de software; preservar campos e valores do recibo |
| `ledger.tsx:455` | Livro caixa · Gestão | Livro caixa · Silex Business, sem alterar dados/impressão |
| `finance.tsx:73` | Abre HTML `/api/finance/print` | Não basta mudar frontend; template backend listado abaixo |
| **`backend/app/api.py:490`** | **Definição atual de finance_print** | **Referência solicitada confirmada** |
| **`backend/app/api.py:498`** | **h1 Gestão · Lançamentos financeiros no HTML** | **Trocar somente apresentação/estilo em SB-05, preservar query, escape e contrato** |
| `financePlanning.tsx` | Relatórios print no frontend | Aplicar cabeçalho/assinatura sem mudar colunas, CSV ou totais |
| `api.py:68`, `cli.py:153` | FastAPI title Gestão, descrição CLI Gestão Local | Metadados técnicos opcionais no SB-06; não alteram endpoints |
| `api.py:116`, `schemas.py:37`, `models.py:42` | Defaults de brand_name Gestão | Dados e defaults contratuais preservados neste ciclo; produto desacoplado no frontend |
| `settings.tsx:25` | Nome provisório da aplicação | Proposta final de rótulos/precedência em DADOS-APRESENTACAO; conservar propriedade, valores e edição |

Não fazer substituição textual global. `gestao_session`, `gestao.nav.groups`, `GESTAO_DATABASE_URL`, `gestao.sqlite3`, nome npm e configurações de execução são identificadores técnicos que não precisam mudar. Preservá-los evita perda de sessão, estado, localização de banco e ambiente. Registros empresariais que contenham “Gestão” não são alvos de limpeza.

## Revisão de nomes e datas

Leitura atual confirma campos brand_name e company_name independentes, sem classificação fiscal ou sincronização. dateOnly já apresenta ISO como dia/mês/ano, mas o input nativo type=date pode mostrar outro formato conforme ambiente. A proposta detalhada, incluindo limites do legado, ISO preservado e controle de apresentação futuro, está em [DADOS-APRESENTACAO.md](DADOS-APRESENTACAO.md). A segunda demonstração A utiliza somente campos/situações existentes em SalesPage (`sales.tsx:392–489`), com registros criados para o estudo.

## Evidência e limites de disponibilidade

Código existente demonstra módulos e contratos; não é nova homologação em produção. Evidências locais anteriores: `docs/evidence/sprint8/dashboard-desktop.png`, `livro-caixa-desktop.png`; cadastros/PIX em `docs/evidence/partners/`; pedidos em `docs/evidence/service-orders/`. Usadas como referência de organização; não copiadas para mockups nem página pública.

`docs/ANALISE_REA.md` e seu manifest registram inspeção anterior de menu, cadastros, financeiro e PDV do ControlMax. Capturas privadas podem conter identificações reais, portanto não integram este pacote. Não há nova confirmação da home original nesta etapa. A organização de home aqui é uma proposta baseada no briefing aprovado e no padrão funcional observado, não cópia comprovada de todos os seus comportamentos.

Oferta pública conservadora: cadastros, produtos/serviços, estoque, vendas/caixa e financeiro, após homologação. Conciliação é OFX com confirmação manual; PIX é cadastro/cópia de chave, não transferência/consulta ao DICT. Não anunciar emissão fiscal, TEF, Open Finance, multitenancy, SaaS publicado, contratação automática, SLA ou suporte não definido. Serviços/pedidos com geração de títulos devem passar por Review de negócio antes de destaque comercial.
