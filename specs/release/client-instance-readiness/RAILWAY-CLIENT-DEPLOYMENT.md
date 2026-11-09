# Publicação futura — instância exclusiva dos clientes

**Procedimento preparado, não executado.** Não conectar origem, aplicar configurações, criar domínio/usuário ou disparar deployment durante esta entrega. Nenhuma operação deve envolver `perfect-playfulness` / `silex-business-pilot`.

## 1. Destino e estado conhecido

| Item | Destino informado pelo proprietário | Verificação nesta sessão |
|---|---|---|
| Projeto | `silex-business-clientes` / `ebfa4cbf-aba5-4388-ae95-387b836072b7` | NÃO CONFIRMADO remotamente |
| Ambiente | `production` / `3c84a85b-5d0a-4a64-95f1-1b9ca791fe86` | NÃO CONFIRMADO remotamente |
| Serviço | `silex-business-clientes-app` / `697bf677-ec0a-4987-b05b-3c27745aca8f` | NÃO CONFIRMADO remotamente |
| Volume | `silex-business-clientes-data`, mount `/data` | Informado; confirmar vínculo exclusivo e mount antes de publicar |
| Banco | `sqlite:////data/silex-clientes.sqlite3` | Sintaxe compatível com o código; nenhum banco remoto lido |
| Origem/deployment | Ainda não conectado/publicado segundo proprietário | Não confirmado; nenhum source connect ou deploy executado |

Bloqueio concreto de leitura: CLI Railway ausente, sem token/configuração local disponível; o navegador MCP falhou antes de navegar por ausência do Chrome configurado. Não houve instalação, login, leitura do piloto ou tentativa de credenciais alternativas. Os browsers Playwright dos testes locais são independentes e funcionam. Confirmar os itens acima em sessão autorizada de leitura antes de autorizar publicação.

A arquitetura é **um serviço e uma empresa cliente por instância**. Não existe isolamento por CNPJ dentro de um SQLite compartilhado. Não importar usuários, arquivos ou banco da Sammya.

## 2. Origem aprovada e trava de versão

