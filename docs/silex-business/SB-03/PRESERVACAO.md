# Preservação e recuperação — SB-03

## Ponto de recuperação

Checkout sem `.git`; não há branch/status Git do projeto. Antes das alterações, registramos 1.074 arquivos e copiamos **44 arquivos existentes do frontend**, incluindo fontes/configurações/assets/dist, para:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb03/20261014T061326Z`

Todos foram restaurados em uma pasta temporária e conferidos por SHA-256 **antes de editar código**. Os backups SB-02.2 (5 arquivos) e SB-02.3 (24) também foram novamente verificados. Evidência: backup-integrity-initial.json.

O incremento altera três arquivos preexistentes de produção: App.tsx, api.ts e financePlanning.tsx. O checkpoint inclui os três. Arquivos novos não têm versão anterior; a reversão precisa remover somente os arquivos novos listados no manifesto, após conferir seus hashes.

A verificação final ensaia a restauração dos três originais e a remoção dos seis novos arquivos de código/testes **em uma cópia do candidato**, sem restaurar o checkout ativo. O hash de toda a árvore frontend resultante deve coincidir com a árvore original. Resultado e lista completa: backup-integrity-final.json, backup-manifest.json e preservation-test.json.

## Áreas protegidas

Manifesto final compara todos os hashes anteriores, incluindo backend/, data/, frontend/public/, frontend/dist/, tsconfig.tsbuildinfo e documentos/evidências SB-01/02.x. Apenas os três arquivos do frontend autorizados podem diferir. Documentação nova pertence a SB-03 e PENDENCIAS.md; nenhuma evidência histórica é editada.

styles.css, tokens, Brand, fontes Inter, SVGs oficiais, ui.tsx e módulos operacionais (exceto o callback de navegação de FinanceOverview) são preservados. Não mudam modelos, migrations, contratos, regras de autorização backend, campos empresariais, handlers financeiros, cálculos, templates ou persistência.

Build/testes executados nas cópias. Servidores em loopback leem apenas bancos descartáveis; a suíte backend usa suas fixtures temporárias. O manifesto protege o banco real por hash; não copia seu conteúdo para o pacote.

## Recuperação controlada

A cópia do checkpoint e as instruções RESTORE.md estão no pacote de revisão. Restaurar somente a relação modified_existing e remover new_files_to_remove_on_restore. Não executar restauração automática ou copiar indiscriminadamente todos os 44 arquivos sobre trabalho posterior do usuário.

Antes de restaurar, comparar arquivos atuais com os hashes finais do incremento; divergência posterior exige revisão manual. Conferir novamente os hashes iniciais após restaurar. Código e identidade voltam ao SB-02.3, sem rollback/migração de banco. Documentos novos podem ser conservados como histórico de revisão/reversão.

Caches/dependências são excluídos do manifesto conforme baseline.json. Não se afirma revalidação byte a byte de node_modules/.venv. Nenhum manifesto de dependências foi alterado. A integridade de assets/fontes e a ausência de chamadas externas são verificadas separadamente.
