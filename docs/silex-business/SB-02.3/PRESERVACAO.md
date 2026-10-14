# Preservação e recuperação

O baseline registra 273 arquivos existentes antes do SB-02.3. A conferência final encontrou somente uma alteração: frontend/src/styles.css. Os outros 272 arquivos existentes permanecem com o mesmo SHA-256, sem remoção. O manifesto abrange fontes, configs, dados, assets, dist e documentos anteriores; exclui dependências instaladas e caches conforme baseline.json.

## Áreas protegidas

- `backend/`: 34 arquivos, hashes preservados.
- `data/`: 3 arquivos, hashes preservados.
- `frontend/dist/`: 3 arquivos, hashes preservados.
- `frontend/public/`: 8 arquivos, hashes preservados.

App.tsx, ui.tsx, api.ts, types.ts, schemas/modelos e módulos operacionais permanecem byte a byte iguais. Nenhum contrato, chamada, handler, data ISO, cálculo ou regra foi editado. frontend/dist e tsconfig.tsbuildinfo do checkout foram preservados; o build ocorreu somente em /tmp.

## Backup

Checkpoint anterior à correção: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb02-3/20261014T041112Z`. Foram verificados 24 arquivos fonte de recuperação. styles.css foi restaurado em diretório temporário e conferido contra o hash inicial `124ee1bdd2ff17c428cf82d8e25fe62fce51c61f2f3718bece07c5e88a04afff`. Portanto, o backup restaura todos os arquivos de produção alterados pelo SB-02.3 (um arquivo).

Para desfazer a correção, copiar apenas original/frontend/src/styles.css do checkpoint para o checkout e conferir o SHA-256 acima. Não foi realizada restauração na aplicação ativa. Novos documentos/evidências não têm versão anterior; sua remoção seria uma decisão separada em uma reversão integral. Não há rollback de dados de produção a executar.

O pacote de revisão inclui o checkpoint SB-02.3 e o checkpoint SB-02.2 para rastrear os três estados. Os originais externos e os arquivos aprovados anteriormente permaneceram intactos.

## Evidências

- baseline.json — hashes iniciais e exclusões.
- preservation-test.json — comparação final e áreas fora de escopo.
- backup-integrity.json — hashes e ensaio de restauração.
- files-created-modified.json — lista completa de alterações e novos arquivos deste incremento.
- screenshots-manifest.json — dimensões e hashes, distinguindo tentativas descartadas.
- cleanup.json — servidores encerrados e bancos de teste removidos.

Instalações, node_modules, .venv e caches não são apresentados como integralmente revalidados por hashes; nenhum manifesto de dependências foi modificado. O ZIP não contém banco de produção nem seu conteúdo.
