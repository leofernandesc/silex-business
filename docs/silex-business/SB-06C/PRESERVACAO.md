# SB-06C — preservação e recuperação

Referência aprovada: `c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f`. Branch `feat/sb06c-accessibility`, criada diretamente dela, sem alterar main ou o histórico anterior. O checkout inicial estava limpo. O backup anterior à implementação contém todos os **329 arquivos versionados**, além do manifesto dos três arquivos do banco persistente (somente hashes do banco).

Backup local: `/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb06c/silex-sb06c-3md888q8`.

## Arquivos e escopo

Produção: somente `frontend/src/styles.css` e `frontend/src/styles/tokens.css`. Seletores específicos em media screen; novo token semântico roxo e dimensão compacta. Valores institucionais preservados. Não há mudanças em React/TypeScript operacional, handlers, componentes de dados, autenticação, permissões, navegação, cálculos, contratos ou backend. O CSS público não recebe seletores novos; capturas públicas são comparadas. Tokens adicionais não substituem cores de marca nem mudam propriedades de impressão.

Também muda o documento central PENDENCIAS.md. As adições são o teste E2E visual, scripts deste incremento e documentação SB-06C. A lista final está em `file-inventory.json`, no diff e no manifesto de recuperação. Evidências históricas permanecem intactas e seus ZIPs com SHA próprio são conferidos.

## Isolamento

`git archive` gerou cópias baseline/candidata sob `/tmp/silex-sb06c-3md888q8`. Build/TypeScript ocorrem nessas cópias; o dist do checkout não é reconstruído. As dependências instaladas são reutilizadas, sem instalação. As APIs utilizam cópias SQLite descartáveis de fixture comprovadamente fictícia; o banco persistente do projeto não é aberto pelos testes.

Suítes que encerram caixa precisam de fixture própria: o teste de confirmação de fechamento deixa o caixa do administrador fechado, enquanto testes antigos de venda pressupõem caixa aberto. Essa diferença de pré-condição deve ser mantida explícita, não corrigida no produto. As respostas financeiras comparadas vêm de duas cópias idênticas, anteriores às operações E2E.

## Ensaio e reversão

O script `scripts/preservation.py` recria o baseline inteiro em diretório temporário, aplica o incremento, restaura cada original a partir de `original/` e remove somente os arquivos novos listados no manifesto. Confere os 329 hashes aprovados e a ausência das adições. Não executa restauração no checkout real.

Para revisão de uma reversão futura:

1. Confirmar o HEAD e preservar qualquer trabalho posterior.
2. Conferir os hashes do backup e do manifesto.
3. Em cópia de recuperação, repor os dois CSS e PENDENCIAS.md nos mesmos caminhos relativos.
4. Remover apenas as adições enumeradas em `new_files_to_remove_on_rollback`, nessa cópia.
5. Conferir os 329 arquivos do baseline e executar build/testes antes de adotar a restauração.
6. No Git, preferir commits `revert` revisados se for necessária uma reversão real. Nenhum reset, clean, rebase destrutivo, push, merge ou deploy foi executado.

O ZIP inclui os originais efetivamente alterados, o manifesto e hashes; exclui .git, bancos, credenciais, dependências, caches, builds e traces extensos. O backup externo integral permite recuperar **todos** os arquivos alterados pelo SB-06C; as novas adições têm remoção documentada.
