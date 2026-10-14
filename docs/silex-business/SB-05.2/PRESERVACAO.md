# Preservação e reversão — SB-05.2

Baseline consolidado aprovado SB-05.1: `5e745062d2f015faecc1ad48e8a657e8f9d63f2b`, branch feat/sb05-financeiro inicialmente limpa. main permanece no commit raiz 61c744f. Sem histórico reescrito, push, merge ou deploy.

Manifesto amplo inicial registra 2.001 arquivos existentes, inclusive dados/build/evidências ignorados. Só finance.tsx e PENDENCIAS.md podem diferir. Backend, data/banco, contratos, credenciais, auth/permissões, App/menu/Home/público, regras de estoque/venda/financeiras, outros módulos, templates, SVG/Inter/tokens, build do checkout e evidências anteriores têm seus hashes comparados.

## Backup

Backup externo próprio:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-2/20261014T200547Z`

66 originais frontend/documento central conferidos antes das alterações. Ensaio final em diretório temporário: copiar fontes atuais, restaurar os dois preexistentes alterados, remover accounts.css/financePresentation.test.ts/accounts-interface.spec.ts e conferir conjunto/SHA-256 dos 66 originais. Nunca restaurar o checkout ativo durante a validação.

O ZIP contém os dois originais realmente necessários e manifesto dos 66. O backup completo permanece externo. Documentação/evidências próprias podem permanecer como histórico após reversão.

## Procedimento, somente após revisão

1. Conferir branch, baseline, manifest.json/final_hashes e alterações posteriores. Se houver divergência, revisar antes de restaurar.
2. Restaurar frontend/src/finance.tsx e docs/silex-business/PENDENCIAS.md de recovery-checkpoint/original ou do backup externo conferido.
3. Remover somente os três new_frontend_to_remove listados, após conferir seu conteúdo/hash e ausência de alterações posteriores.
4. Conferir hashes do baseline, validar em ambiente isolado e registrar a reversão em novo commit. Não usar reset --hard, clean, force push ou reescrever main.
5. Banco/backend não precisam de recuperação: não sofreram alterações neste incremento.

Git é o mecanismo principal; backups complementam a proteção. Backups/manifestos de incrementos anteriores são preservados.
