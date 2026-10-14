# Preservação e recuperação SB-04A

Antes das edições: baseline SHA-256 de 1.309 arquivos e cópia de 50 arquivos frontend em `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb04a/20261014T125106Z`. Os 50 foram restaurados/verificados em /tmp; checkpoint SB-03 revalidado. Sem .git/branch do projeto, sem inicialização de outro repositório.

Manifesto final espera somente quatro arquivos existentes modificados: main.tsx, navigation/useAppNavigation.ts e testes app.spec.ts/navigation.spec.ts. Todos os demais existentes devem manter hashes, incluindo frontend/App.tsx/api.ts/styles.css/index.html, backend/, data/, public/, dist/tsbuildinfo, contratos, templates e histórico SB-01–03.

Os dez novos arquivos de código/teste pertencem a Application, surfaces, public/* e public.spec.ts. Recuperação: restaurar os quatro originais e remover somente os dez caminhos novos listados, após comparar hashes finais contra trabalho posterior. Ensaio executado em cópia temporária; a árvore frontend restaurada deve coincidir integralmente com os 50 arquivos iniciais.

Nenhuma restauração foi executada no checkout ativo. Evidências/documentos novos podem permanecer como histórico. Não há rollback de dados ou migração a executar. O checkpoint com manifest/RESTORE.md integra o pacote, sem incluir banco real.

Build/TypeScript/Playwright/pytest ocorrem em fontes e bases descartáveis. Dist e tsbuildinfo ativos são preservados. A prévia local retém um banco próprio de demonstração enquanto estiver disponível; não lê data/ do projeto. Servidores de teste são encerrados ao concluir, conforme cleanup.json; preview.json identifica a única prévia mantida.

Dependências e caches são excluídos conforme baseline.json; nenhuma dependência foi instalada ou manifesto de pacotes alterado. Os hashes protegem todos os arquivos anteriores sujeitos ao escopo, não afirmam auditoria integral de node_modules/.venv.

Conferências: preservation-test.json, backup-integrity-final.json, tested-source-integrity.json, files-created-modified.json, asset-integrity.json e FILES.sha256. A prévia não é deploy nem artefato de distribuição de produção.
