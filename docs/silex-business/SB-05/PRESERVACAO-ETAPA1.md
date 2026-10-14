# Preservação e recuperação — SB-05 etapa 1

Baseline: 61c744f4ea291a7f2872c8f3d78f4346e3943ce2; branch feat/sb05-financeiro inicialmente limpa. Manifesto inicial amplo em evidence/sb05-1/baseline.json, com arquivos ignorados/persistentes relevantes, sem ler registros empresariais para testes.

Backup externo:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-1/20261014T185534Z`

61 originais frontend conferidos em restauração temporária antes de editar. O original do documento central de pendências é recuperável do baseline Git imutável e incluído no checkpoint final, totalizando 62. Cópia do checkpoint acompanha o ZIP. Ele cobre todos os arquivos preexistentes alterados e lista os quatro novos frontend para remoção numa reversão controlada.

Mudanças preexistentes limitadas a frontend/src/ledger.tsx e docs/silex-business/PENDENCIAS.md. Novos: ledger.css, ledgerPresentation.tsx, ledgerPresentation.test.ts, tests/ledger-interface.spec.ts, documentos e scripts próprios. Nenhum outro arquivo antigo foi alterado ou removido.

Backend, banco/data, backups antigos, contratos, auth/perfis, App/shell/rotas/Home/público, SVGs/fonts/tokens, ui.tsx, styles.css, helpers monetários/datas, outras telas financeiras e evidências anteriores permanecem nos hashes iniciais. Estado/filtros Ledger e template de impressão são byte a byte iguais; chamadas/eventos comparados estruturalmente mantêm argumentos e handlers. O único formato novo é texto de conferência de datas/Entrada/Saída; valores e operações não mudam.

## Ensaio

Copiar arquivos atuais de teste para diretório temporário, restaurar os dois originais, remover os quatro novos frontend e comparar conjunto de caminhos e SHA-256 dos 62 originais. Nenhuma restauração no checkout ativo; nada precisa ser restaurado no banco.

## Procedimento de reversão, somente após revisão

1. Conferir manifest.json/final_hashes e alterações posteriores. Divergências exigem revisão manual.
2. Restaurar somente Ledger e PENDENCIAS de original/; remover somente os quatro arquivos frontend listados e conferidos.
3. Conferir hashes iniciais, executar as validações apropriadas em cópia isolada e registrar a reversão em novo commit na branch.
4. Manter documentos/evidências próprias como histórico; não apagar .git nem reescrever main/histórico. Não usar reset --hard/clean/force push.

Backups anteriores continuam intactos. Git é a origem principal das fontes; os backups são proteção adicional e não substituem uma política de backup operacional do banco. Sem push, merge ou deploy.
