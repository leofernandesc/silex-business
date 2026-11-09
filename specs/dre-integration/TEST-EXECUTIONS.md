# Execuções e gate final E7

Código congelado: `5df3edb44127abbd2bcaa132c72c9ce1fc35b9fd`. [Manifesto dos arquivos de código/teste](evidence/source-manifest.json). Os arquivos de relatório/evidência são posteriores, sem mudança nesses fontes.

## Ambiente e isolamento

Linux local, Python 3.12.3, Node 26.8.1/npm 11.19.0; CI Ubuntu 24.04/Python 3.12/Node 22 e `npm ci`/requirements fixados. Dependências não foram alteradas. FastAPI 0.143.0, SQLAlchemy 2.0.54, Alembic 1.20.0, pytest 9.1.1, Playwright 1.64.0. Navegadores correspondentes: Chromium 156.0.8078.4/revisão 1248, Firefox 157.0/revisão 1555. Binários locais em `/tmp/silex-commercial-browsers`; ambiente Python/Node reutilizado, não incluído no Git.

Cada teste de integração do navegador restaura uma fixture SQLite temporária própria; os dois motores usam portas/manifests distintos. Servidor local existente em 8000/5173 preservado. Nenhum banco persistente, seed externo, Railway ou credencial real.

## Resultados locais observados

A bateria completa local de 319 casos corresponde ao checkpoint `76f7013`, antes do ajuste final da prévia econômica. Esse ajuste foi reproduzido (prévia novembro mostrava zero fontes apesar de venda reconhecida em novembro/título dezembro), corrigido e validado em **19 testes dirigidos PASS** de API/resiliência. O caso de invalidação de prévia por mudança de reconhecimento acrescenta um teste: **320 backend esperados no CI final**, cujo resultado real será conferido no PR. Frontend/ativos permaneceram idênticos ao checkpoint das 26 jornadas por navegador. A primeira execução remota, `42508301497`, começou no HEAD anterior `2d81c8c`; não substitui a validação do novo HEAD.

| Comando / escopo | Resultado | Evidência |
|---|---|---|
| `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q` | **319 PASS no checkpoint 76f7013**, 0 falhas/ignorados, 236,33 s | [backend](evidence/backend.txt) |
| `npm test --prefix frontend` | **240 PASS**, 22 arquivos, 0 falhas/ignorados | [frontend](evidence/frontend.txt) |
| `npm run build --prefix frontend` | TypeScript + Vite PASS | [build](evidence/build.txt) |
| Playwright dirigido, Chromium | **26/26**, 0 falhas/skips/retries, uma bateria | [log](evidence/directed-chromium.txt) |
| Playwright dirigido, Firefox | **26/26**, 0 falhas/skips/retries, uma bateria | [log](evidence/directed-firefox.txt) |
| `PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py` | **124 iguais**, 26 relatórios, 0 divergências; 68 JSON/56 CSV | [recibo](legacy-report-comparison.json) |
| `SILEX_DRE_RESTART_OUTPUT=/tmp/dre-restart.json PYTHONPATH=backend .venv/bin/python scripts/check_dre_restart.py` | 3 processos, reinício, restauração e anexo íntegros | [recibo](evidence/restart.json) |
| `SILEX_DRE_PERFORMANCE_OUTPUT=/tmp/dre-performance.json PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_dre_resilience.py::test_batch_read_does_not_make_a_query_per_source -q` | 1000 fontes sintéticas, 15 SELECTs, 0,375 s, HTTP 200 | [recibo](evidence/performance.json) |

As 26 verificações dirigidas por motor abrangem quatro jornadas DRE, compatibilidade dos 26 relatórios, propriedade de metadados, retorno seguro, página pública e todas as rotas nas cinco larguras, desktop/móvel. Não somar repetições como novos cenários. Axe não encontrou violações na DRE examinada; a bateria de rotas também foi aprovada na execução dirigida de 14 casos por motor anterior ao último ajuste de impressão.

