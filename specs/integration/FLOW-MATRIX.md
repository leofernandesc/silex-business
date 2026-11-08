# Matriz de fluxos — inventário inicial e conclusão

Fonte: rotas registradas, endpoints/schemas/serviços e testes existentes (INVENTORY.json). Esta matriz orienta a execução; não declara PASS antes dos resultados. Não há exclusão física de cadastros nem módulo DRE novo inventado.

| Rota | Endpoints principais (/api) | Perfil de navegação | Operações e cenários | Testes existentes/alvo | Lacuna inicial |
|---|---|---|---|---|---|
| /app#home | /company-settings | autenticado (mutação conforme endpoint) | entrada e atalhos por perfil; dados ausentes/erro | home/navigation | Execução conjunta, permissões e persistência a confirmar |
| /app#dashboard | /dashboard | autenticado (mutação conforme endpoint) | indicadores, vínculos e reflow | app/system-review | Execução conjunta, permissões e persistência a confirmar |
| /app#customers | /customers | autenticado (mutação conforme endpoint) | criar, buscar, paginar, editar/inativar, documentos, coleta/entrega por identidade | customer-details/forms-review/test_customer_details | Execução conjunta, permissões e persistência a confirmar |
| /app#products | /products | autenticado (mutação conforme endpoint) | listar por perfil; criar/editar/inativar como admin; preços e histórico | app/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#suppliers | /suppliers?kind=supplier | admin | cadastro, pesquisa, edição/inativação; contato, PIX e vínculos | forms-review/test_partners/test_supplier_kind_links | Execução conjunta, permissões e persistência a confirmar |
| /app#day-workers | /suppliers?kind=day_worker | admin | cadastro genérico de prestador/diária, custos e integridade de tipo | forms-review/test_service_orders | Execução conjunta, permissões e persistência a confirmar |
| /app#subcontracted-freight | /suppliers?kind=subcontracted_freight | admin + transporte | mesmas operações com capacidade; negar acesso genérico | integration/test_transport_capabilities | Execução conjunta, permissões e persistência a confirmar |
| /app#stock | /stock-movements | admin | entrada/ajustes implementados, saldo e falha de insuficiência | app/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#pos | /sales, /cash-sessions/current, /products | autenticado (mutação conforme endpoint) | rascunho, itens, fechar venda/recusar; centavos e estoque | app/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#sales | /sales | autenticado (mutação conforme endpoint) | buscar, detalhes, impressão, finalizar/cancelar; propriedade | app/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#service-orders | /service-orders | admin | criar, custos, editar, títulos idempotentes, cancelar e manter histórico | forms-review/app/test_service_orders/test_supplier_kind_links | Execução conjunta, permissões e persistência a confirmar |
| /app#cash | /cash-sessions | autenticado (mutação conforme endpoint) | abrir/fechar, divergência e propriedade; sem caixa duplicado | app/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-dashboard | /finance/dashboard, /finance | admin | confirmado/carregando/erro/zero, próximos vencimentos e atalhos | financial-stage1/financial-states-review/test_financial_stage1 | Execução conjunta, permissões e persistência a confirmar |
| /app#finance | /finance/movements | admin | lançar, filtrar, estornar, imprimir/CSV; histórico e saldos | app/actions-review/test_financial_ledger | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-reconcile | /finance/ofx/imports | admin | upload, duplicados, sugestões, criar/associar/ignorar, 401/403/falhas | ofx-errors/app/test_finance_expansion | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-payable | /finance?direction=expense | admin | títulos, recorrência, baixa parcial/total, encargos, estorno, anexos | app/ofx-errors/test_finance_expansion | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-receivable | /finance?direction=income | admin | mesmos fluxos e datas civis/filtros vinculados | app/financial-stage1/test_financial_stage1 | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-accounts | /accounts | admin | criar/editar, saldo inicial protegido e histórico | app/test_financial_ledger | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-categories | /categories | admin | criar/editar, direção e histórico | app/test_financial_ledger | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-subcategories | /subcategories | admin | criar/editar/inativar; afeta resultado | app/test_financial_ledger | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-reports | /finance/reports/catalog, /finance/reports/{slug}, /finance/budgets | admin | 26 formatos, filtros, páginas, impressão/CSV; orçamento | system-review/actions-review/test_finance_expansion | Execução conjunta, permissões e persistência a confirmar |
| /app#users | /users | admin | criar, listar, ativar/inativar, senha e proibir autoconcessão | forms-review/test_app/test_transport_capabilities | Execução conjunta, permissões e persistência a confirmar |
| /app#audit | /audit | admin | consulta administrativa e preservação de eventos | system-review/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#company-settings | /company-settings | admin | editar, persistir, documentos e configurações globais | forms-review/test_app | Execução conjunta, permissões e persistência a confirmar |
| /app#finance-suppliers | /suppliers | admin | alias genérico de fornecedores; não concede transporte | system-review/test_partners | Execução conjunta, permissões e persistência a confirmar |

Público/login: /, seções públicas e /entrar; testes public/home/navigation e rotas protegidas diretas. Visitante deve ir ao login. Operador não ganha escrita administrativa por poder abrir uma rota.

Lacunas dirigidas: mensagens de cancelamento (Form); integridade somente leitura de vínculos; matriz de identidades e todos os relatórios sob falha/vazio; isolamento entre testes que mexem no caixa. Essas lacunas terão testes novos e resultados separados no relatório final.

Matriz de identidades: Demo (demo.admin, admin genérico), transport.fixture.admin (admin com capacidade), generic.fixture.admin (admin genérico), second.transport.fixture.admin (admin com capacidade), demo.operador (operator), visitante (sem sessão). Há ainda fixtures legadas específicas; nenhuma conta real é tocada.

## Resultado após a execução

As lacunas da coluna inicial foram endereçadas pelos testes e correções da branch de integração. Resultado por módulo, comandos, falhas/reexecuções e limites em [FULL-REGRESSION.md](FULL-REGRESSION.md#matriz-funcional-executada). Casos reais por projeto e suíte em [test-results.json](evidence/test-results.json). A matriz completa terminou 242/244; a reexecução dirigida aprovou as duas verificações de URL corrigidas e seis regressões relacionadas. Total reconciliado: 244/244, sem ignorados. Isso não é uma alegação de uma execução única sem falhas.
