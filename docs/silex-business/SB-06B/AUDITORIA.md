# SB-06B — auditoria e diagnóstico P01

Baseline aprovado: `fc3498e938cd2eef127dd65161ee909d9f67dd73`. Branch criada diretamente dele: `feat/sb06b-modal-focus`. Checkout inicialmente limpo; fsck sem corrupção (blobs soltos históricos não removidos). Backend, banco persistente, contratos, regras, navegação, shell e estilos fora do escopo.

## Contagem conferida

23 instâncias JSX de `<Modal>` em dez arquivos. O relatório histórico SB-02.3 registrava **42 verificações = 14 acionadores × três larguras**, não 42 implementações diferentes. O script histórico `docs/evidence/sb02-3/scripts/visual_audit.cjs` confirma esse recorte. Agora a varredura simples cobre 15 acionadores × três larguras = 45 verificações, incluindo Nova meta. Variantes de criação/edição e entidades não devem ser confundidas com instâncias de código.

| Arquivo | Consumidores / variantes | Abertura e fechamento |
|---|---|---|
| catalog.tsx | CustomerForm, ProductForm | Novo/editar por botão; Escape/X/Voltar; salvar assíncrono fecha e atualiza lista |
| partners.tsx | PartnerForm | Fornecedor, diarista, frete; novo/editar; Escape/X/Voltar/salvar assíncrono |
| operations.tsx | StockForm, OpenCash, CloseCash | Estoque/abrir/fechar caixa; Escape/X/Voltar/confirmação assíncrona; ação de caixa pode desaparecer |
| sales.tsx | SaleDetail | Ver venda ou conclusão assíncrona do PDV abre recibo; Escape/X; cancelar/finalizar atualiza conteúdo do mesmo diálogo |
| serviceOrders.tsx | ServiceOrderForm, GenerateTitlesForm, ServiceOrderDetails, CancelServiceOrderForm | Novo/editar/ver/gerar/cancelar; Escape/X; formulários Voltar/confirmação assíncrona; detalhe atualiza e cancelamento interno fecha |
| finance.tsx | EntryForm, SettleForm, PaymentHistory, CancelForm, FinanceSettings | Pagar/receber; criar/quitar/baixas/cancelar/contas e categorias. Escape/X; formulários Voltar; confirmar fecha; anexar/estornar baixa também pode fechar histórico e atualizar a lista |
| financeCatalog.tsx | CatalogForm | Contas/categorias/subcategorias; novo/editar; Escape/X/Voltar/salvar. Variante suppliers permanece no componente legado, enquanto rota de fornecedores usa PartnerForm |
| financePlanning.tsx | BudgetForm, OfxResolveForm | Nova meta/revisar movimento; Escape/X/Voltar; salvar/confirmar/ignorar assíncronos fecham; confirmação pode remover acionador da linha |
| ledger.tsx | MovementForm, ReverseForm | Receita/despesa/edição/estorno; Escape/X/Voltar/confirmação; atualização pode remover ação |
| users.tsx | UsersPage (confirmação), UserForm | Ativar/desativar/novo usuário; Escape/X/Voltar/confirmação assíncrona; botão de estado pode ser substituído |

Inventário com linhas/títulos: `modal-inventory.json` nas evidências. Empresa e identidade usa formulário embutido, sem consumidor de Modal. Frente de Caixa reutiliza SaleDetail. Nenhum fluxo atual monta Modal dentro de outro Modal; a fixture ensaia esse padrão somente como robustez. O painel móvel P03 é outro componente e não foi alterado.

## Reprodução e causa

No baseline, os 45 ensaios reais por Tab/Enter abrem com foco dentro e mantêm contenção em Tab/Shift+Tab. **0/45** retornam ao acionador após Escape. Instrumentação de HTMLDialogElement.close mostra `isConnected: false` e `activeElement: BODY`: a limpeza do antigo useEffect executa depois da remoção do diálogo, tarde para o algoritmo nativo de restauração. Não é uma falha dos handlers financeiros.

O componente já usa `<dialog>` com showModal(), nome por aria-labelledby, botão Fechar janela e cancel nativo interceptado. A modalidade, a contenção e a inércia externa são nativas. Não há fechamento implementado por clique no backdrop; esse comportamento é preservado. Não foram adicionados role/aria-modal redundantes, nem uma descrição única que achataria tabelas e formulários complexos.

## Solução local

Hook useModalFocus: abertura/fechamento em useLayoutEffect, captura do acionador e dos ancestrais semânticos pertinentes, restauração nativa antes da remoção. Uma microtask após o commit verifica conexão, visibilidade, disabled/inert e destino deliberadamente focado por outro fluxo. Sem temporizadores, seletores por tela ou mudanças de handlers.

Se o acionador não está disponível, tenta ancestral tabulável/região/main ainda presente; em mudança de endereço respeita o novo destino; outro diálogo modal tem prioridade sobre o fundo. Contêiner sem foco programático recebe tabindex=-1 temporário, removido no blur. Remontagem StrictMode não rouba foco do diálogo reaberto. A recarga real de Pagar/Receber mostrou remoção do botão depois da primeira restauração: um MutationObserver acompanha esse acionador somente enquanto ele mantém o foco, encerra ao seguir para outro controle/abrir novo diálogo e escolhe o mesmo fallback se a remoção ou indisponibilidade ocorrer em atualização assíncrona posterior. Sem alterar useLoad ou os handlers de baixa. Cancel interrompe propagação sintética React para Escape não fechar também um eventual diálogo ancestral.

Foco inicial permanece no botão seguro Fechar janela nos cenários auditados, inclusive confirmações financeiras. React autoFocus nos filhos de um diálogo ainda fechado não é tratado como garantia de foco inicial; não se alteraram os formulários para forçar o primeiro campo. O mecanismo nativo continua disponível para foco inicial apropriado.

Referência de apresentação acessível: [W3C APG — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), incluindo exceções ao retorno ao acionador e prioridade de ações seguras. Testes DOM/teclado não equivalem a homologação com leitores de tela.
