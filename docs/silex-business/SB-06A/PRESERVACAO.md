# SB-06A — Preservação e recuperação

Baseline: `67cdee96fd17c3e653e478d10fccdcd5296d2740`; estado inicial limpo; branch `feat/sb06a-header-reflow` criada desse commit. Backup externo: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06a/silex-sb06a-fec5rg23`.

O snapshot inicial cobre 298 arquivos rastreados e 20 arquivos locais protegidos (banco/arquivos auxiliares e build). O backup contém os originais dos dois arquivos existentes alterados: `frontend/src/styles.css` e `docs/silex-business/PENDENCIAS.md`. Os demais são adições. O ZIP contém cópias desses originais e seus manifestos, sem banco, credenciais ou `.git`.

| Original | SHA-256 inicial |
| --- | --- |
| `frontend/src/styles.css` | `47b66021a877377d228067ace7cf20807cd16887288c965a12419d0063cd45da` |
| `docs/silex-business/PENDENCIAS.md` | `1550c071c7dff97e7db05b27a12c32b1feab9ce8667aa5d25b5b9a0998d2acbc` |

## Escopo

Somente o CSS do shell foi alterado em produção. App, hooks de menu/sessão, registro de rotas/permissões, todos os módulos, API/backend, modelos, migrations, cálculos, templates, fontes/SVGs e página pública conservam os hashes iniciais. O build do checkout e seu tsbuildinfo não foram reescritos. Testes de escrita operaram somente em SQLite descartável.

Foram verificados 296/298 arquivos iniciais sem alteração; os dois restantes são os arquivos autorizados acima. Os 20 arquivos locais protegidos continuam com hashes idênticos. O ensaio removeu com sucesso as 12 cópias dos arquivos novos, e os três bancos descartáveis passaram em integrity_check/foreign_key_check.

`preservation-test.json` contém a comparação de todos os arquivos iniciais, a lista de arquivos novos, verificação do backup e o ensaio de restauração. O manifesto SHA-256 final está em `docs/evidence/sb06a/manifest.sha256`; o ZIP tem manifesto interno de cada item e hash externo.

## Restauração ensaiada

Em um diretório temporário independente, copiaram-se os dois arquivos atuais e todos os novos arquivos autorais; aplicaram-se os originais do backup e removeram-se apenas as cópias dos arquivos novos. Os dois hashes restaurados coincidiram com o snapshot. Nenhum arquivo ativo foi restaurado ou removido.

Em uma reversão futura, conferir se existem edições posteriores antes de copiar qualquer original. Aplicar os dois originais do backup em uma nova alteração revisável e remover somente os arquivos novos enumerados em `preservation-test.json`, caso a intenção seja reverter integralmente o incremento. Também é possível preparar um `git revert` revisável dos commits identificados no pacote. Não se exige reset, clean ou reescrita de histórico. Evidências geradas e backups devem continuar preservados.

## Retomada

Após revisão, a recomendação é SB-06B para P01: mapear os diálogos existentes, definir acionador de retorno e validar fechamento/teclado em ambiente isolado antes de qualquer alteração. Esse incremento não foi iniciado e requer autorização explícita.
