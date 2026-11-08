# Inventário independente e validação dos fluxos

Fontes atuais: [AST da interface](UI-INVENTORY.json), [registro real de rotas/dependências e schemas](BACKEND-INVENTORY.json), testes e execução com SQLite descartável. A lista anterior foi comparada, não usada como única fonte.

São 25 rotas autenticadas. O inventário inicial detectou 149 pontos de interação e 90 chamadas de recurso. A candidata registra 154 pontos de interação e as mesmas 90 chamadas inventariáveis por esse coletor; os cinco novos pontos são feedback/retry. Essas ocorrências de código **não são 149 jornadas independentes aprovadas**. Os seis botões sem handler direto são submits de formulários existentes (Pesquisar, Atualizar, Gerar relatório, Nova meta e Form); não foram encontrados botões demonstrativos/TODOs expostos sem implementação. A inspeção estática não demonstra ausência absoluta de ações defeituosas.

O backend registra 72 operações API no modo de teste sem frontend. A declaração restante da matriz antiga é `/{path:path}`, o fallback do frontend desativado por `serve_frontend=False`; o container e E2E exercitam o frontend compilado. Não foram removidos endpoints. Os schemas e guards reais estão no inventário, inclusive dependências aninhadas de sessão/admin.

| Módulo / rotas | Operações e evidências executáveis | Perfis e recusas | Resultado final |
|---|---|---|---|
| Público, login, sessão | public/home/navigation, auth api.test, test_app/test_deployment; login inválido, logout, expiração, respostas antigas, host/origin/CSRF | visitante, inativo, admin, operador | Consultar contagens e falhas em FINAL-REVIEW |
| Início / Visão Geral | home/integration: dados, consulta indisponível, atalhos, teclado e reflow | seis identidades da integração | Mesmo critério |
| Clientes | customer-details/forms-review/test_customer_details: criação, documento alfanumérico, duas moradas independentes, edição, legado 0011/0012, reabertura | genéricos sem dados específicos; duas identidades especializadas isoladas | Mesmo critério |
| Produtos e serviços | app/test_app/system-review: cadastro, pesquisa, editar, produto/serviço, estoque, documento/valor válido/inválido | admin/operador conforme endpoint | Mesmo critério |
| Fornecedores e diaristas | forms-review/test_registration/test_partners: cadastrar, editar, inativar, PIX/documentos/contato, preservar telefone único | admin genérico mantém cadastros genéricos | Mesmo critério |
| Frete subcontratado | transport-module/test_transport_capabilities/test_supplier_kind_links: API, menu, custo, propriedade, reclassificação negada com vínculos | admin ativo + capacidade explícita; negar genérico/operador/visitante | Mesmo critério |
| Estoque | app/test_app/commercial-readiness: movimento, inventário, insuficiência, persistência, falha de consulta de produtos e recuperação | escrita administrativa protegida | Mesmo critério |
| PDV / vendas / caixa | app/test_app: abrir caixa, rascunho, itens, finalizar, recibo, cancelar/estornar, estoque e centavos; financial-states/commercial: pendente/erro/zero e produto obsoleto | operador e admin, propriedade do caixa, visitante negado | Mesmo critério |
| Serviços / pedidos | app/forms-review/test_service_orders/test_supplier_kind_links: custos, editar, geração idempotente, cancelar com histórico, erro e processamento, readonly integrity | genérico mantém serviço/diaristas; transporte protegido, custo oculto não excluído | Mesmo critério |
| Dashboard financeiro | financial-stage1/financial-states/test_financial_stage1: oito indicadores, zeros reais, erro/pendente, atraso, filtros, atalhos reconciliados | admin; operador/visitante negados | Mesmo critério |
| Pagar / receber | app/modal-workflows/test_finance_expansion/commercial: recorrência, parcial/total, encargos/desconto, estorno, cancelamento, anexos, submissão única, parse inválido recusado | admin e guards financeiros | Mesmo critério |
| Livro caixa | app/actions-review/test_financial_ledger: filtros, movimento manual, idempotência, estorno, saldos, CSV e impressão | admin | Mesmo critério |
| Contas / categorias / subcategorias | app/test_financial_ledger: cadastro, edição, referência inicial, classificação, afeta resultado e histórico | admin | Mesmo critério |
| Conciliação OFX | ofx-errors/test_finance_expansion: arquivo válido/inválido/limites, sugestões, confirmar/criar/ignorar, duplicidade, 401 vs403, erro/reabrir/atraso | admin e sessão; sem upload automático após erro | Mesmo critério |
| Orçamentos | actions-review/test_finance_expansion/test_commercial_reports: cadastrar/desativar, competência, meta/realizado, erro, filtro incompatível explícito | admin; orçamento global por categoria | Mesmo critério |
| 26 relatórios | integration + integration-reports + 26 casos backend: períodos, página, vazio, erro/recuperação, impressão, CSV comparado célula por célula e guard | admin; todos JSON/CSV recusam operador403 e visitante401 | Mesmo critério |
| Usuários / auditoria / empresa | forms/system-review/test_app/transport_capabilities: criar/editar/ativar, senha, revogação, autoconcessão negada, empresa global e histórico; CLI sem eco | admin, contas inativas e acesso anônimo recusados | Mesmo critério |
| Persistência / publicação local | migration_recovery/test_deployment/check_railway: histórico 0012→0013, interrupção DDL, reinício, backup restaurado, anexos/IDs/centavos, volume obrigatório e HTTPS local | somente usuários sintéticos | Mesmo critério |

Todos os 26 IDs do catálogo: cash-daily, cash-monthly, result-monthly, income-category, expense-category, income-subcategory, expense-subcategory, income-account, expense-account, income-customer, expense-supplier, by-origin, by-method, receivable-open, payable-open, receivable-overdue, payable-overdue, titles-due, titles-competence, settlements-daily, charges-monthly, discounts-monthly, partial-payments, reversals, documents, budget-actual.

## Classificação da oferta

- **A — Implementado e sob validação técnica nesta candidata:** cadastros/estoque/vendas/serviços/financeiro/relatórios expostos, conforme resultados por suíte. A aprovação depende da execução final, não só desta lista.
- **B — Defeitos corrigidos:** registrados em [DEFECTS](DEFECTS.md), inclusive bugs descobertos nesta auditoria. Não usar resultados antigos como prova da candidata.
- **C — Capacidade operacional parcial:** recuperação de acesso por administrador/CLI, backup/restore manual, suporte e operação supervisionados; não há serviço comercial completo comprovado, SLA nem ensaio com dados reais.
- **D — Planejado e não implementado:** DRE gerencial/EBITDA propostos, SaaS multiempresa, contratação/assinaturas/provisionamento comercial, autosserviço de recuperação e encerramento de empresa. Não anunciar como disponível. A capacidade de transporte não equivale a isolamento entre empresas.

## Limites de cobertura

A automação demonstra cenários enumerados, não todas as combinações possíveis de dados/eventos. Sem avaliação humana observada, leitor de tela, impressora física ou dispositivos físicos. Nenhum teste de carga de longa duração nem pentest. Casos sintéticos incluem vazio/um/20/paginado, texto longo sem espaços, valores altos/negativos/centavos, CNPJ alfanumérico e alterações de data/fuso. A fixture nova de 240 clientes exerce criação real, páginas distintas, exportação completa de 241 linhas (cabeçalho + 240) e recarregamento em desktop/móvel. Isso não é teste de carga concorrente prolongada nem dimensionamento de produção.
