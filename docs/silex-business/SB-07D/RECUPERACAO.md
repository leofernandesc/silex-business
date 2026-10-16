# SB-07D — arquivos, reprodução e recuperação

## Baseline

Base aprovada `43f9d95f461b31b92253eef026a6b9e84d923309`, branch nova `fix/sb07d-content-reflow`. A main permanece no baseline antigo e não foi usada como origem. Backup integral dos 476 arquivos versionados em `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb07d/approved.tar`; SHA em `baseline.json`. Não contém `.git` ou banco persistente.

Produção: somente `frontend/src/App.tsx`, `frontend/src/home/home.css`, `frontend/src/overview.css`. Instrumentos: `frontend/playwright.sb07d.config.ts`, `frontend/tests/content-reflow.spec.ts` e os arquivos de `SB-07D/tools`. Documentação: os Markdown de SB-07D e o registro central PENDENCIAS. Relação completa em `file-inventory.json` e hashes em `sha256-files.json`, no pacote.

`tools/recovery.py` copia a candidata para temporário, restaura todos os arquivos do backup e remove somente os caminhos novos. O conjunto e os 476 hashes devem voltar exatamente ao aprovado. Nada é restaurado sobre o checkout de trabalho. Dependências não mudaram neste incremento.

Em uma reversão real: preservar alterações posteriores, comparar os hashes candidatos, extrair o backup para temporário, restaurar apenas os quatro originais alterados (três de produção e PENDENCIAS) e remover os caminhos novos do inventário depois de revisão. Validar tipos/build/testes e registrar a reversão em novo commit, sem reset, clean, rebase ou comandos destrutivos. Guardar a evidência fora da árvore revertida.

## Reprodução dos testes

Requer checkout legítimo, lockfile aprovado, dependências e navegadores já instalados. A senha da fixture é fornecida separadamente em SILEX_TEST_PASSWORD, nunca no ZIP.

1. Conferir `baseline.json` e backup. Em outra máquina, gerar uma cópia do aprovado, verificar hashes e registrar manifesto próprio, sem sobrescrever evidências antigas.
2. Build do aprovado numa cópia temporária; copiar o dist resultante para `docs/evidence/sb07d/baseline-dist`. Build da candidata normalmente. Nenhum dist acompanha o ZIP.
3. Iniciar `python3 docs/silex-business/SB-07D/tools/runtime.py baseline --port 18094 --regression-fixture`.
4. Iniciar candidata em 18095 e funcional em 8011 com `--database-copy CAMINHO_TEMPORARIO/synthetic.sqlite3`. A origem precisa pertencer ao temporário SB-07D; o launcher usa SQLite backup. Para 8011 acrescentar `--legacy-session-manifest`.
5. Fixture de componentes: no frontend, `node node_modules/.bin/vite --host 127.0.0.1 --port 18086 --strictPort`.
6. No frontend: `node node_modules/.bin/playwright test --config playwright.sb07d.config.ts`. O teste C02 usa 18094/18095. As regressões antigas selecionam `SILEX_SB07D_URL=http://127.0.0.1:8011`, `SILEX_SB04B_ENV` com o manifesto gerado e `SILEX_SB07D_MATCH` com nomes de arquivos separados por vírgula. `SILEX_SB07D_CHROMIUM=1` usa o Brave já instalado, sem perfil pessoal.
7. Usar caminhos separados em `SILEX_SB07D_RESULTS` e `SILEX_SB07D_ARTIFACTS`; não compartilhar traces entre execuções concorrentes.
8. `npm test`, `npm run build` e o comando explícito de TypeScript dos dois arquivos novos; backend pertinente: `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_service_orders.py backend/tests/test_financial_ledger.py backend/tests/test_finance_expansion.py -q`.
9. Na raiz: executar `tools/preservation.cjs`, `tools/recovery.py`, `git diff --check`; conferir JSONs e galeria.

O coletor `tools/probe.cjs` aceita origem/variante e cenários/estados via SILEX_ORIGIN, SILEX_VARIANT, SILEX_PROBE_SCENARIOS e SILEX_PROBE_STATES. `compare.cjs` verifica respostas reais; `keyboard.cjs` verifica a nova região. Os arquivos antigos permanecem intactos.

## Zoom nativo e encerramento

`native_zoom.cjs` usa Xvfb privado `:1068`, iniciado com tela 1600×1200, e `native_keys.py` só aceita esse display. A janela Firefox é redimensionada para conteúdo inicial de 1280 px; atalhos reais produzem 640/320 CSS px e DPR 2/4. Nenhuma janela do usuário é acionada. Não instalar programas globalmente para executar o roteiro.

Encerrar somente os processos desta execução, por SIGTERM, após os testes. O launcher remove seu SQLite/aliases temporários. `cleanup.json` documenta o encerramento; evidências históricas não são removidas.

O ZIP contém documentos, diff, instrumentos, manifestos e capturas essenciais. O backup integral permanece local, pois inclui documentação/testes históricos com credenciais fictícias. Para restauração integral é necessário o backup local ou o commit aprovado; não é um pacote de deploy ou cópia completa do ERP.
