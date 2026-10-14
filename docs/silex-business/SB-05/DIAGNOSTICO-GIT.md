# SB-05 — diagnóstico e proposta de primeiro histórico Git

**Estado: implementação financeira interrompida no requisito Git; nenhum código de produção modificado.**

## Resultado

Em 14/10/2026, o usuário confirmou: **o projeto nunca foi versionado**. Portanto, não existe um histórico Git anterior a recuperar. A aplicação atual é a fonte do primeiro baseline, caso sua criação seja explicitamente autorizada. Não afirmar que há um commit histórico do SB-04B.

O diretório `/home/leofernandesc/controlmax-inspired` não contém `.git`. `git rev-parse`, `git branch --show-current`, `git status`, `git remote -v` e `git log` retornam código 128: not a git repository. Branch, remotos, commits e alterações locais segundo Git não estão disponíveis. A pasta `.git` no diretório pessoal está vazia e tampouco é um repositório utilizável.

Foram procuradas cópias versionadas nas áreas de trabalho locais, backups do projeto e diretórios temporários relacionados. Os repositórios encontrados não demonstram vínculo com esta aplicação. O repositório personal-finance é outro projeto: sua árvore/histórico não contém os componentes Ledger/Home da Silex. Não foi reutilizado como origem.

Consultas de leitura aos repositórios das instalações GitHub acessíveis para silex, controlmax, gestao e erp não retornaram candidatos. finance retornou somente personal-finance. Busca pública pelo nome Silex encontrou projetos de terceiros sem relação comprovada; nenhum foi tratado como origem. A cobertura não abrange contas/máquinas externas não informadas; a confirmação do usuário resolve a inexistência de histórico anterior deste projeto.

## Estado aprovado preservado

- Os 13 hashes dos arquivos criados/alterados no SB-04B coincidem.
- Os 46 arquivos frontend usados nos testes coincidem com o manifesto aprovado.
- Os outros 1.481 arquivos do baseline anterior permanecem iguais, incluindo backend, banco e evidências anteriores.
- ZIP aprovado SB-04B: `643b9693a037a208db59a937943831c516e44053bfd281731dc561b89f92ec9f`, novamente conferido.
- Backup externo SB-04B: 60 originais verificados. Continua permitindo recuperar os oito alterados e remover os cinco novos conforme o procedimento aprovado.

Verificações são de integridade, não uma nova execução de testes funcionais. Build/E2E/refinamento financeiro não foram iniciados. P02/P05/P06 e o registro central de pendências não foram alterados.

## Proposta concreta, ainda não executada

1. Com autorização explícita, inicializar Git **no diretório existente** da aplicação. Nenhuma origem fictícia, transplante de histórico de outro projeto ou cópia concorrente.
2. Revisar as exclusões antes do primeiro staging: bancos, dados/uploads privados, capturas da referência, .env/segredos, caches/dependências, dist/tsbuildinfo, traces/logs temporários e ZIPs gerados. Preservar todos no filesystem conforme necessário; ignorar não significa apagar.
3. Revisar os arquivos candidatos e seu conteúdo; adicionar somente fontes, testes, configurações e documentação autoral adequados. Scripts de validação futuros devem ficar em caminhos versionados; evidências geradas permanecem no pacote externo. Não executar git add indiscriminado.
4. Registrar o **SB-04B aprovado como primeiro commit**, com a identidade Git confirmada antes do commit. Isso estabelece histórico novo a partir do estado existente, sem alegar que recuperou commits inexistentes.
5. Criar um marcador `sb04b-aprovado` e a branch `feat/sb05-financeiro` a partir desse baseline. Desenvolver somente nessa branch. Nenhum remoto/push é necessário para o versionamento local; definir remoto requer uma origem fornecida/aprovada.
6. Manter os backups verificáveis; somente então iniciar a auditoria/capturas/testes e os ajustes autorizados em Lançamentos. P02 de Pagar/Receber deve ser documentada se sua correção exigir outra tela, conforme o limite do SB-05.

Manifesto de fontes candidatas: `docs/evidence/sb05/git-diagnostic/candidate-source-baseline.json`. É uma proposta de arquivos e hashes, não staging nem auditoria concluída de segredos. `.gitignore` também permanece intacto nesta etapa.

## Decisão necessária

A seção 1.1 proíbe `git init` automático e exige interromper se a origem não puder ser recuperada com segurança. A confirmação de que nunca houve versionamento esclarece a origem, mas não é uma instrução explícita para inicializar Git. Solicita-se autorizar a proposta acima antes de criar o primeiro histórico e continuar o SB-05.

## Arquivos desta entrega

Somente este diagnóstico e seus JSON/manifestos/ZIP em `docs/evidence/sb05/git-diagnostic`. Não há branch, commit, diff de implementação ou refinamento financeiro para revisar ainda. Nenhum merge, push, deploy ou alteração de dados/código foi executado.
