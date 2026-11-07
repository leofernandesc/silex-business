# Módulo opcional de transportadora

## Resultado e base

A autorização usa a capacidade `transport_operations`, além de conta ativa e papel `admin`. Nenhuma autorização de interface ou API compara username. Ausência de capacidade significa acesso somente ao ERP genérico.

Esta branch parte de `origin/main` em `7214ad2543e0e980366a386b27cc7bbb39eddb32`. O trabalho independente de formulários em `fix/forms-usability-system-review` (`6c873d0`) foi preservado no checkout original e **não** está incluído neste PR. O guia de workflow havia sido retirado da árvore pública; foi consultada sua versão histórica sem restaurar documentação interna.

## Persistência e autorização

A migração aditiva **0013**, após 0012, acrescenta `users.transport_operations`, booleano não nulo com default `false`. Todos os usuários existentes permanecem com os mesmos IDs, hashes de senha, papel e situação. Nenhuma conta é provisionada pela migração, startup ou seed. Nenhuma tabela de negócio é reescrita.

Login, `/api/auth/me` e gestão de usuários retornam `capabilities: []` ou `["transport_operations"]`. O booleano interno não é retornado como campo editável. `UserInput` rejeita tentativas de conceder capacidades pelo navegador. O servidor consulta o usuário da sessão em cada requisição; revogação da capacidade ou alteração de papel não depende de logout para bloquear novas operações. Conta inativa e sessão ausente continuam recebendo 401; operador e administrador sem módulo recebem 403 nas operações especializadas.

A gestão normal de usuários continua funcionando. A lista identifica quem tem o módulo, mas não permite a um administrador genérico concedê-lo a si mesmo. Nesta versão, a concessão ocorre somente pelo procedimento administrativo interativo abaixo.

## Recursos efetivamente protegidos

|Recurso|Admin genérico / Demo|Admin com módulo|
|---|---|---|
|Clientes comuns e endereço cadastral|Mantidos|Mantidos; formulário especializado preserva endereço cadastral omitido|
|Coleta, entrega e Local/Interestadual|Não retornados nem editáveis; payload direto negado|Dois endereços completos, dados associados ao próprio `user_id`|
|Frete subcontratado|Rota ausente; URL recusada; catálogo exclui fretes; filtro explícito e escrita negados|Cadastro operacional disponível|
|Diaristas e fornecedores genéricos|Mantidos, inclusive contratação por diária e PIX|Mantidos|
|Custos de frete em serviço|Não pode adicionar frete nem editar/gerar/cancelar pedido que o contenha|Permitidos somente nos pedidos da própria identidade|
|Pedidos históricos com frete|Resumo, valores totais e títulos continuam visíveis; linhas operacionais de frete ficam ocultas e alterações bloqueadas|Detalhes operacionais apenas ao criador com módulo; outros usuários recebem a mesma proteção|
|Financeiro histórico|Consultas, valores, IDs, títulos, baixas, estornos e relatórios gerais preservados|Mesmo financeiro geral|
|Novos vínculos de beneficiário de frete|Negados em títulos, movimentos do livro caixa e criação de lançamento por OFX|Permitidos pelas regras financeiras existentes|
|Filtro específico de frete em financeiro, impressão, relatórios/CSV e orçamento|Controle ausente e requisição direta negada|Disponível|

**Propriedade:** `customer_service_details` continua isolada por `(customer_id, user_id)`. Uma conta com módulo não recebe dados particulares de outra identidade. Custos operacionais de frete em pedidos usam o `user_id` criador do pedido, sem redefini-lo. O cadastro de prestadores não possuía proprietário individual: continua sendo catálogo compartilhado da instância, agora acessível somente a contas com módulo quando o tipo é frete. O módulo não constitui multitenancy.

**Histórico financeiro:** não se filtram fretes das consultas financeiras gerais. Não se recalculam ou escondem custos totais para fazer o resumo coincidir com linhas operacionais ocultas. A resposta de pedido informa `restricted_transport_costs` para impedir que um formulário sem essas linhas as elimine ao salvar. Em pedidos restritos, use a consulta financeira geral para o histórico; habilitar nova identidade não transfere a propriedade operacional antiga.

O construtor de fornecedores herdava `service_details` de Clientes e tentava enviá-lo ao modelo Supplier, causando erro. O ajuste local exclui esse campo e rejeita metadados especializados nesse cadastro. Não incorpora as outras normalizações ou mudanças da branch independente de formulários.

## Demo e dados anteriores

