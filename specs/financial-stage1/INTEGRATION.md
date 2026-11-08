# Estratégia de integração — definida antes das alterações de produção

Base independente: main/origin/main 7214ad2543e0e980366a386b27cc7bbb39eddb32. Não incorporar PR #11 (ed51939) ou fix/forms-usability-system-review (6c873d0). Worktrees e referências anteriores preservadas.

Arquivos compartilhados previstos:

- financePlanning.tsx: extrair somente FinanceOverview para arquivo próprio e manter reexportação. Ao integrar futuramente com #11, manter imports de capacidades, assinatura FinanceReports({user}), filtros de transporte e todos os guards. Relatórios/OFX não serão reimplementados aqui.
- finance.tsx: inicialização/sincronização de filtros e descrição do período. Preservar futuramente user/hasTransport e filtro de beneficiários do #11; combinar os imports, sem substituir a função inteira. As correções de falhas da branch de formulários devem permanecer.
- api.py: acrescentar apenas as_of_date ao resumo financeiro já calculado, usando a mesma data que define os vencidos/próximos sete dias. Manter os guards do #11 nas rotas e nos novos vínculos; nenhum cálculo novo nem alteração de paginação/valores.
- Os demais arquivos de #11 (modelos, migração 0013, CLI, propriedade, serviços) não são dependências desta etapa e não serão editados.
- ledger.tsx, alterado na revisão de formulários: inicialização/descrição de filtros e snapshot por chave de consulta, sem zeros artificiais em falha. Conservar as proteções de carregamento/erro e submissão daquela revisão quando houver integração autorizada.
- useAppNavigation.ts: preservar apenas parâmetros financeiros estritamente validados ao normalizar uma URL autenticada. Não alterar autenticação, permissões, expiração, destinos ou mecanismos de retorno.

A integração futura exige revisão dos hunks compartilhados e reexecução dirigida de filtros/navegação, estados F02, acesso Demo/Sammya e financeiro geral. Não é autorização para merge e não há fusão de branches nesta tarefa.

O campo as_of_date é metadado aditivo: não remove nem altera os quatro valores existentes do resumo. Evita usar o calendário do navegador para rotular/linkar uma janela de vencimentos calculada no fuso do servidor. Os valores de próximos vencimentos serão lidos de summary.due_7_days_cents, sem duplicar a soma no Dashboard.

Diagnóstico adicional: status=open exclui títulos parcialmente pagos. Será acrescentado o alias status=pending (open + partial), mantendo inalterados open, partial e overdue. É necessário para que o atalho de saldo pendente corresponda ao conjunto exibido. O filtro settled existente representa o timestamp de quitação integral do título; será rotulado dessa forma, sem redefini-lo como data de cada baixa. Consultas de realizado usarão o livro caixa, por posting_date.

FinancePlanning mantém o import de financialDashboard.css na posição histórica para preservar a ordem da cascata. Somente os imports exclusivos do Dashboard extraído foram removidos; as funções de relatórios e OFX permanecem byte a byte iguais. Os estilos novos têm escopo .silex-financial-dashboard e mídia screen; estilos de impressão não são alterados.
