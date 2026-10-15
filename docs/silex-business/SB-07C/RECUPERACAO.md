# SB-07C — preservação e recuperação

## Ponto de recuperação

- Base aprovada: `fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8` (SB-07B).
- Arquivo local completo: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb07c/approved.tar`.
- SHA-256: `d52725968075b9d1b3219a16489b2a01532497a0bb8d431d2e726489caee91b8`.
- Contém os 446 arquivos versionados aprovados; não contém banco de clientes ou `.git`. Os manifestos históricos anteriores permanecem intactos.

O backup local permite restaurar **todos os arquivos originais alterados**. `tools/recovery.py` copia a candidata para um diretório temporário, restaura o arquivo aprovado, remove somente os novos caminhos do incremento e compara o conjunto completo de arquivos e hashes com o baseline. `restoration-test.json` registra o resultado e a relação de arquivos novos. Nenhuma restauração foi aplicada sobre o checkout de desenvolvimento. Na cópia restaurada, `npm ci --offline --ignore-scripts --no-audit --fund=false`, build e **96 testes frontend do baseline** passaram, comprovando também o retorno do lockfile/dependências sem alterar o ambiente atual.

## Reversão futura, sujeita a revisão

1. Interromper o uso do ambiente de desenvolvimento e verificar branch, HEAD, `git status` e alterações posteriores. Preservar qualquer trabalho novo antes de reverter.
2. Conferir SHA do arquivo e os hashes candidatos; não sobrescrever arquivos que tenham divergido desde a revisão.
3. Em diretório temporário, extrair o backup e conferir os 446 hashes do `baseline.json`.
4. Restaurar somente os caminhos modificados de `file-inventory.json`, após comparar o diff; remover os arquivos adicionados listados no mesmo inventário. Isso inclui componentes, CSS local, fixtures e instrumentos novos. Manter cópia da documentação/evidência de revisão fora da árvore revertida.
5. Restaurar juntos `frontend/package.json` e `frontend/package-lock.json`. Usar `npm ci` no ambiente de desenvolvimento para recompor as dependências do lockfile aprovado; não apenas remover imports de dependências novas.
6. Executar TypeScript, build e regressões pertinentes. Registrar a reversão em novo commit na branch apropriada. Nenhum reset, clean, rebase, push ou merge é necessário.

O Git mantém integralmente a base e os commits SB-07C. A `main` continua no baseline histórico; não serve como origem de reversão deste incremento.

## Limites do pacote externo

O ZIP contém manifestos, diff, fontes novas e evidências selecionadas, não uma cópia completa do projeto. O arquivo de recuperação completo permanece **local**, pois inclui testes/documentação históricos com credenciais fictícias de demonstração. O ZIP não inclui credenciais nem banco. Uma cópia legítima do repositório e acesso ao commit aprovado ou ao backup local são necessários para restauração integral.

Nenhum teste usa banco persistente: os servidores são preparados de um snapshot do backend aprovado com SQLite temporário, vinculados somente a 127.0.0.1. O backend, contratos, autenticação, permissões, rotas, cálculos, CSS global, shell e impressão são conferidos por hash. As expressões `api(...)` e callbacks assíncronos de salvamento dos sete consumidores são comparados por AST. Não se atribui ao manifesto uma auditoria de segurança ou um backup de dados que não foi realizado.
