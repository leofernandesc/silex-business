# Pendências da Silex Business

Registro central a partir do SB-03. A origem detalhada permanece no [relatório histórico SB-02.3](SB-02.3/PROBLEMAS.md), que não foi alterado. Aprovar um incremento não autoriza corrigir todos os itens desta lista.

| ID | Descrição | Gravidade | Estado atual | Incremento proposto | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| P01 | Modal operacional não retorna foco ao acionador após Escape | Média | Pendente, comportamento preservado | Incremento próprio de componentes, a aprovar | Abrir/fechar todos os diálogos por teclado, devolver foco ao acionador conectado e manter contenção/handlers |
| P02 | Busca de Pagar/Receber sem marcador de foco | Média | Pendente: telas fora do SB-05 etapa 1; foco de Lançamentos revalidado separadamente | Próxima etapa financeira, a autorizar | Wrapper/controle com foco visível e contraste adequado nas três larguras, sem alterar busca/Enter |
| P03 | Menu móvel abre sem transferência de foco e permite sair para conteúdo encoberto | Média | **Corrigida e validada no SB-03** | SB-03 | Inicial no Fechar menu, Tab/Shift+Tab contidos, submenus acionáveis, Escape/fechar/backdrop devolvem foco; painel fechado inert; desktop sem contenção |
| P04 | Contrastes legados em textos, bordas e controles | Média | Pendente | SB-05/06 por módulo, a aprovar | Comparar contrastes/estados sem perder semântica financeira ou densidade |
| P05 | Datas nativas variam conforme locale do navegador | Baixa | Parcial em Lançamentos: conferência dd/mm/aaaa; input nativo/ISO preservados; aparência do editor ainda depende do navegador | Editor uniforme e outras telas, a autorizar | Apresentar dd/mm/aaaa preservando valores ISO, bases e regras; testes de datas |
| P06 | Nova despesa primária; protótipo aprovado prevê secundária/neutra | Baixa | Corrigida somente em Lançamentos no SB-05 etapa 1; Contas a Pagar permanece pendente | Próxima etapa financeira, a autorizar | Hierarquia neutra, criação preservada, estorno mantém semântica distinta |
| P07 | Repetição de seletores e consumo parcial de tokens | Baixa | Pendente | Migração por componente em SB-05/06 | Diff pequeno, tokens definidos, comparações sem regressão; sem limpeza global incidental |
| P08 | Grupo/atalhos financeiros incoerentes com permissão do operador | Média | **Corrigida e validada no SB-03** | SB-03 | Menu e guard usam registro único; operador não vê financeiro/admin; todos os destinos restritos negados; backend responde 403 e impede mutação |
| P09 | Controles densos menores que referência de 44 px | Baixa | Pendente de decisão de densidade | Revisão por módulo em SB-05/06 | Homologar alvos de toque sem ocultar informações e ações, três larguras |

P03/P08: evidências e critérios em [SB-03](SB-03/RELATORIO.md) e [matriz de testes](SB-03/TESTES.md). A validação de ARIA por DOM/teclado não equivale a homologação com leitor de tela real.

R01, contraste do contorno de foco, foi corrigida e validada no SB-02.3 e permanece preservada. A identidade empresarial continua separada da marca fixa do produto. Multitenancy não existe nos contratos atuais e não é adicionado por esta lista.

## SB-05 — etapa 1

Escopo exclusivo Lançamentos. P02 original está em Pagar/Receber e não foi encerrada. P05 tem conferência brasileira aditiva sem substituir os inputs nativos ou alterar regras; permanece parcial. P06 é neutra em Lançamentos e ainda não mudou em Pagar. Evidências finais e limites em [TESTES-ETAPA1.md](SB-05/TESTES-ETAPA1.md). Nenhuma outra pendência foi corrigida incidentalmente.
