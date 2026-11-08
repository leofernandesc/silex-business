# E0 — Referência confirmada

PR #14 consultado via API: aberto, Draft, HEAD `00fcaa5f869d702dda6ad535d264a0216dd11b65`, base `integration/erp-full-regression`. Origem confirmada com fetch. Esta branch deriva desse HEAD e seu PR será empilhado contra `fix/erp-commercial-readiness`; não depende de uma integração presumida.

Worktree: `/home/leofernandesc/silex-dre-integration`. Branch: `feat/dre-integrated-financial-ux`. Main e branches anteriores não foram alteradas.

Os dois documentos normativos foram lidos integralmente. O pacote fornecido foi movido de Downloads para esta pasta e extraído com validação dos caminhos. O ZIP é ignorado pelo Git; somente os documentos extraídos serão versionados.

Referência executável anterior: CI `42482303089`, HEAD acima: 288 backend, 234 frontend, build e matrizes completas 312 Chromium/312 Firefox; essas evidências não substituem a futura regressão desta evolução.

Modelo confirmado no código: Alembic 0013; Sale.finalized_at, FinanceEntry.sale_id único, Payment.principal_cents com sinais de estorno, ServiceOrder sem evidência de conclusão, custos contratados sem evidência de incorrência, categorias sem rubrica DRE. Não existe CMV valorizado. Categorias/subcategorias mantêm seus endpoints. As 26 saídas existentes permanecem referência de contrato, com mudanças intencionais registradas individualmente.

E1: reprodução com a versão arquivada desse commit e fixture SQLite descartável. Inicialmente a fixture foi recusada por não fornecer a chave de idempotência obrigatória; corrigida a fixture, a reprodução válida demonstra Início=0 versus 6000 centavos no financeiro após parcial de 4001 sobre 10001. Não houve mudança da regra de idempotência.

Nenhum acesso à Railway, banco persistente, credencial real ou dados da transportadora. Dependências de execução reutilizadas localmente; nenhuma instalação global ou alteração de dependências.
