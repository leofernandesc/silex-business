# Reprodução e reversão

## Ambiente

Baseline aprovado `aa4964d48c51fb8f56f29daf3b3a20401d2df2bb`; branch `feat/sb06d1-dates`. Nenhuma inicialização de Git ou mudança de histórico. `main` permanece intocada. Sem push, merge ou deploy.

Cópias temporárias em `/tmp/silex-sb06d1-e280_mih/{baseline,candidate,historical-c269}`; `.venv` e node_modules locais reutilizados por symlink. O build é executado somente nessas cópias. Fixture sintética histórica, duplicada por SQLite backup, não banco real. Testes de mutação e modais têm bancos distintos descartáveis; não compartilhar o caixa fechado ao fim de modal-workflows com os testes de venda que o pressupõem aberto.

Auditores recebem `SILEX_ROOT` e `SILEX_EVIDENCE`; scripts de navegador/comparação recebem `SILEX_BASELINE`, `SILEX_CANDIDATE`, `SILEX_HISTORICAL` e `SILEX_TEST_PASSWORD` fornecido externamente. Não embutir senha no código ou no ZIP.

## Comandos

Na cópia isolada do frontend:

```bash
npm test
npm run build
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --lib ES2022,DOM,DOM.Iterable --esModuleInterop --types node tests/date-presentation.spec.ts playwright.sb06d1.config.ts vite.sb06d1.config.ts
TZ=Pacific/Kiritimati node_modules/.bin/vitest run src/datePresentation.test.ts
```

Backend da cópia:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider
```

Não existe script lint neste projeto. TypeScript está incluído no build; o comando explícito também verifica os novos testes/configurações.

Copiar `playwright.sb06d1.config.ts` e `vite.sb06d1.config.ts` ao lado das configurações originais da cópia. A primeira desativa webServer automático e usa `SILEX_TEST_ORIGIN`, `SILEX_RESULTS`, `SILEX_OUTPUT_DIR`. A segunda ignora diretórios de saída do Playwright no watcher. Para expiração de sessão, usar `SILEX_SB04B_ENV` com work_dir temporário `/tmp/silex-sb04b-…`, banco `functional.sqlite3`, `persistent_database_used:false`.

Regressão: app, navigation, header-reflow, home, public, ledger-interface, ledger-summary-responsive, accounts-interface, reconciliation-interface, dashboard-interface e visual-accessibility. Modais: modal-focus + modal-workflows em outro banco, com `SILEX_MODAL_ORIGIN` apontando ao Vite que serve `tests/fixtures/modal-focus.html`. Novos testes: date-presentation; comparação ISO baseline/candidata utiliza nomes sintéticos iguais e fixtures independentes.

## Recuperação

Backup externo: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06d1/silex-sb06d1-e280_mih`. Contém approved.tar e original de **todos os 350 arquivos versionados** do baseline; baseline.json registra SHA-256 e os três arquivos do banco persistente apenas como hashes. O banco real não foi aberto para consulta nem copiado para o pacote.

1. Guardar trabalho posterior e revisar `git status`; não sobrescrever alterações de outro incremento.
2. Conferir hashes dos originais com `baseline-sha256.json` e `backup-manifest.json`.
3. Restaurar somente os arquivos existentes listados em `changed_existing_files`, a partir de `original/`.
4. Remover somente as adições deste incremento listadas em `new_files_to_remove_on_rollback`. Evidências históricas não fazem parte dessa lista.
5. Comparar os 350 hashes do baseline. Executar build/testes. No repositório real, registrar a reversão revisada em novo commit, sem reset/clean/rebase destrutivo.

O ensaio em diretório temporário aplica a candidata, restaura os originais e remove adições, verificando todos os arquivos. Não executa a reversão no workspace. `preservation-test.json` registra o resultado efetivo. O ZIP traz os originais dos arquivos efetivamente alterados, não duplica 350 fontes nem inclui bancos, .git, caches ou builds.

## Limites

Sem instalação de dependências. Firefox headless disponível; localização do controle nativo não é uniformizada por `lang` e o suporte a month deve ser confirmado pela propriedade `type` efetiva. Zoom nativo, leitor de tela real, toque físico e outros navegadores não são homologados. Texto com fontes computadas duplicadas é uma simulação de ampliação, não zoom nativo.
