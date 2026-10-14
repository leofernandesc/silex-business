# Arquitetura — SB-05.2

## Escopo e implementação

FinancePage permanece em finance.tsx, com o mesmo estado/filtros/presets/handlers e consultas. A apresentação recebe um contêiner `silex-accounts`, import de accounts.css, botão próprio para neutralizar Nova despesa e reutilização de LedgerDateField/LedgerTable. As duas rotas já existentes continuam montando esse componente com direções fixas distintas.

Não houve extração/refatoração de lógica. O diff original de finance.tsx tem 29 linhas: 15 adições/14 remoções. As 291 chamadas, 56 handlers, 78 atributos nativos/valores e dois arrays de cabeçalhos são equivalentes estruturalmente. Estado/filtros/presets e implementações de comprovantes/cancelamento/configurações permanecem byte a byte iguais. API, App, UI.tsx, styles.css e helpers monetários/datas não foram editados.

## Reutilização sem alterar o SB-05.1

LedgerDateField e LedgerTable já existem no SB-05.1. Apesar dos nomes históricos, são componentes de apresentação sem consultas ou cálculos financeiros. Seus arquivos e CSS original permanecem iguais. LedgerDateField preserva o input filho, ISO, handlers/required e fornece aria-describedby/lang + texto dateOnly. LedgerTable delega para Table existente, preservando tabindex e cabeçalhos; ResizeObserver mostra a indicação apenas se há overflow real.

Reutilização na listagem (sete colunas) e no histórico (seis colunas). Não ocultar colunas nem converter tabela em cartões. Ações e condições de open/partial/paid/canceled, vínculo com venda, comprovantes e estorno são exatamente as anteriores.

## CSS delimitado

accounts.css usa somente media screen e seletores descendentes de `.silex-accounts`. A folha existe no bundle operacional, mas não possui seletores genéricos que alcancem outros módulos. Sem redesenho do shell ou impressão.

Tipografia/tamanhos/espaçamentos/raios/sombra do design system; filtros em quatro colunas desktop, duas tablet e uma celular. Controles usam a largura disponível, campos nativos mantidos. Tabs quebram em linhas, tabela rolável mantém numerais tabulares e ações. Cadastro/baixa/histórico/cancelamento/configurações existentes herdam apenas a apresentação delimitada dessa tela. Nenhuma biblioteca nova. Container queries limitadas a esta tela respondem à largura efetiva com zoom; unidades em permitem que os indicadores reorganizem suas colunas com texto ampliado. Correção de contenção testada sem alterar dados ou componentes compartilhados.

P02 usa `:focus-within` no wrapper, porque seu input legado tem outline/borda zero: contorno sólido de 2 px azul médio com afastamento de 3 px, sem depender apenas de cor da borda. Inputs textuais mostram indicação também após clique, comportamento adequado ao controle; outros controles locais usam focus-visible. A aplicação não cria estados de erro/disabled inexistentes para a busca.

## Datas e ações

P05 parcial: quatro campos por fluxo (De/Até e Vencimento/Competência no cadastro) exibem conferência dd/mm/aaaa. Table/histórico já usam dateOnly brasileiro. Native date continua dependente do navegador/OS; contratos/persistência/fuso/validação não mudam. Print backend usa ISO e nome legado, preservado por restrição de templates. Padronização integral requer proposta/validação separada.

P06: Nova despesa secundária em Pagar; Nova receita primária em Receber; Quitar/Nova baixa e histórico continuam ações neutras; Cancelar/Estornar mantêm danger e confirmações/restrições anteriores. Ledger do SB-05.1 intacta. Dashboard e outros módulos não foram examinados para rebranding de ações neste incremento.

## Limites conhecidos

Não há edição direta ou exclusão de títulos: não existe formulário de edição a capturar. O cadastro e os diálogos de baixa/histórico/cancelamento demonstram as operações disponíveis. UI de recebimento mantém os rótulos legados do formulário compartilhado. Busca/filtros de beneficiário em Receber ainda consultam fornecedores; Período por Lançamento corresponde a due. Ambos registrados para decisão futura, sem correção funcional incidental.

P01, P04, P07 e P09 permanecem em acompanhamento. Cores legadas de textos/badges financeiros conservadas; a auditoria compara novas falhas com o baseline, sem declarar correção global de contraste. Novos textos/foco utilizam tokens legíveis. Não alterar permissões para tornar ações disponíveis.
