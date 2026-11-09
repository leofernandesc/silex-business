# Início, navegação e validação funcional da DRE

Base publicada informada pelo proprietário: `cc7d9836649566211809270b286e6c62422f10d5`, PR #18. Branch isolada: `fix/dre-navigation-home-refinement`. Código funcional e testes iniciais: **`474fa6808f6b6a1c0a2d32c1072a9230bed71b27`**; o commit seguinte arquiva este documento/evidências. Um ajuste posterior somente de teste valida também a URL canônica nos atalhos do Início, sem mudar produção. O HEAD remoto final e os resultados posteriores do CI ficam nos checks e na descrição do novo Draft PR empilhado, evitando commits circulares de evidência.

**Entrega para revisão, não publicada.** Sem acesso à Railway, à Sammya ou a bancos persistentes; sem merge, migração persistente, mudança de usuário/senha, main ou referência de publicação. A informação sobre a versão online é do proprietário, não uma confirmação por consulta à instância.

## 1. Problemas e decisão de navegação

O resumo de serviços usava um `dl` sem layout específico: no controle negativo da base o display computado era `block`, não uma grade, com números pouco destacados. A correção preserva o mesmo `homeServiceIndicators` e os mesmos dados do endpoint `/dashboard`: três mini-cards, números destacados, labels legíveis, bordas/fundo/tipografia dos tokens existentes e três colunas em desktop, tablet e celular. Zero verdadeiro continua zero; contagens indisponíveis continuam `—`; operadores não recebem o bloco administrativo.

A DRE não tinha destino próprio no registro de rotas/sidebar. O catálogo contém **26 outros relatórios financeiros**, portanto eles foram mantidos. O início da seção Financeiro agora é:

1. **Visão financeira**: saldos, movimentos e vencimentos.
2. **DRE gerencial**: resultado por competência econômica.
3. **Relatórios Financeiros**: os demais 26 relatórios, com acesso também pela seleção já existente.

O link destacado dentro da Visão financeira foi removido. Não há segunda DRE: ambas as entradas reutilizam o mesmo componente e os mesmos endpoints. O registro passa de 26 para 27 identificadores de rota, incluindo os aliases antigos; isso não significa criar um novo módulo financeiro.

Destino canônico: `/app?dre_view=dre&dre_start=AAAA-MM-DD&dre_end=AAAA-MM-DD#finance-dre`. O menu simples `/app#finance-dre` recebe o período civil padrão de America/Manaus. Links anteriores com `dre_view=dre` em `#finance-reports` continuam válidos e convergem para a rota nova; `#finance-reports` sem esses parâmetros continua abrindo os relatórios comuns.

Breadcrumb, título e item ativo mostram **DRE gerencial**. A seleção permite voltar a qualquer relatório, inclusive Orçamento x realizado, mantendo o período aplicado. Voltar/Avançar, reload, item ativo, menu móvel e foco foram exercitados. A URL válida prevalece na restauração do histórico; controles ainda não enviados não alteram o período confirmado.

A chave do contêiner principal permanece compartilhada **somente entre DRE e Relatórios**, preservando a seleção/período dessa tela reutilizada. As demais páginas mantêm sua estratégia anterior de reset. O backend continua autorizando os endpoints: a rota DRE exige administrador; operador é recusado com 403 e visitante com 401 na API. Nenhuma autorização por username ou capacidade de transporte foi criada/removida.

## 2. Diagnóstico funcional: por que pode não aparecer valor

**Não foi reproduzido defeito de cálculo ou ocultação de valor elegível no fluxo sintético válido.** Não é possível atribuir uma causa específica ao banco publicado sem consultá-lo; isso não foi feito. Os resultados comprovados permitem orientar a verificação do período e da configuração com o usuário:

