# SB-07C — reprodução técnica

Requer checkout com o histórico aprovado, dependências do lockfile e navegadores de teste já disponíveis. O ZIP é material de revisão, não instalador nem pacote de deploy.

## Pré-condições

1. Conferir a base SB-07B `fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8` e a branch `feat/sb07c-ptbr-dates`.
2. Conferir o backup/manifesto conforme RECUPERACAO.md. `docs/evidence/sb07c/baseline.json` aponta para o backup local original. Em outra máquina, criar uma cópia de comparação a partir do commit aprovado, verificar os hashes de conteúdo e registrar um manifesto novo; não sobrescrever a evidência histórica.
3. Compilar o frontend aprovado em uma cópia temporária e guardar seu `dist` em `docs/evidence/sb07c/baseline-dist`. Compilar o frontend candidato normalmente. Builds não acompanham o ZIP.
4. Fornecer a senha exclusivamente fictícia da conta demonstrativa em `SILEX_TEST_PASSWORD` por canal local seguro. Não executar os instrumentos com credenciais ou banco reais.

## Ambientes

- `python3 docs/silex-business/SB-07C/tools/runtime.py baseline --port 18084`
- `python3 docs/silex-business/SB-07C/tools/runtime.py candidate --port 18085`
- Regressão antiga, que exige títulos paginados e estados OFX: `python3 docs/silex-business/SB-07C/tools/runtime.py candidate --port 8011 --regression-fixture`. O construtor lê fases sintéticas históricas sem alterar seus arquivos. A base simplificada seed-demo **não satisfaz** as pré-condições dessas suítes.
- Para comparação dirigida dos testes antigos: a mesma variante baseline pode ser iniciada na porta 8012 com `--regression-fixture`, exigida por `tools/compare_legacy_regressions.py`.
- Fixture isolada de componentes: no diretório frontend, `node node_modules/.bin/vite --host 127.0.0.1 --port 18086 --strictPort`.

Os servidores encerrados por SIGTERM removem seus diretórios temporários. Cada porta tem log/manifesto próprios; nunca se reutiliza um banco de cliente. Diretórios restantes de execução interrompida devem ser identificados pelo manifesto e removidos somente após conferir o conteúdo e confirmar que nenhum processo os utiliza.

## Comandos

No frontend:

- `npm test` — unitários/SSR.
- `npm run build` — TypeScript e Vite.
- `node node_modules/.bin/playwright test --config playwright.sb07c.config.ts` — componentes, piloto, migração e visual. Requer ambos os servidores e a fixture Vite.
- `SILEX_SB07C_CHROMIUM=1 node node_modules/.bin/playwright test --config playwright.sb07c.config.ts` — Chromium já instalado via Brave, perfil descartável. Não usa o perfil pessoal.
- `node node_modules/.bin/playwright test --config playwright.sb07c-regression.config.ts` — seleção de regressões existentes no servidor 8011.
- `SILEX_SB07C_MOBILE=1` seleciona a largura móvel; `SILEX_SB07C_REGRESSION_MATCH` restringe os arquivos por vírgula; `--grep` restringe cenários.
- `SILEX_SB07C_RESULTS` escolhe o JSON e `SILEX_SB07C_ARTIFACTS` escolhe o diretório de artefatos. Usar caminhos distintos em execuções concorrentes; não compartilhar o diretório de traces.

Na raiz:

- `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q` — fixtures temporárias da suíte backend.
- `node docs/silex-business/SB-07C/tools/inventory.cjs docs/evidence/sb07c/input-inventory-candidate.json`
- `node docs/silex-business/SB-07C/tools/preservation.cjs`
- `node docs/silex-business/SB-07C/tools/accessibility.cjs`
- `python3 docs/silex-business/SB-07C/tools/recovery.py`
- `git diff --check`

## Zoom nativo

O instrumento `tools/native_zoom.cjs` usa Firefox com `viewport:null` em uma sessão X11 **privada** `:1067`, por Xvfb já disponível, e `native_keys.py` envia atalhos somente a esse display. Exige iniciar `Xvfb :1067 -screen 0 1280x1024x24 -nolisten tcp`. Executar `node docs/silex-business/SB-07C/tools/native_zoom.cjs`, com a senha fictícia no ambiente, e encerrar somente o Xvfb dessa execução.

DPR, largura de viewport e CSS zoom são registrados: DPR 1→2→4, CSS zoom 1. Teclado edita/seleciona datas e fecha calendário/modal; hit-test DOM registra que o acionador está descoberto. Um clique automatizado do Playwright em janela com zoom nativo apresentou coordenada incorreta, enquanto o hit-test confirmou o alvo; a validação nativa final é por teclado. Mouse/toque em zoom nativo e leitor de tela real continuam como homologação manual, sem substituir os testes normais de ponteiro.

Não instalar navegador ou programa de sistema para reproduzir automaticamente. Adaptar caminhos de executáveis já instalados via `GESTAO_FIREFOX_PATH`; um segundo navegador indisponível deve ser registrado como limitação.
