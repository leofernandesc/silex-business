# Arquitetura e preservação — SB-05 etapa 1

## Fontes alteradas

LedgerPage permanece em ledger.tsx. O diff existente é pequeno e delimitado: classe silex-ledger, botão secundário próprio, wrappers visuais de datas/tabela, rótulo Entrada/Saída e marcadores para estilos dos diálogos. Não foram extraídos estados, consultas ou handlers financeiros.

ledgerPresentation.tsx oferece LedgerDateField e LedgerTable. DateField recebe o input original como filho, preserva value/onChange/required/min/max e acrescenta lang/descrição; reutiliza Field sem modificar sua API. Texto brasileiro vem do dateOnly existente, sem interpretar timestamps ou usar fuso. Não valida/converte digitação para outro modelo, não cria campos textuais e não muda API.

LedgerTable delega para Table original dentro de uma região própria. ResizeObserver mede overflow real e mostra/retira instrução; conecta aria-describedby apenas na table-wrap dessa instância. Mantém tabindex e navegação por setas existentes. Table/ui.tsx continuam byte a byte iguais. ResizeObserver é disponível nos navegadores modernos do projeto; não há dependência/polifill novo.

ledger.css usa tokens existentes somente sob media screen e classes próprias; os seletores dialog:has(.silex-ledger-form) correspondem só aos marcadores dos diálogos de Lançamentos. Não há override do shell, styles.css ou outros módulos. Conteúdo operacional continua claro; valores usam numerais tabulares, alinhamento à direita, semânticas receita/despesa distintas e rótulos textuais. Quantidade/sinal/formatador monetário permanecem iguais.

## P02, P05 e P06

P02: ausência original do contorno em .input-with-icon pertence a Contas a Pagar/Receber, não a LedgerPage. Seu conserto exigiria outra tela/escopo, portanto permanece pendente de autorização. O foco existente de Lançamentos foi revalidado e recebe regra local coerente com o azul médio; não declarar P02 globalmente corrigida.

P05: tabelas/indicadores já usam dateOnly brasileiro. Inputs nativos ainda podem mostrar mm/dd/yyyy no Firefox mesmo com lang pt-BR. A indicação brasileira abaixo de cada campo é controlada pelo app e conserva o mesmo ISO. Aplicada somente aos quatro campos de Ledger (De/Até/Lançamento/Competência). Não declarar editor uniformemente brasileiro: DateField textual/calendário uniforme exige outra decisão e validação, conforme SB-01. Sem novas restrições ou alterações de datas.

P06: Nova despesa neutra somente no livro caixa; Nova receita primária azul; Estornar mantém danger/condições de acesso. Contas a Pagar não foi redesenhada. As ações são as originais.

## Regras e impressão

O módulo atual permite criar lançamento e estorná-lo, preservando histórico. Não possui edição direta de um movimento efetivo. Não acrescentamos Editar; testes cobrem criar, aplicar critérios e estornar operações existentes.

Comparação sintática/estrutural dos ASTs confirma as mesmas 84 chamadas críticas e 31 handlers de eventos. Estado/filtros anteriores ao return, seis cabeçalhos e template ledger-print permanecem iguais; print é conferido também por navegador/CSV, com critérios applied. API payloads, request_key, parseDecimal, money, condicionais de ações e regras financeiras permanecem. Backend/contratos/autenticação/permissões/finance.tsx/financePlanning.tsx/financeCatalog.tsx não alterados.

Presets continuam aplicando intervalo sobre filtros já aplicados; campos ficam em draft até Pesquisar/Enter. Paginação/tamanho/conta/status/origem/comprovantes/competência e exportação conservam os mesmos nomes de query e respostas.

## Diferenças do protótipo D

Sem faixa de estudo ou dados fictícios na aplicação real. Capturas usam fixture fictícia isolada, com registros/saldos reais dessa fixture. Mesmos indicadores, saldo de contas, quatro colunas de filtros no desktop, todas as colunas e ações, mas calendário nativo mantido com legenda brasileira adicional. Não inserimos Enviar, edição ou integrações não existentes. O título/template de impressão legado foi preservado por restrição expressa.

## Proteção

Baseline Git 61c744f confirmado limpo em feat/sb05-financeiro. Cópias via git archive não incluem data/ de produção. Backup externo de 61 arquivos frontend e manifesto completo anteriores; ensaio inicial/final de recuperação. Históricos/evidências antigos não editados. Builds/tsbuildinfo e SQLite ficam nas cópias temporárias.

Nenhum push, merge, deploy ou subincremento seguinte. Somente após revisão deste pacote discutir P02 de Pagar/Receber, editor uniforme P05 e outras telas.
