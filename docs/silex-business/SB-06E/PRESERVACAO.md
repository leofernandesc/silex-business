# Preservação e recuperação

Baseline `dfa489a49fd7c59e6ca89a1ce6824f2f0a42ee35`, 395 arquivos rastreados. Backup externo em `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06e/silex-sb06e-l_2u6njd/`: `approved.tar`, `baseline.json`, `original/docs/silex-business/PENDENCIAS.md` e manifesto final. O arquivo Git foi gerado antes de qualquer edição, SHA-256 `0794b922e7043b7e44b5f7ff2c4221673be8ef4b6c3d3c7b3dd28080690e70af`.

O backup permite recuperar **todos os arquivos alterados por este incremento**. Somente PENDENCIAS.md é um arquivo preexistente modificado; fontes novas são documentos/instrumentos. Nenhum arquivo funcional pode diferir do baseline: o verificador rejeita diferenças além dessa lista, inclusive em CSS, React, backend, configurações e contratos rastreados. Banco persistente/WAL/SHM e ZIPs anteriores são conferidos por hash e nunca abertos para operações/testes.

O ensaio `scripts/preservation.py` extrai o arquivo aprovado em diretório temporário, aplica os arquivos alterados/novos, restaura o original, remove exatamente as fontes novas registradas e compara os **395 hashes**. Não usa reset/clean/rebase nem altera checkout/banco durante o ensaio. `preservation-test.json` registra a lista efetiva, a cadeia de branches, os hashes e o resultado. Evidências geradas de SB-06E são ignoradas pelo Git e permanecem em pasta própria; as anteriores não são sobrescritas.

## Reversão sob decisão explícita

1. Interromper atividades no checkout; registrar HEAD/status e preservar cópia do trabalho posterior. Não aplicar este procedimento sobre alterações posteriores sem comparar.
2. Conferir SHA do arquivo e os hashes dos originais com baseline.json. Extrair **em diretório temporário** e comparar com o checkout.
3. Para reverter somente a documentação atual, restaurar PENDENCIAS.md do backup; remover apenas os caminhos `new_files_to_remove` após inspeção. Preservar ou arquivar a pasta de evidências SB-06E. Não apagar evidências de incrementos anteriores.
4. Alternativamente, criar um novo commit de reversão dos commits SB-06E após revisão, mantendo o histórico. Nunca executar reset/clean/force.
5. Executar o verificador no diretório temporário para conferir todos os arquivos aprovados. Banco não precisa de restauração: não foi alterado. Não copiar backups que contenham sessões/dados para pacote público.

O ZIP contém apenas o original do documento efetivamente alterado e seu hash, não o arquivo completo do repositório: este inclui testes históricos com senhas de demonstração. Não acompanha banco, `.git`, credencial, cache ou build. O manifesto SHA interno cobre os itens efetivamente enviados. Este ensaio de arquivos não equivale a um plano de recuperação de desastre de uma implantação comercial, que ainda deve ser homologado.
