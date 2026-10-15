# Reprodução, preservação e reversão

## Estado e isolamento

- Referência aprovada: `48d6e36c0c865fec198f1dd03dab573505418063`.
- Branch: `feat/sb06d2-css-pilot`, criada diretamente dessa referência; não main.
- Cópias: `/tmp/silex-sb06d2-sdalhnj8/{baseline,candidate,historical-aa}`. A última é somente o antes histórico do SB-06D.1, aa4964d.
- Dependências já instaladas reutilizadas; sem instalar bibliotecas. Builds e testes somente nas cópias, sem reconstruir a distribuição do workspace.
- Fixture fictícia congelada histórica, copiada por SQLite backup; main E2E e modais usam bancos temporários separados. Não abrir banco persistente para consultas/testes.

## Reprodução

Na cópia isolada do frontend, com node_modules local disponível:

```bash
npm test
npm run build
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --lib ES2022,DOM,DOM.Iterable --esModuleInterop --types node tests/css-pilot.spec.ts playwright.sb06d2.config.ts vite.sb06d2.config.ts
```

Backend da cópia:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider
```

Não há script lint. O build inclui TypeScript; a checagem explícita cobre os novos testes/configs.

Copiar configs sb06d2 ao lado das configs originais na cópia. Playwright usa `SILEX_TEST_ORIGIN`, `SILEX_RESULTS`, `SILEX_OUTPUT_DIR`; webServer automático desativado. Expiração de sessão usa `SILEX_SB04B_ENV` com work_dir `/tmp/silex-sb04b-…`, `functional.sqlite3`, `persistent_database_used:false`. Modais exigem `SILEX_MODAL_ORIGIN` apontando ao Vite da fixture de componente e **outro banco**. Não fechar o caixa da suíte principal através da suíte modal.

Principal: app, navigation, header-reflow, home, public, ledger-interface, ledger-summary-responsive, accounts-interface, reconciliation-interface, dashboard-interface, visual-accessibility, date-presentation e css-pilot. Modais: modal-focus/modal-workflows. Baseline adicional: css-pilot.

Instrumentos recebem `SILEX_ROOT`, `SILEX_EVIDENCE`, `SILEX_STATE`; navegador também `SILEX_ORIGIN` e `SILEX_VARIANT`, ou URLs baseline/candidate/historical conforme script. Senha fornecida externamente por `SILEX_TEST_PASSWORD`, nunca embutida no pacote. `matrix.cjs` registra fonte/layout/estados, `order.cjs` a cascata real, `pilot.cjs` prova/aplica o diff mínimo, `compare.py` rejeita diferenças, `supplement.cjs` estabiliza relatórios, probes cobrem Home/V01. As comparações financeiras e CSV reutilizam os scripts aprovados do SB-06D.1 sem modificar seus arquivos.

## Backup e ensaio

Backup externo: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06d2/silex-sb06d2-sdalhnj8`.

Contém approved.tar e originais dos **374 arquivos versionados**, com verificação SHA-256 antes do piloto. Também registra hashes dos três arquivos do banco persistente e das 92 capturas do SB-06D.1. Backups e ZIPs anteriores ficam preservados.

O script preservation.py monta o baseline em diretório temporário, aplica alterações/adições, restaura os originais e remove somente as novas fontes listadas no manifesto. Confere todos os 374 hashes e os arquivos protegidos, sem reverter o workspace. O pacote traz os originais dos arquivos existentes efetivamente alterados e o manifesto de recuperação; não duplica todo o projeto nem inclui banco.

Procedimento de reversão a revisar antes de executar:

1. Conferir branch/status e proteger qualquer trabalho posterior.
2. Validar SHA-256 dos originais com baseline-sha256.json e backup-manifest.json.
3. Restaurar apenas os arquivos em changed_existing_files; remover apenas as novas fontes em new_files_to_remove_on_rollback.
4. Preservar as evidências históricas e os relatórios de teste; artefatos gerados não precisam ser apagados para recuperar o código aprovado.
5. Conferir os 374 hashes e executar testes. No repositório, documentar a reversão em novo commit revisado, sem reset/clean/rebase destrutivo.

preservation-test.json contém o ensaio final e os hashes históricos. `git-summary.txt`, `review.diff` e `file-inventory.json` registram branch/commits/diffs completos. MANIFEST.sha256 cobre o conteúdo do ZIP; checksum externo cobre o arquivo compactado. Nenhum push, merge ou deploy realizado.
