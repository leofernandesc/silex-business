# Auditoria de dependências — SB-05.3A

Baseline aprovado: `b21a11769803eb0dcb86e470f641987bd1c3771a`, branch `feat/sb05-financeiro`, checkout inicialmente limpo. `git fsck` não identificou erro de integridade; um blob sem referência é resíduo de staging, sem impacto no histórico.

## Conciliação existente

`frontend/src/financePlanning.tsx` contém FinanceReconciliation, StatementRows, OfxResolveForm e OfxNewFields. A rota `finance-reconcile` exige administrador no registro central; todos os endpoints OFX também usam ADMIN no backend. Operador recebe 403 e visitante 401. O shell e os controles de sessão/permissão permanecem fora do escopo.

Consultas: GET `/accounts`, `/finance/ofx/imports?page=…&page_size=50`, `/finance/ofx/imports/{id}` e `…/items/{id}/suggestions`; no modo criar, GET `/categories`, `/subcategories` e clientes/fornecedores ativos. Importação POST `/finance/ofx/imports?account_id=…`, corpo binário OFX, Content-Type e X-Statement-Name. Resolução POST `…/items/{id}/confirm` para vincular um título, criar título ou ignorar a linha. Nenhuma chamada nova será acrescentada.

A seleção da conta é usada para importar, sem filtrar o histórico. Apenas contas bancárias ativas aparecem. A escolha do arquivo inicia a importação; limite 10 MB, formatos .ofx/.qfx. A importação grava a prévia, sem baixa automática. Sugestões são opções ordenadas pelo backend; a escolha e a confirmação são manuais. A prévia mostra arquivo/conta, contagem de transações, pendentes e duplicadas. O histórico é paginado, 50 registros por página, ID descendente. A tabela do extrato tem cinco colunas: Data, FITID / histórico, Valor, Situação e Vínculo / ação. Histórico: Arquivo / conta, Situação, Transações, Pendentes / duplicadas e Ação.

Estados efetivos: pending/Pendente, matched/Conciliado, posted/Lançado, ignored/Ignorado e duplicate/Duplicado #ID. Importações mostram preview/Prévia e complete/Revisado, derivados das pendências. Apenas pending permite Revisar / confirmar; vínculos existentes exibem a descrição do título. Modal: Conciliar título ou Criar lançamento, principal/juros/multa/desconto quando um título é selecionado, categoria/subcategoria/pessoa para criação, motivo obrigatório para Ignorar esta linha. A confirmação usa a conta e a data do OFX; cria baixa e altera saldos pela lógica existente.

Backend: `financial.py`, `ofx.py`, schemas/models/services e Payment/FinanceEntry/BankStatementImport/BankStatementItem. Verifica pertença ao extrato, sinal/direção, conta/cadastros ativos, título aberto/parcial, valor líquido exato, FITID por conta e fingerprint para idempotência. Limite de sugestões: dez entre até mil títulos. Ordem de itens: data/ID. Sem integração bancária automática. Não existem busca, filtros de período/situação, exportação/impressão, desfazimento da conciliação ou exclusão da importação nesta tela/API. Esses recursos não serão criados.

Datas já usam `dateOnly` na tabela/modal, extraindo ISO sem fuso. Não há editor nativo de data na Conciliação. Valores usam `money` e centavos inteiros. P05 permanece parcial no ERP.

## Dashboard Financeiro — somente planejamento

FinanceOverview está no mesmo arquivo, mas possui estado e consulta próprios: GET `/finance/dashboard?start=…&end=…`, handlers De/Até/Atualizar. Seis SummaryCards; barras HTML/CSS de entradas/saídas de 12 meses; tabela por classificação/grupo; saldo por conta e Abrir livro caixa. `reporting.py` calcula movimentos pela data de lançamento, grupos pela competência, saldos iniciais + pagamentos e títulos pendentes/vencidos. Parte das informações não é limitada ao filtro (saldo atual e títulos abertos), comportamento existente a preservar.

Conciliação altera dados que naturalmente alimentam o Dashboard por meio de Payment/FinanceEntry, mas não compartilha consultas nem estado React com ele. Estilos monthly-bars/bar-pair/summary-card, componentes Table/Field/Modal/Form/PageTitle/Pagination e helpers money/dateOnly são compartilhados com outras telas. Nenhum desses arquivos será modificado. FinanceOverview, FinanceReports, BudgetForm e OfxNewFields permanecerão byte a byte iguais.

## Decisão técnica

Prosseguir: criar `reconciliation.css` restrito a media screen e `.silex-reconciliation`; adicionar um wrapper só ao retorno da Conciliação, classes de seções e badges que mantêm exatamente os textos/estados originais; reutilizar LedgerTable, já aprovado, nas duas tabelas. OfxResolveForm permanece intacto e recebe apenas os estilos locais por descendência. Sem extração de lógica, nova biblioteca, CSS global ou mudança de arquitetura.

O arquivo compartilhado requer comparação de funções e handlers antes/depois e hashes de todo o backend, Dashboard, shell, regras, dados e evidências históricas. Backup dos dois arquivos preexistentes autorizados: financePlanning.tsx e PENDENCIAS.md; arquivos novos têm remoção descrita no procedimento de recuperação.

## Pendências observadas

P01 retorno do foco após modal, P04 contrastes antigos, P07 CSS acumulado e P09 controles densos continuam fora da correção global. O upload utiliza fetch diretamente: uma resposta 401 não dispara o evento global de expiração usado por api(); autorização backend permanece válida. Erros de consulta de contas/histórico/sugestões não possuem Notice próprio; Ignorar usa handler assíncrono sem o tratamento de Form. Registrar para um escopo funcional, sem alterar autenticação/handlers. O motivo de ignorar não é exibido no histórico existente.

V01 seguirá com repetições do clique real, contagens e logs. Reflow do cabeçalho em 187 px CSS será registrado centralmente e comparado com a Conciliação, sem corrigir o shell. Nenhuma conformidade completa de reflow ou homologação com leitor de tela real é declarada.
