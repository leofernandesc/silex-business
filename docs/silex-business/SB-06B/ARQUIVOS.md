# SB-06B — relação completa de arquivos

## Arquivos existentes modificados

- `docs/silex-business/PENDENCIAS.md`
- `frontend/src/ui.tsx`

## Arquivos adicionados e versionados

- `docs/evidence/sb06b/scripts/capture_patterns.cjs`
- `docs/evidence/sb06b/scripts/finalize_results.py`
- `docs/evidence/sb06b/scripts/financial_compare.py`
- `docs/evidence/sb06b/scripts/inventory.cjs`
- `docs/evidence/sb06b/scripts/package_review.py`
- `docs/evidence/sb06b/scripts/playwright.sb06b.config.ts`
- `docs/evidence/sb06b/scripts/preservation.py`
- `docs/evidence/sb06b/scripts/probe.cjs`
- `docs/evidence/sb06b/scripts/verify_ui.cjs`
- `docs/silex-business/SB-06B/ARQUIVOS.md`
- `docs/silex-business/SB-06B/AUDITORIA.md`
- `docs/silex-business/SB-06B/PRESERVACAO.md`
- `docs/silex-business/SB-06B/RELATORIO.md`
- `docs/silex-business/SB-06B/TESTES.md`
- `frontend/src/useModalFocus.ts`
- `frontend/tests/fixtures/modal-focus.html`
- `frontend/tests/fixtures/modal-focus.tsx`
- `frontend/tests/modal-focus.spec.ts`
- `frontend/tests/modal-workflows.spec.ts`

## Evidências geradas

Capturas PNG, index.html, test-results-summary.json, test-matrix.json, modal-inventory.json, baseline/candidate-modal-probe.json, baseline-cause.json, candidate-close-trace.json, patterns-and-text200.json, financial-equivalence.json, ui-preservation.json, visual-comparison.json, public-timeout-evidence.json, preservation-test.json, baseline/candidate-sha256.json, review.diff, git-summary.txt, logs selecionados em tests/, ZIP e checksums. Geradas somente em docs/evidence/sb06b, ignoradas pelo Git e incluídas seletivamente no pacote. MANIFEST.sha256 é a relação completa dos itens efetivamente empacotados. Logs/trace exploratórios integrais continuam na área temporária local; nenhum artefato histórico foi excluído.

Produção: somente ui.tsx e useModalFocus.ts. Fixture HTML/TSX e scripts de ensaio não entram no bundle operacional.