| Cenário | Reprodução real em SQLite descartável | Resultado esperado/observado |
|---|---|---|
| A — Sem fontes elegíveis no período | Janeiro/2000 antes de cadastrar o serviço fictício. | Estado vazio, sem 16 linhas aparentemente quebradas nem zeros inventados. |
| B — Operação existente sem classificação | Serviço concluído com evidência e título de 500001 centavos, mas sem mapeamento DRE da categoria. | Uma pendência de classificação, nenhum fato reconhecido na rubrica; orientação e acesso ao Plano financeiro. |
| C — Fonte elegível, classificada e reconhecida | Prévia e confirmação de mapeamento Receita bruta para a vigência correta. Conclusão comprovada fornece a evidência de reconhecimento já prevista. | **Uma receita de 500001 centavos** visível na API e na interface. Não foi reproduzido o caso de dados suficientes escondidos. |
| Cobertura parcial | Mesma receita conhecida, sem provas para os demais componentes. | Receita visível; lucro líquido final `null`, não zero; mensagem de resultado parcial. |
| Cobertura completa | Estado mantido da implementação existente, com testes unitários e regressões da matriz principal. | Exige comprovações explícitas dos componentes; não é o estado inicial de uma empresa. Não criamos atestados no novo fluxo. |

Um título e seu recebimento **não bastam**, por si sós, para reconhecer todo fato econômico. Serviços usam a **data efetiva de conclusão comprovada**; receitas financeiras avulsas podem exigir revisão explícita da natureza/data/evidência. Vencimento e recebimento não substituem automaticamente a competência econômica. Serviços planejados e custos não incorridos não foram presumidos realizados.

O aviso pendente foi tornado acionável: depois de revisar/classificar, **gerar o relatório novamente**. Não há confirmação contábil automática, alteração retroativa silenciosa, preenchimento de CMV/tributos/depreciação ou transformação de desconhecidos em zero.

## 3. Fluxo sintético completo, pelo navegador

Jornada executada em **Chromium e Firefox, 1440 e 375 px**, usando formulários reais, backend real e fixture exclusiva por teste:

1. Abrir a DRE pela sidebar, aplicar 01/01/2000 a 31/01/2000 e comprovar o estado vazio.
2. Cadastrar cliente fictício pela interface.
3. Cadastrar serviço de **R$ 5.000,01**, data de serviço 10/01/2000.
4. Concluir com data efetiva 10/01/2000 e evidência fictícia. Confirmar que ainda não foram gerados títulos.
5. Gerar explicitamente **um** título de **500001** centavos, com competência 10/01/2000 e vencimento 20/01/2000, em conta bancária fictícia.
6. Aplicar o período econômico na DRE; verificar pendência de classificação.
7. Abrir o Plano financeiro pelo contexto da pendência. Selecionar Receita bruta, vigência janeiro/2000, justificativa fictícia, conferir a prévia e confirmar.
8. Voltar à DRE e gerar novamente. Conferir descrição autorizada, evidência de conclusão e receita de **500001**, com lucro final indisponível. A conclusão comprovada já atende ao reconhecimento automático previsto; a classificação não cria outra receita.
9. Registrar baixa parcial de **200001** centavos na data corrente da conta: principal restante **300000**. A receita econômica continua **500001**, em um só fato.
10. Estornar a baixa com motivo fictício. Os fatos econômicos continuam idênticos, e a ordem preserva o mesmo título/ID. Nenhum ajuste de cancelamento econômico foi presumido.

Cálculo independente: **500001 − 200001 = 300000** de principal pendente após a baixa. Esse saldo não é lucro nem uma nova receita. A assertiva do teste compara os fatos da DRE antes/depois do pagamento e do estorno por igualdade integral, além do valor conhecido na interface. **Zero confirmações de cobertura foram criadas** nesse fluxo.

A competência antiga é deliberada para separar as operações da fixture atual. A baixa usa a data corrente, respeitando a abertura da conta; a listagem de títulos usa “Tudo” para localizar o vencimento histórico. Isso não muda filtros ou regras da aplicação.

## 4. Arquivos alterados e preservação

