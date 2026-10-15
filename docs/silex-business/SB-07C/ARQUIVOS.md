# SB-07C — arquivos da entrega

Relação integral em relação ao commit aprovado SB-07B. Evidências geradas, manifestos, galeria e ZIP ficam ignorados pelo Git, preservados localmente e selecionados no pacote externo. Nenhum arquivo de backend, banco, rota, autenticação, permissões, shell ou impressão foi alterado.

| Estado | Caminho | Finalidade |
|---|---|---|
| Modificado | `docs/silex-business/PENDENCIAS.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/ARQUITETURA.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/ARQUIVOS.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/INVENTARIO-DATAS.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/RECUPERACAO.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/RELATORIO.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/REPRODUCAO.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/TESTES.md` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/accessibility.cjs` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/compare_legacy_regressions.py` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/inventory.cjs` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/native_keys.py` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/native_zoom.cjs` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/preservation.cjs` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/recovery.py` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/regression_fixture.py` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/review.py` | Documentação/instrumento de auditoria |
| Adicionado | `docs/silex-business/SB-07C/tools/runtime.py` | Documentação/instrumento de auditoria |
| Modificado | `frontend/package-lock.json` | Dependências aprovadas e lockfile |
| Modificado | `frontend/package.json` | Dependências aprovadas e lockfile |
| Adicionado | `frontend/playwright.sb07c-regression.config.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/playwright.sb07c.config.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/src/SilexDatePicker.tsx` | Componente/adaptador/CSS local de datas |
| Adicionado | `frontend/src/SilexMonthField.tsx` | Componente/adaptador/CSS local de datas |
| Adicionado | `frontend/src/civilDates.test.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/src/civilDates.ts` | Componente/adaptador/CSS local de datas |
| Adicionado | `frontend/src/dateFields.css` | Componente/adaptador/CSS local de datas |
| Modificado | `frontend/src/finance.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/financeCatalog.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/financePlanning.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/financePresentation.test.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/src/ledger.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/ledgerPresentation.test.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/src/ledgerPresentation.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/sales.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/serviceOrders.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/src/ui.tsx` | Integração da entrada, mantendo os valores/handlers de negócio |
| Modificado | `frontend/tests/accounts-interface.spec.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/tests/content-dates.spec.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/tests/dashboard-interface.spec.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/tests/date-presentation.spec.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/dateHelpers.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/fixtures/date-controls.html` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/fixtures/date-controls.tsx` | Teste/fixture/configuração de validação |
| Modificado | `frontend/tests/ledger-interface.spec.ts` | Teste/fixture/configuração de validação |
| Modificado | `frontend/tests/sb07b-date-homologation.spec.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/sb07c-dates.spec.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/sb07c-flows.spec.ts` | Teste/fixture/configuração de validação |
| Adicionado | `frontend/tests/sb07c-visual.spec.ts` | Teste/fixture/configuração de validação |

`file-inventory.json` e `sha256-files.json` registram os caminhos e hashes do conjunto final. O diff exato está no pacote. `approved.tar` mantém os originais de todos os arquivos modificados e o ensaio remove os novos somente na cópia temporária.
