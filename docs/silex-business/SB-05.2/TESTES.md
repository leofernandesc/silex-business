# Testes e limites — SB-05.2

## Ambiente e baseline

Baseline SB-05.1 aprovado: 5e745062, fonte arquivada por Git. Estado inicial limpo/fsck aprovado; 59 testes frontend e build/TypeScript iniciais passaram. Sem banco ou dados reais nas cópias de teste. Fixture mestre usa seed fictício, lançamentos SB-05 existentes para regressão e 26 títulos ilustrativos de cada direção, criados pela API original, com exemplos pagos/parciais/cancelados/vencidos. As capturas registram 38 títulos a pagar e 50 a receber, incluindo títulos originados por seed/lançamentos. Não são registros empresariais reais.

Baseline/candidate recebem a mesma fixture; functional recebe cópia separada para operações. Backend pytest usa suas fixtures temporárias. Builds, tsbuildinfo e comprovantes ficam em /tmp. Nenhuma migração, seed ou ação de testes sobre data/ do checkout.

## Matriz e resultados

Resultados numéricos/status finais em tests-summary.json, test-matrix.json/CSV e logs finais do pacote. A revisão cobre:

- TypeScript do projeto e checagem estrita adicional do novo E2E.
- Vite, suíte frontend (65 testes em dez arquivos, seis novos) e backend (69, warning anterior Starlette/httpx).
- 45 cenários específicos: sete por módulo mais um de operador, nas três larguras; as duas localizações de data contam separadamente.
- Suítes herdadas app, ledger-interface, public, home e navigation, com 132 cenários adicionais; matriz registra qualquer falha/skip, sem ocultar tentativas.
- 37 respostas HTTP idênticas entre fixtures: listagens/estados/datas/beneficiário/paginação, consultas operacionais, CSV/print e autorização admin/operador.
- Preservação AST de 291 chamadas, 56 handlers, 78 atributos/valores e dois arrays de cabeçalhos; trechos financeiros byte a byte.

## P02 e responsividade

Tab a partir do seletor Buscar por leva ao campo Busca. Wrapper exibe outline sólido 2 px, offset 3 px, azul médio; código existente borderless do input preservado. A asserção verifica foco real, não somente existência da regra CSS. As seis combinações das duas telas/1440/768/375 são verificadas com busca/Enter funcionando.

Os sete presets e seis filtros de situação têm seus limites horizontais conferidos, todos disponíveis e sem overflow involuntário. Tabela mantém sete colunas e acesso por setas/scroll à última coluna, com descrição aria quando precisa rolar. Cadastro/histórico e baixa mantêm tabela/diálogos existentes.

## Fluxos confirmados

Busca draft/applied, documento, períodos/competência, erro de intervalo invertido, estados open/partial/paid/canceled/overdue, tipo fixo disabled, ID decrescente e paginação 20/100 (50 preservado no contrato/controle). Não existe UI de ordenação nem edição/exclusão direta de título: nenhum fluxo ausente foi criado.

Cadastro conserva ISO/centavos/cliente ou beneficiário, PIX em campo readOnly, recorrência e mensagem de erro monetário. Baixa parcial de R$40 com R$2 juros + R$1 multa − R$0,50 desconto resulta em R$42,50 líquido, principal restante R$60; asserções de payload/resposta são da API inalterada. Estorno restaura principal, histórico original/oposto permanece; quitação integral e cancelamento conservam estados/auditoria. Comprovante fictício PDF anexado pelo controle existente. Totais/indicadores atualizam conforme servidor, sem calcular nova regra no frontend.

Operador não monta Pagar/Receber por URL e não recebe atalhos na Home; backend GET/POST financeiro responde 403. CSV e print usam critérios aplicados mesmo com texto draft diferente. Template backend legado permanece idêntico e ISO; não é declarado brasileiro por esta etapa.

## Datas, contraste e acessibilidade

pt-BR/en-US nas mesmas três larguras: 10/01 versus 01/10, 29/02/2024, vazio e required. Inputs continuam type=date e value ISO; quatro campos têm descrição acessível brasileira. Nenhum parser textual, regra de fuso ou mudança de vencimento. Editor do navegador e impressão mantêm limitações P05.