| Arquivos | Alteração |
|---|---|
| `frontend/src/App.tsx`, `overview.css` | Classe/grade dos três KPIs; renderização da DRE pela nova rota; contexto compartilhado somente entre DRE/relatórios. |
| `frontend/src/navigation/routes.ts`, `useAppNavigation.ts` | Registro, ordem, permissões, alias e preservação do endereço do item DRE ativo. |
| `frontend/src/dreNavigation.ts`, `financialNavigation.ts` | URL canônica e preservação de datas civis/links anteriores. |
| `frontend/src/financePlanning.tsx` | Mesma tela de relatórios controlada pela rota, período aplicado e escolha do relatório preservados. |
| `frontend/src/financialOverview.tsx`, `dre.tsx` | Remoção do atalho destacado, título coerente e orientação curta para atualizar após revisão. |
| `frontend/tests/routeReadiness.ts` | Registro do GET real da DRE no helper geral; mapa tipado e falha imediata para destino sem endpoint. Mantidas as verificações de HTTP, tela e autorização. |
| Três testes unitários de navegação | Novo destino, aliases, datas, autorização, ordem e metadados de retorno. |
| `frontend/tests/dre-home-navigation.spec.ts` | Oito definições novas: card, zero/indisponibilidade, tablets, sidebar, autorização, histórico e ciclo real da DRE. |
| `frontend/tests/navigation.spec.ts`, `home.spec.ts` | Asserção específica e estrita da URL canônica com datas para a rota nova; endereços antigos continuam com suas asserções anteriores. |
| `frontend/playwright.integration.config.ts` | Inclusão dos novos casos na matriz existente. |

Nenhum backend, schema/API, migração, fórmula, parser monetário, CSV, histórico, anexo, autenticação ou guard especializado foi alterado. PRE-01 e os controles de transporte permanecem preservados. A primeira empresa continua exigindo instância/banco exclusivo; não se implementou multitenancy.

## 5. Testes efetivamente executados

Ambiente local: Ubuntu, Python 3.12, Node 22, dependências fixadas existentes; navegadores Playwright Chromium 156.0.8078.4 e Firefox 157.0. Servidores locais nas portas **8037/8038**; nenhuma requisição à instância publicada. Bancos SQLite temporários, com reset por caso.

| Execução | Resultado observado |
|---|---|
| Frontend completo | **336 PASS**, 24 arquivos (332 anteriores + quatro casos novos). |
| TypeScript / build | PASS. |
| Backend DRE dirigido | **21 PASS**, 13,98 s; um aviso preexistente TestClient/httpx. |
| Novo E2E, desktop/mobile | **16/16 Chromium e 16/16 Firefox**, sem retries/skips. |
| Ampliação dirigida, seis arquivos | **64 PASS / 2 FAIL em cada motor**; falhas da asserção antiga de URL no destino recém-adicionado, descritas abaixo. Não é chamada de bateria integral aprovada. |
| Reexecução da compatibilidade corrigida | **2/2 em cada motor**, subconjunto dos casos anteriores, não testes novos. |
| Atalhos reais do Início, admin/operador | **4/4 em cada motor**, casos existentes com a URL nova validada estritamente. |
| Helper geral corrigido: rotas, perfis, reflow, Axe, impressão/CSV | **46/46 Chromium e 46/46 Firefox**, zero falhas/skips/retries. Inclui casos já contados e não deve ser somado como cobertura nova. |
| Legados | **124 comparações / 26 relatórios, zero divergências** contra `cc7d983`. |
| Axe | Nenhuma violação nas telas exercitadas de Início e DRE conhecida/parcial; não é certificação WCAG ou teste com leitor real. |
| CI final | Resultado do HEAD final será vinculado na descrição/checks do Draft PR após execução. A matriz principal inclui **406 execuções por motor**; não atribuir resultados do PR #18 a esta candidata. |

