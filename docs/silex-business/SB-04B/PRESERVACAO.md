# Preservação e recuperação — SB-04B

Baseline inicial: 1.489 arquivos, checkout sem Git. Backup externo:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb04b/20261014T165704Z`

Contém 60 arquivos originais do frontend e manifesto SHA-256. Cópia do checkpoint também acompanha o pacote de revisão. Foram ensaiadas restaurações antes e depois, somente em diretórios temporários. Todos os oito arquivos preexistentes alterados têm originais; os cinco novos são enumerados para remoção. Portanto, o backup permite restaurar integralmente os arquivos alterados pelo incremento.

## Comparação

Oito arquivos existentes mudam: três fontes (App, registro e default de navegação), cinco testes adaptados. Cinco arquivos novos são três fontes da Home e dois testes. Os outros 1.481 arquivos iniciais permanecem intactos; nenhum existente foi removido.

Backend, banco data/, migrações/contratos, APIs/credenciais/permissões, regras financeiras, catálogo/vendas/estoque/caixa/serviços, templates de impressão, fonte/SVGs/tokens/CSS global, Application/superfície pública, todos os componentes públicos e evidências anteriores mantêm seus hashes. No App, a região inteira a partir de function Login, incluindo DashboardPage, coincide byte a byte; apenas montagem de Home, menu e acompanhamento da consulta empresarial mudam acima dela. api.ts e useMobileNavigation.ts também permanecem byte a byte iguais.

Arquivos compilados dist e tsbuildinfo do checkout mantêm o baseline. As fontes testadas são idênticas ao checkout atual, conforme tested-source-integrity.json. Comparação de dez consultas read-only confirma equivalência de resumos e listas em bancos fictícios iguais. Fixtures funcionais de E2E, que realizam operações, são separadas das fixtures de captura.

## Reversão controlada

1. Parar novas edições; ler recovery-checkpoint/manifest.json e RESTORE.md.
2. Conferir final_hashes. Qualquer divergência posterior exige revisão; não sobrescrever automaticamente.
3. Copiar só os oito caminhos modified_existing de original/ para o checkout.
4. Conferir hashes e remover só os cinco new_files_to_remove_on_restore.
5. Conferir os 60 hashes iniciais e conjunto de caminhos do frontend contra o manifesto.

Documentos/evidências podem ficar como histórico. Não restaurar banco/backend: eles não foram alterados. A restauração foi ensaiada em /tmp, sem desfazer o checkout ativo. Não foi criado repositório alternativo. Nenhum deploy ou merge executado.

Manifestos: baseline.json, backup-manifest.json, backup-integrity-initial/final.json, preservation-test.json, tested-source-integrity.json, production.diff e FILES.sha256 no ZIP. O hash externo do arquivo ZIP está em SB-04B-review.zip.sha256; CRC e hashes do conteúdo são verificados na embalagem.