105 capturas finais: 42 baseline, 63 candidato (42 comparativas + 21 de sete telas preservadas). Capturas fictícias, fonte Inter carregada, sem JS errors/overflow. Auditoria textual compara os mesmos recortes: 624 falhas amostradas anteriores, 612 candidatas e **zero novas falhas**. As repetições por linha/resolução contam como ocorrências. P04 não foi corrigida globalmente; badges/metadata legados permanecem em acompanhamento.

P01 retorno de foco em Modal não corrigido; não declarar gerenciamento integral de foco resolvido. P07/P09 preservados. Leitor de tela real/dispositivos físicos não executados. Além das suítes herdadas, 18 verificações próprias cobrem foco, CSS zoom 200% e duplicação calculada dos tamanhos de texto em ambas as telas/três larguras. Contorno de foco medido: 4,974:1. Não equivale a certificação de zoom nativo/leitor de tela/dispositivo real.

## Tentativas e ajustes de teste

1. Fixture inicial selecionou primeiro cliente sem filtrar ativo; API recusou Cliente inativo. Ajustado somente script da fixture e recriada base temporária incompleta. Captura tentada antes do servidor disponível falhou por conexão; log preservado localmente.
2. Probe AST inicial incluía novos props value dos wrappers junto aos atributos nativos; corrigido para comparar valores de inputs/selects/textareas, além de todos os calls/handlers/headers. Navegação estrutural corrigida para percorrer todos os filhos. Nenhuma alteração financeira necessária.
3. Captura inicial de Receber/375 foi feita durante Carregando registros; espera explícita por fixture/listagem pronta foi adicionada. Capturas válidas substituem a comparação; registro anterior permanece local.
4. Primeiro E2E parou em Buscar por com label exato, que inclui texto de opções: 1 falha/1 interrompido/43 não executados. Seletor ajustado no teste. Smoke: 3 passaram/1 falhou por assumir 2 páginas em Receber (a fixture possui 3); expectativa passou a derivar do total real.
5. Rodada seguinte: 42 passaram/3 falharam somente na asserção PIX de Pagar: textContent não contém value do input readOnly. Corrigida para Chave PIX/toHaveValue, sem editar componente de PIX.
6. Ampliação de indicadores em 768 px mostrou overflow de 840 px no baseline e 869 px no candidato, para viewport 768. Correção apenas em accounts.css: contenção/queries e tamanhos em, sem modificar SummaryCard. Revalidação passou nas 18 combinações de foco/zoom/texto.
7. Rodada final em nova cópia funcional da fixture; resultados completos em accounts-e2e-results.json e regression-e2e-results.json. Logs/traces antigos completos mantidos localmente; ZIP contém resultados e evidências finais necessárias.

Home/navigation antigos possuem guards específicos de /tmp do incremento original. Somente nas cópias temporárias foram adaptados ao prefixo SB-05.2; o clique original e as demais asserções foram mantidos. Asserts/fluxos/handlers financeiros e fontes operacionais não mudam. Diffs próprios acompanham o pacote. Nenhum ambiente antigo foi usado para expirar sessões ou operar dados.

## Observação de regressão de navegação

Primeira suíte herdada: 131 aprovados e uma falha no clique Abrir livro caixa (tablet), permanecendo em finance-dashboard. Repetição inicial: baseline 5/5 aprovados; candidato funcional 4/5 aprovados. Baseline com snapshot dos mesmos dados funcionais: 10/10 aprovados. Isso não comprova a origem da falha; não classificá-la automaticamente como problema anterior ou causado pelo CSS novo. FinancePlanning/App/roteamento/permissões estão preservados, e as regras accounts.css não alcançam esse Dashboard. Logs/tentativas são mantidos; a rodada final é informada na matriz. Nenhuma correção de navegação foi implementada fora do escopo.

Foi preparada uma espera de fonte/layout em um script de adaptação, mas um erro de indentação fez com que ela não fosse aplicada ao navigation.spec.ts. A comparação de hashes final detectou o erro no registro dos adapters; script corrigido para registrar exatamente os dois guards efetivamente utilizados, sem modificar as cópias testadas. A repetição final manteve o clique original e as mesmas asserções, sem espera adicional. Capturas confirmam Tudo selecionado por teclado para evitar registrar um recorte diferente do pretendido; nenhuma ação financeira é modificada pela captura.

**Rodada final após contenção, com clique original:** 45/45 novos + 132/132 herdados = 177 E2E aprovados, sem skips/retries. Isso confirma a rodada executada; não determina retrospectivamente a causa do clique perdido anterior, que permanece documentado.