- Repositório: `leofernandesc/silex-business`, URL SSH `git@github.com:leofernandesc/silex-business.git`.
- Candidata desta entrega: `fix/silex-commercial-release-readiness`, derivada de `985e50c...`; SHA final e checks constam do Draft PR desta entrega. Dependências #14 e #15 continuam pendentes de aprovação/integração própria.
- **Não usar main para esta publicação.** A Sammya acompanha main: movimentá-la pode causar autodeploy da instância proibida.
- Após aprovação específica de toda a pilha, preparar referência dedicada `release/clientes-<SHA-curto>` apontando exatamente ao commit aprovado. Não criar agora, não reescrever nem atualizar essa referência sem nova revisão.
- Antes da futura conexão/deployment: comparar `git ls-remote` dessa referência com o SHA aprovado; revisar se há workflow/integração que publique outra instância; conferir repositório/branch no painel dos clientes, autodeploy desabilitado e deployment resultante com o SHA esperado. Branch é referência mutável: disciplina operacional não equivale a proteção automática.
- Conectar GitHub pode disparar o primeiro deploy: somente fazer isso quando todos os gates/configuração/autorizações estiverem prontos. **Não “conectar para testar” nesta etapa.** [Serviços](https://docs.railway.com/services), [autodeploys](https://docs.railway.com/deployments/github-autodeploys).

## 3. Build e start no painel — conferir antes do primeiro deploy

- Root directory: raiz do repositório; Dockerfile raiz detectado. Build multi-stage Node 22 → frontend compilado → Python 3.12, dependências fixadas, sem migração/seed no build. Dockerfile não foi alterado nesta release.
- Start: CMD da imagem, `python -m app.start`. Não substituir por `make dev`, Vite, `--reload` ou servidor local.
- **Pre-deploy command vazio.** Volume existe apenas em runtime. [Volumes](https://docs.railway.com/volumes).
- Healthcheck `/api/health`, timeout inicial 120 segundos; conferir ajuste no painel. Verifica arquivo/mount/banco e Alembic head antes do estado pronto. Healthcheck Railway não é monitoramento contínuo após entrar no ar. [Healthchecks](https://docs.railway.com/deployments/healthchecks).
- Uma réplica e um worker. Restart On Failure, limite inicial 10, conforme plano/controles disponíveis; não mudar plano. [Restart policy](https://docs.railway.com/deployments/restart-policy).
- Manter volume próprio montado como diretório `/data`, inclusive SQLite/WAL/SHM/lock. Nunca montar só o arquivo, usar caminho relativo ou compartilhar volume com outra instância.

## 4. Variáveis e HTTPS

| Variável | Valor esperado / origem |
|---|---|
| `GESTAO_ENV` | `railway` — já informada como configurada |
| `GESTAO_DATABASE_URL` | `sqlite:////data/silex-clientes.sqlite3` — já informada como configurada |
| `GESTAO_PUBLIC_HOST` | Host exato do domínio real dos clientes, sem esquema/caminho/curinga; **não fornecido nem confirmado** |
| `GESTAO_PUBLIC_ORIGIN` | Origem HTTPS canônica do mesmo host, sem caminho/barra final; **não fornecida nem confirmada** |
| `RAILWAY_VOLUME_MOUNT_PATH` | `/data`, fornecida automaticamente ao anexar o volume; confirmar em runtime, não fingir mount por variável |
| `PORT` | Fornecida pela Railway; `app.start` usa bind `0.0.0.0` nessa porta |

Gerar/confirmar um domínio Railway **somente após autorização operacional** em Settings → Networking → Public Networking. Não inventar domínio nos arquivos. Registrar o host real e origem HTTPS antes de abrir acesso. A configuração pública incompleta falha de propósito; não mudar `GESTAO_ENV=local` para contornar a falha. [Domínio](https://docs.railway.com/networking/public-networking), [variáveis](https://docs.railway.com/variables).

O backend existente aceita host/origem explícitos, recusa mutações cross-site, não usa CORS aberto nem confia nos forwarded headers do cliente; Uvicorn usa `--no-proxy-headers`. Cookie Secure, HttpOnly, SameSite=Strict, expiração/revogação existentes. Validar cookies/HTTPS e headers no domínio real depois da publicação autorizada; os testes locais simulam essa configuração, não comprovam o ambiente remoto.

## 5. Banco vazio e primeiro administrador — somente em futura execução autorizada

`app.start` exige mount real e gravável, valida porta/frontend, obtém lock exclusivo, executa migrações e inicia o servidor. Sem seed-demo, sem apagar/recriar banco, sem downgrade. Um banco com contas demo conhecidas é recusado. Reinícios repetem upgrade idempotente mantendo dados; erro de migração interrompe sem apagar o arquivo.

Antes do primeiro start, conferir no painel exclusivamente dos clientes que não exista deployment em execução nem dado prévio inesperado. Não copiar SQLite de outra instância. Se existir dado não esperado, interromper; não tentar “limpar”.

Depois do start autorizado, entrar **no container remoto correto**, em TTY interativo (não `railway run`, que executa localmente com variáveis):

```bash
# Exemplo futuro; NÃO EXECUTADO. Conferir os três IDs antes de confirmar a conexão.
railway ssh --project ebfa4cbf-aba5-4388-ae95-387b836072b7 \
  --environment 3c84a85b-5d0a-4a64-95f1-1b9ca791fe86 \
  --service 697bf677-ec0a-4987-b05b-3c27745aca8f
# Dentro do container dos clientes, com volume montado e TTY protegido:
python -m app.cli create-admin
```

Conferir no shell nome/IDs/URL do banco e existência do mount, sem imprimir segredos. A CLI exige entrada protegida, confirmação de senha e unicidade; não aceita pipe de senha. Criar administrador individual; não usar seed-demo, senha fixa, env de bootstrap ou `provision-sammya`. Entregar credenciais fora do Git/log/relatório. Cadastrar conta individual da usuária conforme o papel necessário, módulo de transporte desativado por padrão. [SSH](https://docs.railway.com/cli/ssh).

Recuperação de acesso não possui autosserviço homologado. Definir responsável de suporte e procedimento manual autorizado de contingência usando a CLI existente; não apagar/recriar identidades com histórico nem transferir dados para outra conta. Não usar provision-sammya para recuperação genérica.

## 6. Smoke test e reinício futuros

Conferir SHA, `/api/health`, `/app`, login inválido/válido/logout, bloqueio de operador, dados privados sem sessão, host/origem indevidos, ausência de demo, identidade da empresa. Criar registro fictício, anexo fictício e operação mínima; reiniciar **somente clientes** e comparar IDs/centavos/anexo. Não inserir dado real até aceite e decisão explícitos. Aplicação da Sammya não é parte desse smoke test.

## 7. Backup, recuperação e rollback

Antes de cada mudança de esquema ou atualização: backup consistente do SQLite/anexos dos clientes, hash e restauração em laboratório com comparação de IDs, valores, FKs e anexo. Git não é backup operacional.

No container correto, após autorização e com espaço disponível, a CLI já existente produz snapshot consistente:

```bash
# FUTURO, não executado remotamente; escolher arquivo novo e destino restrito.
python -m app.cli backup-bundle --output /data/backup-clientes-<data-hora>.zip
```

O ZIP contém SQLite consistente e anexos com manifesto; inclui material privado: acesso restrito, nunca Git/PR. Transferir uma cópia por mecanismo autorizado/seguro e verificar SHA-256 fora do serviço; não deixar única cópia no mesmo volume. Definir frequência, retenção, RPO/RTO, responsável e ensaio periódico antes de dados reais. Backups do provedor são complemento e podem gerar cobrança; não ativados aqui.

Rollback de código não reverte schema. Antes de voltar imagem/SHA, verificar compatibilidade com a revisão do banco. Se precisar restaurar: parar apenas o serviço dos clientes, preservar cópia do estado falho, verificar backup original, restaurar em ambiente descartável primeiro e depois em procedimento supervisionado, garantir ausência de escritores/WAL antigo, revalidar integridade/IDs/centavos/anexos e iniciar versão compatível. Não fazer downgrade automático, apagar volume ou substituir banco em uso.

Uma restauração de volume no painel prepara alterações e exige redeploy; revisar rigorosamente projeto/ambiente/serviço antes. Não tocar volumes/backups da Sammya. [Backups Railway](https://docs.railway.com/volumes/backups).

## 8. Operação mínima e limites

Responsável nomeado por saúde/erros e consumo; alertas contínuos externos ou procedimento periódico (não implementados automaticamente), retenção e acesso aos logs, disco/WAL, memória/CPU e incidentes. Não registrar senhas/cookies/corpos financeiros. Medir consumo real e ajustar limites do plano somente com autorização; não prometer disponibilidade ou custos ainda não medidos.

Publicação depende de checks do SHA final, revisão da pilha #14/#15/nova release, HOM-22/aceite humano e configuração remota confirmada. Uma instância exclusiva atende **uma empresa**. Sem multitenancy, cobrança recorrente, isolamento por CNPJ ou DRE fiscal/contábil homologados.
