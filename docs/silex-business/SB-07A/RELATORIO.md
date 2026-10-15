# SB-07A — Correções pontuais C01/P05

**Pronto para revisão.** Base aprovada `aa664da97015202cc35c7d02ddb3d06079a5cb3c`; branch `fix/sb07a-content-dates`. Sem push, merge ou deploy. Nenhum ciclo novo de rebranding.

## Inspeção e base correta

Workspace inicial limpo, Git íntegro e sem remoto configurado. `main` permanece em `61c744f` (baseline SB-04B); a referência aprovada do SB-06E contém **59 commits posteriores ainda não integrados à main**. A branch nova parte do SB-06E, preservando essa cadeia. Nenhum histórico reescrito. A comparação final com main inclui esses incrementos anteriores; o diff próprio do SB-07A deve usar `aa664da..HEAD`.

Backup externo antes das alterações: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb07a/silex-sb07a-50aguug6/approved.tar`, com manifesto SHA-256 dos **427 arquivos aprovados** e hashes de preservação dos bancos persistentes/ZIPs anteriores. O arquivo de backup não contém o banco real. Testes usam somente clones da fixture sintética SB-06E em `/tmp/silex-sb07a-50aguug6/`; o banco real só teve hashes lidos.

## Diagnóstico e correção mínima

### C01 — indicadores e título

A grade fixa não acompanhava a ampliação computada dos textos; `white-space:nowrap` preservava o número, mas o valor ultrapassava sua coluna. Em Lançamentos em 320 px, o trecho longo do h1 também excedia a área. A comparação reproduziu o defeito no baseline com a mesma fixture, sem inventar dados nem reduzir os valores.

Correção: grades com `auto-fit` e mínimos em **em**, que acompanham o tamanho do texto, preservando pisos de duas/quatro colunas quando há espaço. Sob ampliação, a grade se reorganiza em menos colunas. O título de Lançamentos ganha quebra de texto e seu contêiner pode encolher. **Não se quebra o número monetário, não se reduz sua fonte, não se esconde overflow e não se modifica SummaryCard.** Ícones, títulos, detalhes, cores e valores permanecem.

| Arquivo de produção | Alteração / justificativa |
|---|---|
| `frontend/src/App.tsx` | Importa CSS específico e identifica somente a grade da Visão Geral com `overview-summary` |
| `frontend/src/overview.css` | 19 linhas, todas sob media screen e classe própria; nenhuma regra global |
| `frontend/src/ledger.css` | Grade adaptativa e quebra localizada do h1; filtros/tabela/ações intactos |
| `frontend/src/accounts.css` | Uma declaração muda o mínimo de 14rem para 16em para responder ao texto ampliado |
| `frontend/src/serviceOrders.tsx` | Reutiliza LedgerDateField em três campos; inputs e handlers originais intactos |

São **39 linhas adicionadas e cinco removidas em cinco arquivos de produção**, incluindo o CSS novo. Não há alteração de lógica financeira, consultas, backend, exportações, impressão, autenticação, permissões ou navegação. O CSS específico do Dashboard Financeiro e os demais módulos não mudam.

### P05 — Serviços

O Firefox pt-BR mostra `03/04/2026` para o valor ISO `2026-03-04`, permitindo interpretação inversa em português. Serviços não possuía a conferência textual disponível nas telas financeiras.

Os campos **Data do serviço**, **Vencimento** e **Competência** agora reutilizam `LedgerDateField`: legenda `Data: 04/03/2026`, idioma pt-BR e vínculo por `aria-describedby`. O componente compartilhado não foi alterado. Mantidos `type=date`, required, valores ISO, callbacks, validação e persistência. A indicação permanece legível mesmo quando o navegador desenha o editor em ordem regional diferente. Nenhum editor customizado/biblioteca foi criado.

## Evidências e resultados

| Verificação | Resultado |
|---|---|
| TypeScript/build Vite | Aprovados em cópia isolada; tipagem explícita do teste/configuração também aprovada |
| Frontend existente | **96/96** testes em 12 arquivos |
| Backend direcionado | **3/3**: fluxo de serviços e dois testes de saldo/movimentação/idempotência. Código backend intacto; não repetir os 69 por ausência de mudança lógica |
| Novos E2E | **6/6**: quatro comparações C01 e dois fluxos P05 regionais |
| Regressões selecionadas | **15/15**: valores completos, P02/P03/P06/P08/R02, fluxo de serviços, modais, indicadores do Dashboard, atalho/histórico e caso público T01 |
| Financeiro antes de operações de teste | **35 JSON e 30 CSV/impressões idênticos** entre clones equivalentes |
| Apresentação normal | **Oito pares PNG idênticos byte a byte**, nas quatro telas em 1440/375; colunas e dimensões normais preservadas |
| Texto computado a 200% | Quatro telas × 1440/768/375/320, pareadas com baseline. Valores **e tamanhos de fonte iguais** entre versões; números em uma linha, dentro dos cartões, documento sem excesso na candidata |
| Zoom nativo Firefox | **200%/400% reais**, Xvfb privado/XTest: 1280→640/320 CSS px e DPR 2/4. 12 estados incluindo telas C01, formulário de Serviços e público; documento=viewport |
| Persistência P05 | Criação/edição/reload/read-back em pt-BR/Manaus e en-US/Kiritimati; datas comuns/ambíguas, bissexto, fim de mês/ano, virada e required vazio; ISO preservado na API e nos títulos gerados |
| Preservação de handlers | **52 atributos de eventos idênticos** por AST: 21 em App e 31 em Serviços; contratos, cálculos e shared components intactos |

Os seis testes novos exercitam 32 estados de layout por versão (normal/texto200, quatro telas, quatro larguras), sem repetir a matriz de 26 superfícies ou os 357 E2E anteriores. A seleção de 15 regressões cobre os consumidores e dependências efetivamente afetados. Sem retries, skips ou asserções antigas alteradas. O alerta Starlette/httpx é anterior, não houve instalação de dependências.

### C01 — documento CSS px, texto computado a 200%

| Tela / viewport | Antes | Depois |
|---|---|---|
| Visão Geral / 1440 |1477|1440|
| Visão Geral / 375 |440|375|
| Visão Geral / 320 |412|320|
| Lançamentos / 768 |854|768|
| Lançamentos em 320 px |348|320|
| Pagar / 768 |850|768|
| Receber / 768 |850|768|

Todas as 16 combinações tela/largura passam; a tabela destaca as falhas anteriores. Não confundir a ampliação de fontes por script com zoom nativo, verificado separadamente.

## Reprodução direcionada

Os ambientes e portas usados estão em `environment.json`. Os scripts exigem `SILEX_TEST_PASSWORD` fornecida pelo operador; nenhuma senha/token está incluída no pacote. Baseline e candidata precisam de bancos descartáveis equivalentes antes das comparações. Não apontar para o banco persistente.

No frontend isolado, copiar `playwright.sb07a.config.ts` para junto de `playwright.config.ts` e executar o teste `tests/content-dates.spec.ts` com `SILEX_BASELINE=http://127.0.0.1:18071`, `SILEX_CANDIDATE=http://127.0.0.1:18072`, `SILEX_EVIDENCE` e `SILEX_RESULTS` definidos. As versões originais das 15 regressões selecionadas constam em `test-matrix.json`; não foram editadas. `native-zoom.cjs` requer Firefox/Playwright e display Xvfb privado `:1066`, X11/XTest já disponíveis; não opera na janela do usuário. Os scripts referenciam os coletores históricos preservados de SB-06E/SB-06D.2, portanto o ZIP é uma evidência compacta, não um ambiente autônomo instalado.

