# SB-05.4 — Preservação e recuperação

## Estado inicial

- Branch: `feat/sb05-financeiro`.
- HEAD aprovado: `86192c26797056f90828a0d957e1ebf950d5bebc`.
- `git status`: limpo antes da implementação.
- Snapshot SHA-256: 294 arquivos rastreados, salvo no backup externo `baseline-sha256.json`.
- Commit da implementação: `50ef1ac4aac15da7f28b0ea6816743fb84fd0042`.

## Backup

Backup externo: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-4/silex-sb054-l_r00if0/`.

| Arquivo original protegido | SHA-256 inicial |
|---|---|
| `frontend/src/ledger.css` | `f030016aa91b39bce9b97a4076656b1d1f1172afd606e65b0ec16b3752d1da6c` |
| `docs/silex-business/PENDENCIAS.md` | `84e1e3c5abcbd24c536a5db27c23894fec7fd33cbbd605906561362975196f6d` |

O manifesto do backup confirma os mesmos hashes. O novo teste E2E é aditivo e não substitui arquivo existente.

## Escopo e preservação

O diff de produção limita-se ao CSS de Lançamentos. O segundo arquivo de frontend é um teste novo. Não há mudanças em `SummaryCard`, `styles.css`, Dashboard Financeiro, API, backend, banco, modelos, autenticação, permissões, rotas, cálculos ou templates. Os testes de criação/estorno foram executados somente no banco descartável da cópia de testes.

## Ensaio de restauração

A restauração foi ensaiada em diretório temporário independente: as cópias originais de `ledger.css` e `PENDENCIAS.md` foram aplicadas ao destino temporário e seus hashes coincidiram com o manifesto inicial; o arquivo novo `ledger-summary-responsive.spec.ts` foi removido apenas desse destino de ensaio. Nenhum arquivo no projeto ativo foi restaurado ou removido.

Para reverter manualmente, copiar os dois arquivos originais do diretório `original/` do backup para seus caminhos, em uma nova alteração revisável. Para remover o teste novo, excluir `frontend/tests/ledger-summary-responsive.spec.ts`. Não é necessário resetar Git nem apagar evidências.

O manifesto final SHA-256 dos arquivos de código, documentos e do pacote está em `docs/evidence/sb05-4/manifest.sha256`; o ZIP possui um manifesto interno dos itens entregues.
