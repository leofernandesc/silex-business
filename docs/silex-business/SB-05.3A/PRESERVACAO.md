# Preservação e recuperação — SB-05.3A

Baseline `b21a11769803eb0dcb86e470f641987bd1c3771a`; branch `feat/sb05-financeiro` inicialmente limpa. Git íntegro, sem histórico remoto a alterar. `main` não foi movimentada.

## Proteção adicional

Backup externo verificado antes de alterar fontes:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-3a/silex-sb053a-f1ssxh1t`

Originais: `frontend/src/financePlanning.tsx` e `docs/silex-business/PENDENCIAS.md`. O manifesto SHA-256 do backup corresponde ao snapshot inicial. Esses são todos os arquivos preexistentes alterados pelo incremento. CSS e teste novos devem ser removidos para a reversão funcional; documentação e evidências próprias podem permanecer como histórico.

Ensaio executado em outro diretório temporário: copiar as duas versões atuais, restaurar os dois originais do backup, remover reconciliation.css/reconciliation-interface.spec.ts e conferir os hashes originais. Resultado e caminho em preservation-test.json. O checkout ativo não foi restaurado durante o ensaio.

## Manifestos

baseline-sha256.json e after-sha256.json cobrem 2.323 arquivos preexistentes (incluindo dados/build/evidências ignorados); excluem .git, dependências, venv, caches, symlinks e os diretórios novos deste incremento. preservation-test.json distingue os dois originais modificados dos demais preservados. manifest.sha256 cobre individualmente os arquivos incluídos no pacote. zip.sha256 verifica o ZIP externo; commits.json/file-inventory.json registram versionamento e tamanho/hash dos novos arquivos.

Também foram comparados handlers, atributos de formulário, chamadas, estados e funções no AST TypeScript. Dashboard/relatórios/formulário de resolução conservam seu código exato. Nenhuma fonte compartilhada, backend, data/, contrato, template ou evidência histórica foi modificada.

## Procedimento de reversão, após revisão

1. Conferir branch, HEAD e alterações posteriores. Não sobrescrever trabalho novo; uma divergência exige revisão.
2. Verificar os SHA-256 do backup/manifesto. Copiar os dois originais de recovery/original no ZIP ou do backup externo para os mesmos caminhos do projeto.
3. Remover somente `frontend/src/reconciliation.css` e `frontend/tests/reconciliation-interface.spec.ts`, depois de verificar seus hashes e ausência de alterações posteriores. O import do CSS/helper desaparece com a restauração de financePlanning.tsx.
4. Conferir os hashes do baseline e executar build/testes em ambiente isolado. Registrar a reversão em novo commit explícito; nunca usar reset --hard, clean, force push ou reescrever histórico.
5. Documentação e scripts do SB-05.3A não afetam a execução e podem ser mantidos como histórico. Se for necessário restaurar o conjunto rastreado exato, revisar o inventário `file-inventory.json` e remover apenas seus arquivos novos, em commit de reversão. Não apagar evidências históricas.

Backend e banco não exigem restauração, pois permaneceram intactos. O backup permite recuperar todos os originais alterados; o ensaio também comprovou a remoção dos dois novos arquivos funcionais/de teste. Git continua sendo o mecanismo principal.

## Isolamento

Fontes do baseline foram extraídas por git archive; builds e testes usam `/tmp/silex-sb053a-f1ssxh1t`. A fixture foi criada pela API/seed existentes, com dados fictícios; clones independentes para capturas e operações. Nenhum banco do checkout foi copiado para o ambiente de testes. Quatro servidores próprios (18040–18043) têm PIDs/cwd registrados e encerramento condicionado à conferência de /proc. Servidores/evidências antigos não foram usados nem encerrados.
