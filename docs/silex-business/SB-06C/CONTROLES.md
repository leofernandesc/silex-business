# SB-06C — controles, áreas de acionamento e densidade

O inventário por rota, largura, estado e seletor está em `target-inventory.json`. O tamanho medido é o retângulo clicável do botão/controle, não o SVG interno. Controles de mesmo significado dentro de labels são avaliados como alvos compostos. As três larguras principais e 320 px foram verificadas; o menu aberto também tem coleta própria.

| Família | Antes | Candidata desktop | Candidata móvel | Decisão |
| --- | --- | --- | --- | --- |
| Edição/ações em `.row-actions` | ~33 px; variantes financeiras já maiores | mínimo 36 × 36 | mínimo 44 × 44 | Mesmos botões, nomes, ações e colunas |
| Paginação compartilhada | 30 × 30; financeiras já 44 | mínimo 36 × 36 | mínimo 44 × 44 | Disabled e callbacks intactos |
| Fechar diálogo | 30 × 30; alguns com altura 44 e largura 30 | mínimo 36 × 36 | mínimo 44 × 44 | Não altera X/Escape/retorno de foco |
| Menu móvel: itens, grupos e fechar | ~30–36 px | Desktop preservado | altura mínima 44 até 900 px; fechar também largura 44 | Rolagem vertical existente conserva acesso a todos os módulos permitidos |
| Ações do título/formulário | ~32–35 px em vários módulos | Densidade anterior preservada | altura mínima 44 até 650 px | Flex/wrap existente preserva os controles |
| PDV: remover item/quantidade | ~34 px | Remover mínimo 36 | Remover mínimo 44 × 44; quantidade altura mínima 44 | Ícone mantém dimensão, alvo cresce; sem mudar quantidade/preço |
| Checkbox de Clientes | visual 16 × 16; label com 22 px de altura e largura 237–307 px | Preservado | Preservado | Label associado é clicável; a amostra não tem colisão com alvos adjacentes. Não é falha só por medir menos de 24/44 |
| Controles densos restantes | Em geral ≥24 e <44 | Preservados quando sem defeito demonstrado | Inventariados | Não impor 44 px universalmente. Validação de toque físico e popups nativos permanece limitada |

## Limites

O algoritmo de círculos de 24 px é triagem geométrica, não homologação global de todas as exceções WCAG. Não executa ações por engano para medir espaçamento. Todos os alvos pequenos e labels exigem interpretação de contexto. O inventário inclui controles desabilitados, mas eles não entram na contagem de falha de alvo ativo.

Não foram ocultadas colunas, substituídas tabelas por cartões ou deslocadas ações para novos menus. Não foi aplicado `overflow-x:hidden` ao documento. As tabelas conservam rolagem interna e a última coluna foi exercitada no teste novo. Estilos ficam sob `@media screen`, sem modificar impressões.

O conforto de toque em equipamento físico e o comportamento de seletores nativos não são comprovados por um retângulo no DOM. P09 deve ser revisada considerando essas limitações, sem declarar conformidade global por uniformizar botões.
