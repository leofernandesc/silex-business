# SB-05.2 — auditoria anterior à implementação

Baseline aprovado SB-05.1: `5e745062d2f015faecc1ad48e8a657e8f9d63f2b`. Branch `feat/sb05-financeiro`, status limpo, `git fsck --no-reflogs` aprovado, sem remotos. Os seis commits anteriores foram conferidos. Não há divergência impeditiva.

## Mapa funcional confirmado

Ambas as telas montam FinancePage em `frontend/src/finance.tsx`: Pagar com initialDirection=expense; Receber com income. App, registro de rotas e backend continuam sendo as fontes de autorização existentes (financeiro apenas admin; operador recebe 403).

| Recurso | Contas a Pagar | Contas a Receber |
| --- | --- | --- |
| Listagem | Direção expense fixa | Direção income fixa |
| Busca | Draft: histórico/documento/beneficiário; Pesquisar ou Enter aplica | Mesmas opções atuais; busca de beneficiário continua consultando fornecedores, não clientes |
| Filtros | Situação, conta, categoria, beneficiário, tipo de beneficiário, documento e datas | Mesmos controles existentes, inclusive filtros de fornecedor; não inventar filtro de clientes |
| Datas | due/competence/created/settled; De/Até ISO; presets | Mesmo contrato e cálculo dos presets |
| Ordenação | ID decrescente no backend; sem controle de ordenação na UI | Igual; não alterar para ordenar por vencimento |
| Paginação | 20/50/100; totais antes da paginação | Igual |
| Cadastro | Beneficiário fornecedor/diarista/frete e PIX; recorrência 1–60 | Cliente; recorrência 1–60; sem PIX de beneficiário |
| Edição/exclusão | Não existem na tela nem contratos de edição direta | Não existem; não acrescentar para simetria |
| Baixa | Quitar/Nova baixa quando open/partial; principal/juros/multa/desconto, cash/pix/card, conta | Mesmo formulário existente, usado para recebimento; preservar rótulos/handlers |
| Visualização | Baixas quando há pagamentos, histórico/encargos/estorno e comprovantes | Igual; não há modal separado de detalhe/editar título |
| Cancelamento | Motivo mínimo 3, histórico preservado; não para título ligado a venda | Igual; títulos de venda mostram vínculo e não permitem cancelar aqui |
| Estados | Open/partial/paid/canceled; overdue derivado, texto Vencida além da cor | Igual |
| Indicadores | Principal pendente, vencidos, 7 dias inclusive, quantidade do filtro | Igual, valores próprios de income |
| Exportar/imprimir | CSV e HTML backend usam filters aplicados | Igual |

## Preservação técnica

FinancePage conserva useLoad /finance + query(filters,page,page_size), /accounts, /categories e /suppliers. EntryForm conserva consultas de clientes/fornecedores/subcategorias e POST /finance, campos ISO e recurrence_count/frequency. SettleForm conserva POST /finance/:id/settle, centavos/encargos/request_key, conta conforme método. PaymentHistory mantém POST /finance/payments/:id/reverse e AttachmentControls. CancelForm mantém POST /finance/:id/cancel e motivo. FinanceSettings preserva seus dois POSTs e não será redesenhado globalmente.

Capturar chamadas/handlers/expressões financeiras por AST, trechos de estado e sete/seis cabeçalhos; comparar baseline e candidato. Nenhuma nova chamada API, filtro, validação ou cálculo.

## Limitações anteriores e decisões

- P02: wrapper .input-with-icon/input sem outline; corrigir localmente nas duas telas com contorno de 2 px e afastamento visível.
- P05: dateOnly já apresenta dd/mm/aaaa na listagem/histórico. Reutilizar legenda acessível do SB-05.1 nos quatro campos de datas, preservando inputs nativos. Impressão backend exibe datas ISO e marca Gestão: restrição de templates impede alterar; registrar pendência.
- P06: neutralizar somente Nova despesa em Pagar; Nova receita continua primária. Quitar/baixas, Cancelar e Estornar mantêm os rótulos e confirmações existentes.
- P01, P04, P07, P09 permanecem pendentes: não alterar Modal/foco de retorno nem fazer correção global de contraste/CSS. Conservar cores legadas de badges/estados; conferir que o novo fundo/estilo não introduza falhas adicionais.
- Rótulo Período por: Lançamento atualmente mapeia due (vencimento), e filtros de beneficiário em Receber consultam fornecedores. Registrar possíveis incoerências anteriores, sem corrigir funcionalmente.

## Plano e recuperação

CSS específico `silex-accounts`, reutilização sem editar LedgerDateField/LedgerTable, tokens e componentes existentes. FinancePage e documento central são os únicos preexistentes previstos para alteração. Backup externo verificado de 66 originais frontend/documento central, manifestos iniciais e cópias Git em /tmp. Capturas baseline/candidato em bases fictícias equivalentes; operações apenas em base funcional descartável.

Commits separados para preparação, apresentação, P02, testes e documentação; revisar staged por caminhos/conteúdo/tamanho. ZIP enxuto: relatórios, manifestos, diffs, resultados e capturas úteis, sem traces completos, bancos, .git ou builds. Logs completos permanecem locais.
