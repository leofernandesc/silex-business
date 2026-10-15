# Preparação para SB-05.3B — sem implementação

O Dashboard Financeiro pode receber um incremento visual separado após aprovação do SB-05.3A. Sua função FinanceOverview e estilos atuais permanecem intactos.

1. Registrar novo baseline e capturas com períodos/dados equivalentes, incluindo valores elevados, negativos e zero.
2. Aplicar wrapper e CSS próprios; preservar SummaryCard/Table, filtros ISO e os cálculos da API. Avaliar legibilidade dos seis indicadores em áreas estreitas e texto ampliado; aproveitar as decisões de valores inteiros do SB-05.2 sem importar seus seletores indiscriminadamente.
3. Revisar barras dos 12 meses, legendas, cores, descrição textual e teclado. Não criar novos gráficos/indicadores, alterar períodos ou recalcular resultados no cliente.
4. Distinguir visualmente movimentos do intervalo, resultado por competência, títulos em aberto e saldo atual. A API atual não limita todos os indicadores ao mesmo período; a apresentação deve explicar a semântica existente, sem mudar o contrato.
5. Verificar tabela por classificação/grupo e saldo por conta com rolagem interna quando necessária. Preservar todos os valores, colunas e ação Abrir livro caixa.
6. Manter acompanhamento de V01. Nesta etapa foram 60/60 cliques direcionados aprovados; só propor correção de navegação após reprodução e diagnóstico causal, com autorização específica.
7. Tratar R02 em incremento do shell aprovado separadamente. Não declarar reflow completo enquanto o transbordamento em 187 px CSS permanecer.
8. Validar estados, datas, foco/contraste, três larguras, autorização e regressões financeiras. Backup, manifestos, comparação de handlers e evidências devem continuar acompanhando cada entrega.

Decisões que ainda precisam de autorização: iniciar SB-05.3B e seu escopo; mudanças funcionais para erros/expiração no upload OFX; retorno de foco P01; correções globais P04/P07/P09/R02. Nenhuma dessas atividades foi iniciada no código de produção.