As regressões dirigidas incluem reconhecimento, classificação, política histórica, cancelamento auditável, detalhes autorizados, CSV, mídia print e bloqueio de exportação da sessão anterior. O estado completo permanece coberto pelos testes herdados da matriz principal; o fluxo novo testa intencionalmente o estado parcial, sem fabricar coberturas.

Comandos executados na raiz:

```bash
npm test --prefix frontend
npm run build --prefix frontend
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_dre_homologation.py backend/tests/test_dre_api.py backend/tests/test_dre_service_completion.py backend/tests/test_dre_resilience.py -q
PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py --base cc7d9836649566211809270b286e6c62422f10d5 --output /tmp/silex-dre-home-legacy.json
```

Em `frontend/`, a primeira bateria nova usou um launcher temporário `dre-home.audit.config.ts`, importando a configuração de integração, limitando `testMatch` ao novo arquivo e preservando os dois projetos desktop/mobile. Instrumento removido da entrega. Comando executado:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers SILEX_E2E_PORT=8037 SILEX_DRE_HOME_EVIDENCE=/tmp/silex-dre-home-final-chromium SILEX_INTEGRATION_REPORT=/tmp/silex-dre-home-final-chromium.json SILEX_INTEGRATION_OUTPUT=/tmp/silex-dre-home-final-chromium-output npx --no-install playwright test --config dre-home.audit.config.ts
# Firefox: SILEX_INTEGRATION_BROWSER=firefox, porta 8038 e arquivos próprios.
```

Comandos reproduzíveis com a configuração versionada, também usados na ampliação/reexecução:

```bash
npx --no-install playwright test --config playwright.integration.config.ts dre-home-navigation.spec.ts
npx --no-install playwright test --config playwright.integration.config.ts dre-home-navigation.spec.ts dre-integration.spec.ts dre-review-fixes.spec.ts dre-release-ux.spec.ts predeploy-export-session.spec.ts navigation.spec.ts
npx --no-install playwright test --config playwright.integration.config.ts navigation.spec.ts --grep 'compatibilidade dos'
npx --no-install playwright test --config playwright.integration.config.ts home.spec.ts --grep 'atalhos .*todos os destinos'
npx --no-install playwright test --config playwright.integration.config.ts integration.spec.ts system-review.spec.ts commercial-a11y.spec.ts
# O padrão integration.spec.ts também seleciona dre-integration.spec.ts: 46 execuções em quatro arquivos.
# Para Firefox, prefixar SILEX_INTEGRATION_BROWSER=firefox; usar porta local livre.
```

### Falhas intermediárias, sem mascaramento

- O controle negativo da base falhou no layout do card: `block` em vez de `grid`. [Log](evidence/dre-navigation-home/baseline-card.txt).
- O primeiro helper móvel consultava visibilidade antes do shell estar pronto; depois, um helper supunha que os itens de grupos recolhidos existiam no DOM. Corrigidos os seletores/esperas usando breakpoint, estado modal e `aria-controls`; não se aumentaram timeouts. As execuções intermediárias interrompidas não contam como PASS.
- O teste de histórico detectou perda do relatório escolhido ao trocar as rotas novas: `main key={safePage}` recriava o contexto. Corrigida a chave somente para o par DRE/Relatórios, preservando as demais páginas. A seleção de Orçamento x realizado e os períodos antigos passaram depois da correção.
- O teste antigo de todos os hashes exigia `/app#<rota>` também para DRE. Agora, para o novo destino, exige **exatamente** os três parâmetros canônicos e as datas civis esperadas, conferidas com a data do servidor fictício; as asserções dos endereços antigos permanecem. As duas falhas por motor e as duas reexecuções aprovadas estão arquivadas, sem somar como uma bateria integral verde.

A varredura do patch binário codificado marcou um falso positivo em bytes base85 de uma captura PNG. A imagem foi preservada; a revisão do conteúdo real e a varredura do diff textual não encontraram credencial.

