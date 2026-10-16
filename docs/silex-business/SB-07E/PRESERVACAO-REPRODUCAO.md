# SB-07E — preservação, execução e recuperação

## Estado e proteção

Base62083832fff50c7641efbe61d54d0259dbea0476,493 arquivos rastreados. Backup local `~/.local/share/codex-backups/controlmax-inspired/sb07e/approved.tar`; SHA e manifesto `docs/evidence/sb07e/baseline.json`. Arquivo extraído e hashes conferidos antes dos testes. O ZIP externo não contém esse arquivo de fonte: o acervo histórico contém credenciais fictícias conhecidas, omitidas do pacote externo.

O backup cobre todos os arquivos preexistentes que poderiam ser modificados (neste incremento, somente PENDENCIAS.md entre os arquivos originais), mas não contém `.git`, bancos, uploads ou arquivos ignorados. A proposta de backup completo do repositório e refs está em GIT-INTEGRACAO.md e **não foi executada**. Não confundir recuperação de arquivos com continuidade operacional.

`recovery.py` ensaia em diretório temporário: copia a candidata, restaura os493 arquivos originais, remove somente os novos caminhos indicados e compara conjunto de arquivos+SHA-256. Nunca restaura sobre o checkout. Para reversão real futura: parar trabalho, revisar inventário, restaurar somente os caminhos autorizados e remover os novos arquivos SB-07E conforme manifesto; preservar Git/evidências e pedir decisão antes de alterar branches/commits. Não há dependências novas a reverter.

## Ambiente reproduzível

Requer checkout da base e ferramentas já instaladas: Python3/.venv, Node/npm e dependências locais, Firefox155 em cache, Chromium existente via Brave, Xvfb/XTest. Nenhuma instalação/atualização global foi feita. Compilação é artefato local ignorado, não alteração da fonte.

1. Gerar novo backup/baseline verificável com `tools/prepare.py` em base exata e branch esperada, sem sobrescrever backup existente. Em outra máquina ajustar destino novo, não apagar o backup histórico.
2. `tools/technical.py typescript build frontend` e `tools/technical.py backend` registram comandos/saídas em evidence/sb07e. Backend completo roda com PYTHONPATH=backend, PYTHONDONTWRITEBYTECODE e sem cacheprovider. Nenhum teste aponta ao banco persistente.
3. `tools/run.py` injeta **somente a senha fictícia histórica da fixture** no ambiente, sem imprimi-la. Não é credencial produtiva; em outro ambiente entregar credencial temporária por canal separado. Não registrar env/cookies/tokens/POST de login nos logs do pacote.
4. `runtime.py candidate --port 18094 --regression-fixture` extrai o backend aprovado em `/tmp/silex-sb07e-*`, serve frontend/dist e cria synthetic.sqlite3. Aguardar health200. Criar18095 por `--database-copy <tmp>/synthetic.sqlite3` para clone idêntico. Baseline e candidata possuem **os mesmos bytes de produção**, pois esta é uma auditoria sem alterações de produto; a comparação prova determinismo no recorte, não diversidade de implementação.
5. Executar financial_compare.py/export_compare.py históricos em modo leitura com SILEX_BASELINE/CANDIDATE/EVIDENCE; depois `output_dates.py`, `auth-safety.py`, `surfaces.cjs` e `stability.cjs`. `financial-flows.py` faz17 checkpoints de mutação somente nos clones temporários. APIs35/exports30 são comparados antes dessas mutações.
6. Instância8011 deve usar fixture independente. Para os testes de expiração, `--legacy-session-manifest` cria alias novo `/tmp/silex-sb04b-sb07e-*` que aponta exclusivamente ao SQLite temporário atual. Definir SILEX_SB04B_ENV no manifesto atual. Três testes originais de expiração não foram modificados.
7. Executar frontend/playwright.sb07e.config.ts. Regressões com page.route rodam em Chromium/Brave: o Playwright1.64 não é plenamente compatível com o Firefox155 instalado. Configurar SILEX_SB07E_CHROMIUM=1, MATCH, RESULTS e OUTPUT. Retries=0. `test_runner.py` cria árvore descartável de testes para proteger caminhos de capturas históricas embutidos nos testes antigos; redireciona resultados ao incremento atual e copia apenas imagens para a evidência nova.
8. Datas em fixtureVite18086; SILEX_SB07E_MATCH=sb07c-dates.spec.ts. Firefox18 casos e Chromium seleção7; header-reflow5Firefox. Para novos testes mutáveis, separar bancos por família. O lote de modais fecha caixa administrador; não reutilizar esse banco para testes que exigem caixa aberto. A rodada contaminada fica registrada, sem retries automáticos.
9. Zoom nativo: Xvfb **privado:1071**,1600×1200, Firefox viewport:null e atalhos XTest.1280CSS vira640/320 com DPR2/4 e CSSzoom1. `native-zoom.cjs` verifica teclado; `pointer-diagnosis.cjs` compara entrega automatizada com ponteiro real X11. Não usar esses scripts contra display do usuário.
10. Conferir `git diff --check`, hashes e recovery.py; gerar relatórios/galeria/ZIP e verificar manifesto/CRC/ausência de valores de credenciais. Encerrar somente PIDs lançados pelo instrumento e remover temporários descartáveis. Não publicar servidores loopback.

## Proveniência e limites

Fixture composta apenas pelos construtores sintéticos históricos SB-05.2/3A/3B; stdout de seed e dados de autenticação não são exportados. Credenciais conhecidas no histórico são inventariadas por localização, sem valores. O banco raiz real não foi aberto nem usado como fixture; não se afirma que foi comparado byte a byte antes/depois. Backend/contratos/datas/CSS/rotas/impressões/ativos são preservados por hash de todos os arquivos rastreados relevantes.

Networkidle é usado em testes históricos sem alteração de asserção, mas as sondas novas também esperam título, dados/ausência de carregamento, fontes e estado de sessão. Comparações com sessão errada ou carregamento não concluído são rejeitadas. Os logs de tentativas/falhas ficam locais, sem substituição silenciosa do acervo anterior.