Comando exato da bateria dirigida, a partir de `frontend/`:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers SILEX_E2E_PORT=8011 SILEX_DRE_EVIDENCE_DIR=/tmp/silex-dre-visual-release SILEX_INTEGRATION_OUTPUT=/tmp/silex-dre-release-c SILEX_INTEGRATION_REPORT=/tmp/silex-dre-release-c.json npx --no-install playwright test --config playwright.integration.config.ts --grep 'DRE:|navigation aliases converge|service completion persists|DRE lookup failure|all registered screens|specialized metadata stays|all 26 reports: filtered|retorno adulterado|público sem sessão'
```

Firefox: mesmo comando com `SILEX_INTEGRATION_BROWSER=firefox`, porta `8012`, saída `/tmp/silex-dre-release-f` e JSON `/tmp/silex-dre-release-f.json`. Larguras efetivas 1440, 1024, 768, 375 e 320 px. Os testes mantêm todos os contratos e asserções de segurança/conteúdo.

## CI integral do HEAD do PR — autoridade para o gate final

O workflow `.github/workflows/integration-tests.yml` faz checkout do **HEAD exato**, sem merge/deploy. Core executa backend/frontend/build, 26 contratos/CSVs, reinício/backup DRE e gate negativo de diff. Jobs Chromium/Firefox executam **322 casos por motor, em uma única bateria por job, retries=0**, mais complementos de 30 financeiro/fusos, 8 transporte e 35 datas/foco por navegador. Os complementos se sobrepõem à matriz; não são cobertura única adicional.

Os resultados remotos ocorrerão depois do commit deste relatório. **Consultar os checks do HEAD final e a descrição do Draft PR**, que registrarão SHA, run e resultados efetivamente concluídos. Este arquivo não antecipa aprovação de execução remota. A entrega só será apresentada como tecnicamente pronta quando esse gate concluir; se falhar, a causa e a nova execução precisam ser registradas. [Execuções da branch](https://github.com/leofernandesc/silex-business/actions?query=branch%3Afeat%2Fdre-integrated-financial-ux).

## Falhas anteriores e reexecuções — não apagadas nem somadas

[Índice de execuções](evidence/local-runs.json) preserva contadores, falhas/interrupções e hash dos JSONs de origem.

- Reprodução E1 na base: fixture inicial sem chave idempotente retornou 422; após corrigir a fixture, o defeito real de recebíveis foi comprovado (0 versus 6000). Não houve relaxamento da idempotência.
- Frontend inicial: 222 PASS/12 FAIL com expectativas anteriores de navegação; depois, 234 PASS. O novo hook de origem causou 6 falhas SSR por ler `location` inexistente; o código foi corrigido para ambiente sem navegador, sem simular location nos testes. Resultado final 240 PASS.
- DRE inicial no navegador: título não atualizado no arquivo real e fixture sem seleção de conta; corrigidos produto/fixture respectivamente. Em outra rodada, duplicidade do rótulo de lucro na tabela de margem causou quatro falhas por motor; rótulos de margem foram corrigidos no produto. Oito casos dirigidos por motor passaram depois.
- Primeira tentativa integral local (81f6374) foi interrompida: Chromium 75 aprovados e três falhas efetivas; Firefox 63 aprovados e três falhas efetivas. Alias Home sem nova consulta, expectativa antiga de Home sem indicadores, opção DRE adicional e origem/porta de fixture estavam incompatíveis com a evolução. Casos não executados por interrupção não são aprovação nem skips introduzidos no código.
- Segunda tentativa integral local foi interrompida: Chromium 165 aprovados/seis falhas; Firefox 105 aprovados/duas falhas. Ainda havia expectativa de 26 opções UI (API mantém 26; UI tem mais DRE), URL `#dashboard` em vez da canônica `#home`, e contextos auxiliares Firefox na porta Chromium. Os instrumentos foram corrigidos para verificar os mesmos 26 IDs mais a opção DRE, URL canônica e origem exata da fixture própria. Asserções de conteúdo, permissões, dimensões, financeiro e timeout foram preservadas.
- Um teste de concorrência inicialmente colocou uma barreira dentro da transação SQLite `BEGIN IMMEDIATE`, criando bloqueio artificial. A barreira passou para a submissão HTTP; resultado estrito continua 201/409, exatamente uma revisão. Nenhuma trava de produção foi removida.
- Um teste de massa usava categoria com direção padrão `both` como se fosse `income`; a fixture passou a buscar a categoria sintética existente. Não mudou a regra de classificação.
- Inspeção PDF identificou controles operacionais impressos; CSS exclusivo DRE e teste de ocultação corrigiram o documento. PDF final A4 retrato de duas páginas foi extraído/rasterizado e inspecionado. Valores e campos essenciais preservados; nenhuma alteração ao CSS global.
- A bateria backend de 316 PASS precedeu o caso adicional de cancelamento em Manaus e dois casos de encargos/estornos. A bateria de **319** é a referência local final; não somar ambas.

Logs publicados removem apenas ANSI e whitespace final para leitura/Git; não são fixtures reescritas nem substituem os resultados do runner. O aviso de depreciação TestClient/httpx foi registrado, sem ignorar testes ou mudar dependências.

Sem teste em impressora/dispositivo físico, leitor de tela real, pentest, carga prolongada ou dados/infraestrutura de produção. A medição de 1000 fontes demonstra leitura em lote no laboratório, não capacidade de produção.

Correção final da prévia: período potencialmente afetado agora segue a data econômica efetiva, e a confirmação é invalidada se uma decisão de reconhecimento ou mapeamento mudar entre prévia e gravação. Reprodução negativa em `evidence/preview-before.txt`; 19 testes dirigidos aprovados em `evidence/preview-after.txt`. O principal, os pagamentos e os 26 relatórios legados não mudaram.
