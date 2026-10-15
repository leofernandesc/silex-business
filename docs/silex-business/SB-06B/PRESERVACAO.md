# SB-06B — preservação e recuperação

O baseline é `fc3498e938cd2eef127dd65161ee909d9f67dd73`, com 310 arquivos rastreados e workspace limpo. A branch feat/sb06b-modal-focus partiu diretamente dele; main e demais branches não foram alteradas. O mecanismo principal é Git; existe backup adicional com manifesto SHA-256, preparado antes das mudanças.

Backup local: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06b/silex-sb06b-zpnx9wb_`.

## Escopo

Arquivo de produção existente alterado: frontend/src/ui.tsx, somente integração do hook e contenção da propagação de cancel no Modal. Novo arquivo de produção: frontend/src/useModalFocus.ts. As demais funções compartilhadas de ui.tsx, incluindo Form, Field, Table e SummaryCard, são comparadas por AST/texto e permanecem idênticas. Contrato de props do Modal preservado.

Outro arquivo existente alterado: docs/silex-business/PENDENCIAS.md. Demais adições são testes, fixture de componente, scripts de evidência e documentação. ARQUIVOS.md e review.diff apresentam a relação final.

Backend, banco persistente/WAL/SHM, contratos da API, autenticação, permissões, navegação, cabeçalho/CSS/R02, cálculos, formulários, impressão, ativos de marca e página pública não recebem alterações. Os testes usam cópias descartáveis e a equivalência financeira é conferida em seis respostas de API usando a mesma fixture fictícia.

## Backup e ensaio

baseline.json registra hashes dos 310 arquivos aprovados e dos três arquivos do banco persistente. original/ conserva os fontes frontend e o documento central originais. manifest.json registra os originais efetivamente alterados, seus hashes e todos os arquivos novos que devem ser removidos em uma reversão.

O script scripts/preservation.py monta o baseline por git archive em diretório temporário, aplica as alterações atuais, restaura os arquivos existentes a partir do backup e remove somente as adições nesse diretório. Confere novamente os 310 hashes e a ausência das adições. A restauração do checkout real não é executada.

## Procedimento de reversão para revisão

1. Confirmar branch/HEAD e preservar qualquer trabalho posterior. Não sobrescrever alterações de outra pessoa.
2. Verificar os hashes dos originais no manifesto do backup.
3. Em cópia de recuperação, restaurar original/frontend/src/ui.tsx e original/docs/silex-business/PENDENCIAS.md nos mesmos caminhos relativos.
4. Remover, apenas nessa cópia, os arquivos listados em new_files_to_remove_on_rollback de manifest.json. Não remover dependências, banco, evidências anteriores ou diretórios inteiros.
5. Conferir os 310 hashes do baseline, TypeScript/build e testes relevantes antes de adotar a restauração.
6. Para manter histórico rastreável no desenvolvimento, uma reversão posterior também pode ser feita com commits git revert revisados. Nenhum reset/clean/rebase destrutivo é necessário e nenhum foi executado.

O ZIP inclui os originais dos dois arquivos existentes alterados e o manifesto, além das fontes novas/diff. Bancos, dependências, caches, dist e .git ficam excluídos. O backup externo continua disponível integralmente. Evidências históricas são preservadas; arquivos de revisão anteriores com checksum próprio são verificados pelo script.

Resultados definitivos do ensaio, hashes e contagens: preservation-test.json, baseline-sha256.json, candidate-sha256.json e MANIFEST.sha256 do pacote.