`preservation.cjs` verifica handlers e lê as datas persistidas das duas amostras sintéticas. `recovery.py` ensaia reversão somente em diretório temporário usando o manifesto externo. `package.py` reúne evidências após Git limpo, verifica resultados/manifestos e bloqueia inclusão da senha fornecida. Os caminhos temporários precisam ser reconstituídos se a sessão local for encerrada; os registros finais permanecem na pasta de evidências.

## Limites, ocorrências e pendências

O primeiro teste novo acumulava estilos de fonte entre navegações para o mesmo hash, chegando a 400/800%; a evidência mostrou 96px em vez de 48px. O instrumento passou a recarregar cada amostra antes de aplicar exatamente 200%, sem relaxar asserções. Log/JSON inicial preservados em exploratory. A primeira execução correta já passou; a reexecução final passou novamente após explicitar o piso de quatro colunas normais, evitando trilhas auto-fit de 0px e mantendo os testes históricos intactos. As operações de persistência ocorreram somente nas fixtures descartáveis, sem tocar dados reais. As comparações financeiras foram executadas antes dessas mutações sintéticas.

**C01 corrigida no escopo documentado. P05 corrigida nos três campos de Serviços; P05 global permanece parcial**, pois controles/prints legados de outros módulos não foram padronizados neste incremento. C02 da Home em larguras extremas continua fora do escopo. P07 parcial, V01/T01 em acompanhamento; seus testes selecionados passaram, sem provar causa histórica nem encerrar as observações. Leitor de tela real/outros navegadores/dispositivos continuam sem homologação. Firefox com duas localidades não equivale a testar todos os navegadores.

## Git, revisão e recuperação

Commits de produção: `6a5212b` — C01; `04acdf3` — P05. Os commits adicionais de testes/documentação e hashes completos estão em [git-summary.txt](../../evidence/sb07a/git-summary.txt), junto de status, diff contra SB-06E e divergência de main. Nenhum arquivo funcional fora da lista foi modificado.

`recovery-test.json` registra o ensaio em diretório temporário: extrair backup aprovado, aplicar alterações/novos arquivos, restaurar originais e remover somente os novos caminhos; os 427 hashes voltam ao baseline. `preservation-test.json` registra AST/contratos/retorno de datas persistidas; `candidate-sha256.json` permite conferir a candidata. Os backups locais não são publicados.

[Galeria e evidências](../../evidence/sb07a/index.html). [Pacote compacto SB-07A-review.zip](../../evidence/sb07a/SB-07A-review.zip), com diffs, commits, relatórios, testes e capturas essenciais; sem .git, bancos, credenciais, caches ou builds. Os logs completos de desenvolvimento permanecem locais.

**Próxima etapa recomendada:** revisar este incremento e homologar os campos nativos/legendas com usuários brasileiros e leitor real. Qualquer expansão de P05 para outros campos deve ser autorizada separadamente. Não iniciar reformulação visual, limpeza global de CSS, multitenancy ou segurança de produção neste lote. Não declarar lançamento comercial autorizado. Aguardar revisão explícita.