`demo.restricted.admin` permanece administrador genérico; não recebe capacidade automaticamente e não tem senha alterada. O comando de provisionamento recusa usar essa identidade como origem de Sammya.

Metadados de transporte anteriormente associados à Demo são **preservados e ficam indisponíveis à Demo**, pois ela não possui mais o módulo. Criar Sammya não move esses registros. Pedidos especializados de outra identidade também não passam a ser propriedade de Sammya. Recuperação, transferência ou liberação de dados antigos exige procedimento separado, com inventário, backup e autorização explícita. Não excluir/recriar contas para tentar obter seus dados.

## Provisionamento seguro de Sammya

Nenhum banco persistente foi acessado ou alterado durante o desenvolvimento. O procedimento foi exercitado somente em bancos SQLite descartáveis. Não foi criado usuário na Railway.

Antes de executar em um ambiente autorizado:

1. Identificar a instância e obter autorização para o banco alvo. Conferir contas anteriores associadas à pessoa, os respectivos IDs e vínculos. O preflight detecta possíveis usernames/nomes anteriores e interrompe a criação implícita se houver ambiguidade.
2. Gerar um backup SQLite consistente com a CLI existente e ensaiar restauração em local descartável. Preservar anexos: na arquitetura atual eles estão no SQLite; `backup-bundle` também fornece sua representação separada.
3. Aplicar 0013 após backup, em processo único, sem seed. Em Railway, volumes precisam estar montados em runtime. Não executar esses comandos localmente presumindo que operam no contêiner remoto. Esta entrega não autoriza conexão, migração ou deploy na Railway.
4. Executar a CLI em terminal autorizado, com `GESTAO_DATABASE_URL` explícito apontando para arquivo SQLite absoluto, existente e migrado. Não aceita senha em argumento, variável ou pipe. A confirmação e `getpass` precisam de TTY. Se o terminal não conseguir desabilitar o eco, a CLI falha sem recorrer à leitura insegura.

Exemplo local de procedimento, **somente após autorização e com caminhos ajustados**:

```sh
export PYTHONPATH="$PWD/backend"
export GESTAO_DATABASE_URL='sqlite:////absolute/path/authorized-instance.sqlite3'
.venv/bin/python -m app.cli backup --output /secure/backup-before-module.sqlite3
# Conferir backup e ensaiar restauração antes da atualização.
.venv/bin/python -m app.cli init
.venv/bin/python -m app.cli provision-sammya
```

- Conta nova: username `sammya`, papel `admin`, ativa, com módulo; senha exclusiva digitada duas vezes, validada pela política atual e protegida com Argon2.
- Conta `sammya` existente: preserva ID e senha, habilita o módulo/papel/atividade após confirmação.
- Conta anterior com outro username: após verificar identidade e vínculos, usar `provision-sammya --existing-user-id 42` (ID meramente ilustrativo). Reutiliza a linha e renomeia, sem mover registros. Se `sammya` pertencer a outro ID, interrompe.
- Redefinição de senha: somente com `--reset-password`, solicitando entrada protegida. Nunca há senha padrão.
- Alterações de privilégio/identidade encerram as sessões **da conta alvo**, exigindo novo login. Sessões e senha da Demo são preservadas.
- O preflight mostra contagens de vínculos, sem conteúdo dos registros. A identidade é revalidada em transação antes de gravar, para evitar sobrescrever uma alteração concorrente.
- Entregar credenciais por canal apropriado fora do Git, logs e PR. Não usar `seed-demo` em instância publicada.

## Testes e relatório de validação

Comandos dirigidos, sempre com dados fictícios:

```sh
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
(cd frontend && npm test)
(cd frontend && npm run build)
PYTHONPATH=backend .venv/bin/python scripts/check_transport_module.py
git diff --check
```

O harness de navegador cria banco e senhas aleatórias em diretório temporário, mantém o manifesto com modo 0600, não grava traces/screenshots com credenciais e destrói o ambiente ao terminar. A porta local é 8024. Os cenários cobrem 1440 e 375 px com o Chromium já instalado; Firefox só é adicionado se seu executável de teste estiver disponível. Não instala navegadores e não acessa banco de desenvolvimento ou Railway.

A execução final usa dependências próprias da worktree, instaladas com `pip install -r backend/requirements.txt` e `npm ci`, sem alterar requirements ou lockfile. As primeiras execuções reutilizaram o ambiente instalado do checkout original, que tinha certifi/Vitest mais novos; a validação foi repetida com as versões fixadas da main para evitar dependência implícita da branch de formulários.