A mesma suposição de URL sem parâmetros foi identificada por revisão no teste dos atalhos do Início e ajustada apenas para DRE, antes da validação final. Os quatro casos (admin/operador × desktop/mobile) passaram em cada motor. Não foi atribuída uma falha que não foi executada a esse controle. O CI intermediário do HEAD documental é substituído pelo novo HEAD com essa asserção.

O CI `42669360930`, no HEAD `6b72627`, concluiu core/diff, mas os jobs de navegador atingiram o limite de 35 minutos após falhas nos percursos de rotas. O helper antigo não registrava `finance-dre`, aguardando um GET inexistente em vez de `/api/finance/dre`. Isso foi reproduzido localmente com uma asserção de registro que falhou imediatamente por `undefined`, sem esperar minutos. O mapa recebeu o endpoint correto e uma verificação de registro obrigatório; nenhuma verificação de HTTP/conteúdo foi removida e nenhum timeout foi aumentado. Depois, 46 casos passaram em cada motor, incluindo todas as identidades/rotas, os cinco tamanhos de tela e os 26 relatórios. [Registro do CI interrompido](evidence/dre-navigation-home/cancelled-ci-6b72627.json). O CI completo do novo HEAD deve ser conferido separadamente; o run cancelado não é aprovação.

Nenhum teste desabilitado, `xfail`, retry, ajuste financeiro ou relaxamento de autorização para produzir aprovação.

## 6. Evidências, pendências e próximo teste manual

[Capturas, logs, JSON do ciclo e manifesto](evidence/dre-navigation-home/) contêm exclusivamente dados fictícios. Os hashes identificam fontes e artefatos; cópias de logs têm whitespace final normalizado, sem mudar resultados. A inspeção visual contemplou o card em desktop/mobile e a DRE; medições também verificam 1024/768 px. Nenhuma afirmação de teste em dispositivo físico ou leitor de tela real.

**Próximo teste humano na instância dos clientes, a ser executado pelo proprietário/avaliadora com dados fictícios:**

1. Na versão publicada **ainda `cc7d983`**, abrir **Relatórios Financeiros → DRE gerencial**. O novo item da sidebar só aparecerá depois de uma atualização futura aprovada; este trabalho não o publicou.
2. Escolher uma conta/cadastros exclusivamente fictícios de homologação. Criar cliente e serviço fictícios de R$ 5.000,01; não usar dados ou a instância da Sammya.
3. Concluir o serviço com data efetiva e evidência de teste. Gerar o título uma única vez, por confirmação explícita.
4. Na DRE, aplicar um período que inclua **a conclusão efetiva**, não apenas o vencimento/recebimento. Ler as pendências: se não houver fonte elegível, conferir operação e datas; se faltar classificação, abrir o Plano financeiro e conferir rubrica/vigência/prévia antes de confirmar. Não reclassificar história real nem presumir componentes.
5. Voltar e clicar **Gerar relatório**. Esperado: Receita bruta conhecida de R$ 5.000,01; resultados sem provas continuam parciais/indisponíveis. Se houver esse conjunto de condições e a rubrica não aparecer, registrar período, estado/mensagem e passos para reprodução, sem enviar dados privados.
6. Se autorizado no ambiente fictício, registrar baixa parcial de R$ 2.000,01. Esperado: principal pendente R$ 3.000,00 e a mesma receita econômica de R$ 5.000,01, sem outro fato. Não criar atestados contábeis apenas para completar a tela.
7. Avaliar a clareza do card, menu, pendências e relatório, incluindo uso em dispositivo físico. Impressora A4, leitor de tela real e aceite funcional/contábil continuam pendentes conforme os gates anteriores.

**Parecer técnico:** fluxo sintético funcional, sem divergência numérica no caso executado; nova navegação/visual preparados para revisão. A causa concreta da tela online vazia não foi inferida de dados inacessíveis: A e B foram reproduzidos e diferenciados; C não foi reproduzido quando as condições econômicas necessárias estavam presentes. O aceite humano e a autorização de publicação continuam separados. Sem liberação automática para dados reais.
