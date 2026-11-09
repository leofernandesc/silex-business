# Resultados — candidata de release

## Identificação e ambiente

Base `985e50c4bf33aa976252cfc49696c28765a25ef9`; código testado corresponde ao commit `0fdfb65773461619e1fa33b01b76b7367863fa40`. Testes executados antes do commit sobre os mesmos bytes, conferidos em [tested-sources.json](evidence/tested-sources.json). Documentação/evidências vêm em commit posterior; seu HEAD definitivo e execução remota constam do Draft PR/checks. Não declarar execução remota futura como concluída neste recibo local.

Ubuntu local; Python 3.12.3, Node 26.8.1, npm 11.19.0, dependências existentes do lockfile (não atualizadas), Playwright e browsers correspondentes instalados em `/tmp/silex-commercial-browsers`. Runtime alvo/CI usam Python 3.12 e Node 22. Links locais de dependências reutilizados sem modificar targets. Nenhum banco real, Railway ou serviço local do proprietário usado; processos isolados nas portas 8031 e 8032, um worker e SQLite descartável por caso.

## Execuções finais observadas

| Camada | Comando | Resultado / evidência |
|---|---|---|
| Backend completo | `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q` | **339 PASS**, 0 FAIL/skip, 238,91 s; [log](evidence/backend.txt). Um aviso preexistente TestClient/httpx. Backend não mudou entre execução e commit. |
| Frontend completo | `npm test --prefix frontend` | **259 PASS**, 23 arquivos; [log](evidence/frontend.txt). 16 novos testes sobre os 243 existentes. |
| TypeScript + Vite | `npm run build --prefix frontend` | PASS; `tsc -b && vite build`; [log](evidence/build.txt). |
| E2E DRE/UX/revisões/navegação/contexto | comando abaixo | **24/24 Chromium, 24/24 Firefox**, sem skips/retries; [Chromium](evidence/chromium-directed.txt), [Firefox](evidence/firefox-directed.txt). |
| 26 relatórios legados | `PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py --base 985e50c4bf33aa976252cfc49696c28765a25ef9 --output specs/release/client-instance-readiness/evidence/legacy-report-comparison.json` | **124 comparações, 0 divergências**; [recibo](evidence/legacy-report-comparison.json). Mesmos backend e contratos. |
| Reinício/backup/restauração | `SILEX_DRE_RESTART_OUTPUT=/tmp/silex-release-restart.json PYTHONPATH=backend .venv/bin/python scripts/check_dre_restart.py` | Três processos; linhas/IDs/anexos iguais; integrity_check=ok, FK=0; [recibo](evidence/restart.json). |
| Segurança/acessibilidade | casos da suíte backend e oito E2E novos | 403 de descrição não expõe fonte/diagnóstico; mudança real de sessão para operador impede CSV de tela antiga; axe sem violações nos casos consultados; centavos originais +10001/-10001 preservados. |
| Impressão/CSV | mesmos E2E, `pdfinfo`, `pdftotext`, inspeção visual | A4 duas páginas Chromium; mídia print em Firefox; quatro CSVs fictícios, rótulos humanos e coluna de auditoria. [Evidências](P2-UX-FIX.md). |

Comando E2E exato, cwd `frontend`, executado uma vez por motor na rodada final:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers \
SILEX_E2E_PORT=8031 \
SILEX_RELEASE_EVIDENCE=/tmp/silex-release-visual-frozen \
SILEX_INTEGRATION_REPORT=/tmp/silex-release-chromium-frozen.json \
SILEX_INTEGRATION_OUTPUT=/tmp/silex-release-chromium-frozen \
npx --no-install playwright test --config playwright.integration.config.ts \
 --grep 'DRE release:|DRE review:|DRE:|navigation aliases converge|service completion persists|DRE lookup failure'
```

Firefox: mesmo comando com `SILEX_INTEGRATION_BROWSER=firefox`, porta 8032 e caminhos de report/output `firefox-frozen`. Desktop 1440×900 e móvel 375×812. Sem backend simulado para os fluxos monetários; interceptação de erro apenas no GET de descrição da jornada negativa.

## Reexecuções e falhas preservadas

[Execuções por cenário](evidence/browser-executions.json) separa três baterias de 24 por navegador. Rodadas 1 e 2 tiveram 22 PASS/2 FAIL cada por duas falhas de apresentação distintas, corrigidas sem enfraquecer testes. [Antes da descrição](evidence/chromium-before-description-fix.txt), [antes da prévia](evidence/chromium-before-preview-fix.txt); Firefox equivalente no mesmo diretório. A terceira bateria passou integralmente. Não somar as rodadas como 144 testes distintos nem apresentar as falhas intermediárias como falha residual.

Checkpoints frontend/build anteriores foram reexecuções durante as correções; somente o último log congelado é apresentado como versão final. Os 24 E2E contêm oito casos novos e 16 regressões existentes; desktop/mobile e engines são execuções, não novas regras financeiras.

## Histórico, CI e limites

A homologação anterior de `985e50c` foi localizada e seus 338 hashes conferidos. As **132 linhas de confronto sem divergência** são históricas, não foram rebatizadas como testes novos: [CSV](evidence/homologation-financial-comparison-historical.csv), [recibo](evidence/homologation-reference.json). HOM-22 continua pendente nos subcritérios humanos/físicos.

O workflow existente executa diff integral, backend/frontend/build, comparação legada, reinício e matriz principal agora com **338 casos por motor**, mais complementos (financeiro/fusos 30, transporte 8, datas/foco 35). O novo Draft PR acionará esse CI; resultados reais do HEAD definitivo serão registrados na descrição/checks, sem substituir logs históricos nem criar commits só para atualizar o próprio SHA. Os complementos sobrepõem-se à cobertura principal e não são somados como novos cenários únicos.

Não houve execução física de dispositivo/impressora/leitor de tela, teste contábil profissional, carga prolongada nem verificação do ambiente Railway remoto. Nenhuma promessa de disponibilidade/custo. [Gates](RELEASE-READINESS.md), [aceite humano](HUMAN-UAT-CHECKLIST.md).

## Integridade e segurança dos artefatos

Antes de commitar código: diff/staged revisados, `git diff --check` e Gitleaks stdin **zero achados** no incremento. O manifesto de evidências registra SHA-256; apenas dados sintéticos, sem SQLite, backups privados, token, cookie, senha real, cache, build ou dependências. As senhas de fixture já existentes no projeto não são credenciais públicas ou administrativas a provisionar.

Nenhum merge, deploy, migração persistente, provisionamento real, mudança de política econômica, fórmula financeira, guard de autorização ou propriedade. App/SQLite/volume/variáveis/usuários da Sammya não foram acessados ou alterados. Nova infraestrutura dos clientes não foi conectada nem modificada; estado remoto não confirmado por ausência de ferramenta autenticada disponível.

Cópias textuais de logs/CSVs foram normalizadas somente em finais de linha (LF) e espaços finais para o gate do diff. Originais permaneceram intactos nos diretórios locais. [Hashes antes/depois](evidence/archival-normalization.json); números, resultados e células não foram alterados. CSVs arquivados não são prova de identidade byte a byte do arquivo baixado; as asserções executadas operaram os downloads originais.