- Frontend: **140 testes em 15 arquivos**, com Vitest 4.1.11 do lockfile; TypeScript e build aprovados.
- Backend: **166 testes aprovados**, com os requirements fixados da main. Há um aviso de depreciação já existente do Starlette/TestClient com httpx.
- E2E: **4 cenários distintos**, executados em desktop Chromium 1440 px e 375 px: **8 execuções aprovadas**. Depois do esclarecimento da mensagem de custos restritos, somente esse cenário foi reexecutado nas duas larguras: **2 reexecuções aprovadas**, sem aumentar a contagem de cenários distintos. Após generalizar a mensagem vazia do formulário, o cenário Demo foi novamente conferido nas duas larguras: **2 reexecuções aprovadas**.
- Os testes de capacidade também foram reexecutados após substituir as credenciais da fixture por senhas aleatórias: **13 aprovados**; não se somam aos 166 como testes distintos adicionais.
- Regressão do cadastro estruturado antigo: **7 cenários distintos**, em 1440 e 375 px: **14 execuções aprovadas**. A fixture passou a receber a capacidade explicitamente, em conta fictícia própria criada somente pelo launcher de banco temporário, mantendo a Demo genérica. Comando: `(cd frontend && npx --no-install playwright test --config playwright.transport-legacy.config.ts)`.
- Mensagens genéricas e dois textos da página pública deixaram de anunciar frete como função global; sem mudança de layout, valores ou regras.
- `git diff --check` aprovado. A análise AST confirmou preservação de 26 funções gerais/financeiras em services.py, quatro funções de dashboard/relatórios e das funções finance_query/finance_summary.
- A CLI recebeu uma última checagem dirigida de criação/reuso e renovação de sessão após endurecer a recusa de eco inseguro no terminal: **2 reexecuções aprovadas**, sem novos cenários distintos.
- Nenhum Firefox de testes estava instalado no cache esperado; esta entrega não declara compatibilidade Firefox novamente homologada. Os testes dirigidos foram feitos com Brave/Chromium já instalado.
- Backup Git: **165 arquivos** do baseline extraídos em diretório temporário e comparados byte a byte. SHA-256 do tar: `047971fd883d6a616581404310ba70418c87817a27a87c76385ad86938ec2b98`.
- Não se somam reexecuções aos cenários distintos. As duas falhas preliminares dos testes antigos de migração e uma seleção inválida de categoria na fixture OFX foram corrigidas no instrumento e reexecutadas. Um guard inserido inicialmente em um helper sem contexto de usuário foi movido para as rotas antes da validação completa.

**Dependências herdadas:** `npm audit` do lockfile da main reporta duas entradas moderadas em Vitest/@vitest/mocker ([GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp)). Nenhuma dependência foi alterada neste PR; a atualização existente na branch independente não foi incorporada silenciosamente. Não há servidor Vitest exposto por este harness. Esse registro não constitui uma nova auditoria de segurança completa.

Testes legados de migração usam inserções compatíveis com cada esquema antigo, em vez de instanciar o User do esquema novo antes de migrar. Os testes das extensões 0011/0012 ficam fixados nessas revisões; a preservação de 0012 → 0013 é verificada separadamente, comparando todas as colunas antigas, IDs, dados e integridade/FKs. Não se relaxam asserções financeiras.

## Compatibilidade, recuperação e limites

- Aplicar a migração antes de atender requisições com o código novo. Manter backup verificado e serviço supervisionado durante uma futura atualização autorizada.
- A concessão não é automática para nenhuma conta; cadastros genéricos funcionam mesmo sem Sammya provisionada.
- Chamadas especializadas anteriormente permitidas a qualquer admin agora retornam 403. Clientes de API devem usar as capacidades e tratar esse resultado. O campo adicional `restricted_transport_costs` e a lista `capabilities` são alterações aditivas de apresentação/autorização.
- CSV/relatórios financeiros gerais continuam abrangendo o histórico; somente consultas especificamente setoriais exigem o módulo. Endpoints e fórmulas não foram substituídos.
- Não se executa downgrade automático. Em caso de falha operacional, interromper o serviço, preservar o arquivo problemático e recuperar código/banco a partir de cópias conferidas em ambiente isolado. Retornar ao código antigo também retorna à antiga política por username; manter acesso restrito até conferir a autorização.
- O backup Git de preparação ficou fora do repositório e sua extração foi conferida. Não substitui backup do banco real, que não foi acessado nesta tarefa.
- Não há alegação de homologação humana, leitor de tela, dispositivos físicos, multitenancy ou prontidão de produção. Não houve merge, deploy, seed ou migração em banco persistente.
