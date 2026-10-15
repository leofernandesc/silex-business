# Reprodução e revisão SB-06C

## Ambiente utilizado

- Projeto: `/home/leofernandesc/controlmax-inspired`.
- Baseline: `c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f`.
- Cópias: `/tmp/silex-sb06c-3md888q8/baseline` e `candidate`.
- Servidores somente loopback e bancos temporários. Não utilizar `data/gestao.sqlite3` nos comandos de teste.
- Firefox instalado, Vite/TypeScript/Vitest/Playwright e `.venv` já disponíveis; nenhuma biblioteca nova.
- Senha do ambiente fictício fornecida em `SILEX_TEST_PASSWORD`, sem embuti-la nos scripts ou pacote.

O ambiente de auditoria usa cópias da fixture fictícia histórica SB-05.3B: empresa/usuários demonstrativos, clientes ilustrativos, contas e movimentos sintéticos, doze meses, valores elevados/negativos e prévia OFX. Não inclui dados reais ou chamadas à aplicação ControlMax. O ZIP não contém bancos. O seed demo e os geradores históricos versionados permitem montar ambientes descartáveis; não prometer uma reprodução pixel a pixel com datas/seed distintos.

## Comandos básicos

Em uma cópia temporária do frontend, com as dependências locais já disponíveis:

```bash
npm run build
npm test
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --lib ES2022,DOM,DOM.Iterable --esModuleInterop --types node tests/visual-accessibility.spec.ts
```

Backend, apontado exclusivamente para ambiente de teste:

```bash
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider
```

Para E2E, copiar `scripts/playwright.sb06c.config.ts` para o frontend descartável, ao lado de playwright.config.ts. Definir SILEX_TEST_ORIGIN, SILEX_RESULTS e SILEX_OUTPUT_DIR. A configuração desativa o webServer automático e reutiliza a instância isolada explicitamente preparada. Sessões expiradas exigem SILEX_SB04B_ENV com diretório `/tmp/silex-sb04b-…`, `persistent_database_used:false` e banco `functional.sqlite3`.

```bash
node_modules/.bin/playwright test --config=playwright.sb06c.config.ts visual-accessibility.spec.ts
```

Regressão principal: app, navigation, header-reflow, home, public, ledger-interface, ledger-summary-responsive, accounts-interface, reconciliation-interface e dashboard-interface. Executar modal-focus/modal-workflows em **outra fixture nova**, com SILEX_MODAL_ORIGIN apontando ao Vite isolado que serve a fixture do componente. Não compartilhar o caixa fechado por essa suíte com os testes que pressupõem caixa aberto.

## Evidências e integridade

Scripts de auditoria recebem SILEX_FRONTEND, SILEX_EVIDENCE, SILEX_ORIGIN e SILEX_VARIANT. `settled_probes.py` serializa os dois navegadores/versões, preserva coletas iniciais e executa medições adicionais. `dashboard_recheck.cjs` aguarda conteúdo real da Visão Geral. `matrices.py` consolida as matrizes, `finalize.py` confere resultados finais e `preservation.py` ensaia restauração em /tmp usando SILEX_STATE.

Não publicar automaticamente a prévia. Para revisar o ZIP, abrir `docs/evidence/sb06c/index.html` após extrair e conferir `MANIFEST.sha256`. Os servidores usados na execução são encerrados ao concluir; a galeria é estática. Nenhum deploy/merge/push é necessário.
