# Versionamento da Silex Business

## Origem do histórico

O usuário confirmou que esta aplicação nunca havia sido versionada e autorizou explicitamente a inicialização Git no diretório existente em 14/10/2026. Não existe histórico original recuperado, remoto fornecido ou vínculo com outro projeto Git.

O primeiro commit, `chore: establish Silex Business SB-04B baseline`, representa **o estado consolidado e aprovado do SB-04B**. Não representa commits individuais dos incrementos SB-01 a SB-04B. Os relatórios anteriores continuam registros históricos sem alteração.

A inicialização não modifica arquivos funcionais, banco ou configurações da aplicação. Somente `.gitignore`, documentação de versionamento e metadados internos Git são preparados. Antes do commit, os hashes são comparados às evidências aprovadas e os arquivos do índice são inspecionados por caminho, tamanho e conteúdo.

## Branches e revisão

- `main`: primeiro baseline aprovado; não desenvolver diretamente nesta branch.
- `feat/sb05-financeiro`: criada a partir do primeiro commit e selecionada, ainda sem desenvolvimento financeiro.
- Não há remoto configurado. Push, merge e deploy exigem autorização específica.
- Não usar reset/clean destrutivos para remover divergências. Preservar alterações locais e discutir diferenças antes de sobrescrever.

O hash inicial, o estado final das branches, a lista dos arquivos rastreados e as verificações de preservação estão no relatório local `docs/evidence/git-initialization/RELATORIO.md`. Para consultar o commit raiz:

```bash
git log --reverse --oneline
git rev-list --max-parents=0 HEAD
git status --short --branch
git branch -v
```

## Política de arquivos

Versionar código próprio, testes, configurações públicas, ativos oficiais licenciados, documentação autoral e scripts de validação revisados. Nunca adicionar arquivos indiscriminadamente. Antes de cada commit, verificar `git diff --cached --stat`, caminhos, tamanhos, conteúdo e exclusões; conferir que não há segredos ou dados reais.

`.gitignore` exclui dependências instaladas, caches, builds, tsbuildinfo, bancos e seus WAL/SHM/journals, dados/uploads, backups locais, ambientes sensíveis, chaves/credenciais, logs, traces/pacotes de revisão e arquivos temporários. Exemplos `.env.example`/`.env.sample` são elegíveis somente se realmente não contiverem segredos e após revisão.

Evidências geradas e capturas privadas permanecem no filesystem para revisão, fora do histórico Git. As exceções de `docs/evidence/<incremento>/scripts/` permitem somente scripts autorais `.py`, `.cjs`, `.mjs` e `.ts` diretamente nessa pasta; fontes de terceiros em `reference/`, checkpoints e resultados continuam ignorados. Novos scripts devem ser revisados e podem ser colocados em `scripts/`. Não criar código mutável em outros caminhos ignorados.

Constantes de login em seed/testes e exemplos da documentação são exclusivas da demonstração fictícia, já presentes no estado aprovado. Não são credenciais de produção e não devem ser utilizadas em contas reais. Tokens de sessão, senhas reais, chaves PIX de clientes, bancos, capturas da aplicação original e arquivos empresariais não são versionados.

## Preservação e recuperação

Os backups e manifestos SHA-256 dos incrementos anteriores permanecem intactos. Novo manifesto anterior à inicialização e cópia da `.gitignore` original estão no checkpoint externo informado pelo relatório.

Git não substitui backup de banco. Restaurar fontes ou recuperar dados exige seu procedimento próprio; esta inicialização não altera nem migra dados. Antes de desfazer qualquer alteração futura, conferir os hashes e evitar sobrescrever trabalho posterior.

## Limite desta entrega

A branch financeira está preparada, mas seu desenvolvimento continua condicionado à próxima autorização explícita. Nenhum refinamento P02/P05/P06, operação financeira, build, migração, push, merge ou deploy integra esta inicialização.
