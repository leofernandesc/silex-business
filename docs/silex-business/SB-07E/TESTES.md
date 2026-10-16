# SB-07E — cobertura integrada e resultados

Seleção proporcional ao risco: todos os unitários frontend/backend, inventário das26 superfícies, fluxos operacionais essenciais, famílias financeiras, datas/Modal em dois motores, regressões de sessão/perfis, amostras de reflow e zoom. Não repetimos a matriz completa336 do SB-07D, preservada por hash junto ao produto; a coleta atual revalida156 estados e testes específicos. Não há mudança de produção a comparar: cópias baseline/candidata servem os mesmos bytes aprovados.

| Rodada | Resultado | Evidência |
|---|---|---|
| TypeScript / build Vite | Aprovados | technical-typescript.json e logs |
| Frontend unitário |121/121 | frontend.log |
| Backend completo |69/69; aviso preexistente Starlette/httpx | backend.log |
| Navegação/Home/modais/público/datas |37/37 Chromium | e2e-results.json |
| Seleção operacional/financeira/acessibilidade |47/49; **duas falhas de pré-condição caixa fechado** | functional-results.json, functional.log |
| Suite app original em fixture nova |9/9, incluindo os dois casos anteriores, sem mudar asserções | app-fresh-results.json, pré-condições de caixa |
| Datas compartilhadas Firefox |18/18; três locales×três fusos, calendários/Modal1440/768/375/320/291, inválidas/parcial/vazio/required/limites/mensal | date-firefox-results.json |
| Datas Chromium |7/7 selecionados: en-US/UTC, parcial/inválida, controle/disabled/readOnly, Modal375/320, mensal | date-chromium-results.json |
| Cabeçalho/menu Firefox |5/5:24 telas, sete larguras, nomes longos/perfis e texto ampliado | header-results.json |
| Sessão expirada |3/3, já incluídos nos37, não somados novamente | tests-summary.json identifica nomes exatos |
| Financeiro de leitura |35 JSON equivalentes | financial-equivalence.json |
| Exports/impressão |30 respostas iguais; inventário ampliado31 saídas | export-equivalence.json, output-dates.json |
| Operações reais descartáveis |17 checkpoints pareados iguais | financial-flows.json |
| Superfícies |130 estados normais +20 texto200 +6 extremos; documento contido em156 | surfaces.json |
| CSSOM/importações |8 percursos pareados, ordem e hashes idênticos | css-order.json |
| Zoom nativo Firefox |14 estados,200/400, viewport640/320,DPR2/4,CSSzoom1; sem excesso horizontal | native-zoom.json |
| Ponteiro nativo no calendário |2/2 aberturas200/400; clique Playwright falha, XTest entrega evento e abre | pointer-diagnosis.json |
| Estabilidade |V01:90/90; T01:15/15 sondas; mantidos em acompanhamento | v01-navigation.json, t01-public.json |
| Segurança básica |12 verificações401/403/200, flags sem cookies; npm audit0 alertas nesta consulta | auth-safety.json, npm-audit.json |
| Integridade/recuperação |493 arquivos originais restaurados em temporário; produção preservada | preservation-test.json, restoration-test.json |

## Duas falhas originais preservadas

O primeiro lote37 inclui um teste de Modal que fecha o caixa administrador. Reutilizar sua base para o lote funcional fez os casos `app.spec.ts:169` e`:403` falharem ao esperar recibo/Finalizada. O DOM mostrava **“Seu caixa está fechado”** e **“Abra seu caixa antes de finalizar”**. `cash-precondition-after-modal-batch.json` comprova ausência de caixa. Não é correto aprovar essa rodada ou atribuir causalidade a uma mudança de produto inexistente.

Foi criada nova fixture do código aprovado, independente, com caixa aberto comprovado por `cash-precondition-fresh-app-fixture.json`. A suiteapp completa9/9 passou sem modificar assertions, valores ou regras. Os resultados originais permanecem, sem retries. A dependência entre suites é uma limitação do instrumento, registrada comoQ01. Risco do fluxo comercial real não foi reproduzido quando sua pré-condição estava atendida.

## Limitação Playwright/Firefox e diagnóstico de ponteiro

Há incompatibilidade histórica Playwright1.64/Firefox155 na interceptação `page.route`. Testes que a exigem usam Chromium existente/Brave, em perfis temporários. A tentativa inicial de reabrir calendário com `.click()` sob zoom nativo expirou; o log e JSON inicial foram preservados. O ensaio de teclado foi separado, não descrito como aprovação desse clique.

O diagnóstico dedicado200/400 registrou geometria, `elementFromPoint`, eventos de ponteiro e uso real X11. O centro do botão continha seu SVG; Playwright não entregou `pointerdown`, enquanto XTest entregou no alvo e abriu o popover nas duas escalas. Não foi necessária mudança no produto. Os dados não isolam a versão exata responsável pelo protocolo; confirmam a diferença entre instrumento e ponteiro nativo.

Em400%, altura CSS disponível226px: o calendário não mostra todo conteúdo simultaneamente e usa rolagem vertical interna. O JSON inclui dimensões/teclado; isso não equivale a homologação humana ou assistiva completa. Impressão do recibo foi exercitada em mídia print, não em impressora física; exportações verificadas como arquivos/respostas, não homologadas em todos os leitores de planilha.

## Financeiro e permissões

Checkpoints exercitam receitas/despesas,12345centavos, baixa parcial com juros/multa/desconto, idempotência, baixa integral, estorno parcial/final, cancelamento e confirmaçãoOFX manual. Contas/saldos/status/datas/IDs são comparados; timestamps/auditoria gerados não são artificialmente igualados. Serviços/vendas/estoque/recibo e geração de títulos também são exercitados no app9/9. Pagar/Receber cobrem baixa/comprovantes/recorrência/filtros/CSV/print; Dashboard cobre6 indicadores/12 meses/classificações/contas/erro/atalho; Conciliação cobre seleção/importação/revisão/sugestões/estados/permissões.

As três expirações originais rodam em SQLite temporário com manifesto compatível, não por mock de autenticação. Restrições admin/operador verificadas em menu/URL e backend; ocultação visual não foi tratada como autorização suficiente. A página pública não consultou APIs privadas nas sondas. Não é pentest completo nem teste de carga/estabilidade prolongada.
