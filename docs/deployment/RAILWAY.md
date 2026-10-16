# Railway Trial — preparação de uma instância Silex Business

**Guia para execução futura, após aprovação do PR e autorização de deploy.** Nesta etapa somente código, imagem/testes locais e documentação foram preparados. Não houve acesso à conta Railway, criação de recurso, deploy, cobrança ou uso de dados reais. Base: `363bc19831d6b821e010e61141f12cdbd298aba7`. Preservar o [workflow](../development/WORKFLOW.md) e os limites do [piloto](../pilot/DECISOES.md).

## 1. O que será publicado

Um serviço: frontend React compilado servido pelo FastAPI junto da API, um processo Uvicorn, SQLite local ao serviço e anexos BLOB no mesmo banco. Login/perfis/regras do ERP existentes. Acesso pela URL HTTPS Railway com credenciais individuais; somente dados fictícios. Sem PostgreSQL, VPN, serviços auxiliares ou recursos multiempresa. Nenhum código financeiro, frontend operacional, CSV ou impressão foi alterado nesta preparação.

## 2. Recursos e configuração manual no painel

Após autorização, criar um projeto e um único serviço, configurar uma réplica numa região e anexar um volume de Trial montado em `/data`. Nenhum recurso será criado por arquivo de configuração versionado: a Railway marcou Config as Code como depreciado e não permite novos serviços nesse formato ([documentação Config as Code](https://docs.railway.com/config-as-code)). Portanto, preencher e conferir cada opção abaixo no painel do serviço antes do primeiro deploy.

- **Build:** escolher o builder Dockerfile, manter a raiz do repositório como root directory e usar o arquivo `Dockerfile` da raiz. A Railway detecta esse nome/caminho padrão ([Dockerfiles](https://docs.railway.com/builds/dockerfiles)).
- **Start:** deixar o comando da imagem, `python -m app.start`, sem override.
- **Pre-deploy:** nenhum comando.
- **Healthcheck:** path `/api/health`, timeout inicial de 120 segundos.
- **Restart:** selecionar `On Failure`. Usar limite de 3 tentativas se o painel permitir; o Trial pode impor o limite da plataforma (a documentação atual indica até 10 reinícios nessa política), então conferir e registrar o valor efetivo ([política de reinício](https://docs.railway.com/deployments/restart-policy)).
- **Réplicas:** uma única réplica.
- **Volume:** montar o diretório persistente em `/data`.

Registrar uma conferência dessas opções no painel antes de iniciar o primeiro deploy; nenhum deploy ou acesso à conta faz parte desta preparação. Configurar volume/variáveis antes de iniciar a aplicação. Não conectar uma origem com deploy automático nem ativar PR environments; fornecer o código aprovado por um envio manual autorizado. Não criar banco gerenciado, cartão, plano pago ou mais serviços.

Confirmar no painel o crédito/prazo restantes, disponibilidade de SSH, CPU/RAM e volume. A documentação pública pode divergir dos limites efetivos da conta. Manter o limite de **0,5 GB de RAM observado pelo proprietário** até comprovação explícita no painel; não aumentá-lo automaticamente. Uma réplica é obrigatória; o lock do volume também impede dois processos de aplicação simultâneos.

## 3. Build

No painel do serviço, selecionar o builder Dockerfile e manter o root directory na raiz do repositório; o arquivo padrão `Dockerfile` será detectado. O projeto não depende de `railway.toml` nem de outra configuração Config as Code. Duas etapas: Node 22 instala `npm ci` pelo lockfile e executa `npm run build` (TypeScript + Vite); Python 3.12 instala as versões já fixadas em `backend/requirements.txt`. Bases oficiais fixadas por digest; runtime recebe somente backend/migrações e frontend compilado, sem Node/node_modules. Consulte também a documentação do [comando de start](https://docs.railway.com/deployments/start-command).

Não definir build command adicional. Não usar `make setup` na Railway: ele inclui migração. `.dockerignore` e os COPY explícitos excluem Git, dados, dependências do computador, backups e relatórios. O build não cria banco nem precisa do volume. O builder usa heap Node explícito de 320 MiB; esse ajuste não é copiado ao runtime Python. Teste local opcional com Docker já instalado: `docker build -t silex-railway-trial:test .` (não publica imagem).

## 4. Start

No painel, deixar o start command vazio para usar o CMD da imagem: `python -m app.start`; não definir pre-deploy command. Configurar o healthcheck `/api/health` com timeout inicial de 120 segundos, `On Failure` e uma réplica, conforme a conferência da seção 2. O entrypoint verifica configuração, volume real gravável, PORT e frontend; adquire lock, aplica Alembic, recusa contas demo e substitui o processo por Uvicorn em `0.0.0.0:$PORT`, um worker. Erro interrompe o start sem apagar/recriar o banco. Lock persiste durante o servidor; reiniciar não remove dados.

## 5. Volume

Montar **o diretório `/data`**, não o arquivo. `sqlite:////data/gestao.sqlite3` representa caminho absoluto `/data/gestao.sqlite3`; WAL e SHM são irmãos nesse diretório. `RAILWAY_VOLUME_MOUNT_PATH`, fornecida pela plataforma, deve apontar para uma montagem real. Apenas criar `/data` ou forjar a variável não passa na validação. O banco precisa ficar diretamente nesse volume, sem symlink ou caminho relativo; falha de escrita impede inicialização.

A imagem usa o usuário root do container para compatibilidade com o volume montado pela Railway; umask 077 protege arquivos criados pelo start. Não usar modo privilegiado nem montar arquivos do computador. Isso não é homologação de endurecimento para produção. Manter volume exclusivo, disco local ao serviço e uma réplica. A Railway monta volumes somente no runtime, não no build/pre-deploy ([volumes](https://docs.railway.com/volumes)).

## 6. Variáveis necessárias

| Variável | Exemplo não secreto / regra |
| --- | --- |
| `GESTAO_ENV` | `railway` (também fixado no Dockerfile). Metadata Railway com modo local é rejeitada |
| `GESTAO_DATABASE_URL` | `sqlite:////data/gestao.sqlite3`; obrigatório, sem fallback efêmero |
| `GESTAO_PUBLIC_HOST` | `exemplo-aprovado.up.railway.app`; um host DNS exato, sem esquema, caminho, porta ou wildcard |
| `GESTAO_PUBLIC_ORIGIN` | `https://exemplo-aprovado.up.railway.app`; mesma hostname, HTTPS, sem caminho/barra final. Porta explícita só se realmente fizer parte da origem (testes locais TLS) |
| `PORT` | Injetada pela Railway; o start exige inteiro 1–65535. Se o painel exigir porta fixa, definir por exemplo `8080` e usar o mesmo target port do domínio |
| `RAILWAY_VOLUME_MOUNT_PATH` | Fornecida automaticamente ao anexar o volume: `/data`. Não usar essa variável para simular uma montagem ausente |

Não há senha/admin/token de aplicação nessas variáveis. `make dev`, `make run` e bancos locais mantêm o modo local padrão; variáveis de origem pública nesse modo são rejeitadas para evitar configuração acidentalmente insegura. Não copiar variáveis públicas para o ambiente local de desenvolvimento.

## 7. Domínio gratuito

Depois da autorização, usar Settings → Networking → Generate Domain no único serviço e conferir o target port. Copiar o host exato e definir HOST/ORIGIN acima antes de liberar o uso. Não há domínio próprio ou custo de registro previsto ([domínios Railway](https://docs.railway.com/networking/domains/railway-domains)).

Se o painel só permitir gerar domínio após o primeiro start, iniciar com host explícito `setup.invalid` e origem `https://setup.invalid`, volume configurado e **sem domínio público**. Criar o admin via SSH, gerar o domínio, copiar a origem real e fazer o deploy/restart manual autorizado. Enquanto houver divergência de host, a aplicação retorna 400; não remover a proteção para passar o healthcheck. Não anunciar a URL à avaliadora antes das verificações reais de HTTPS/login.

## 8. HTTPS, hosts e cookies

Railway termina TLS. A aplicação aceita somente o host configurado; `healthcheck.railway.app` tem exceção estrita para GET `/api/health`, sem acesso às outras rotas. O health confirma banco/migração e mantém o JSON existente, sem dados privados. Configuração ausente/inválida impede iniciar. Health da Railway é de implantação, não monitoramento contínuo ([healthchecks](https://docs.railway.com/deployments/healthchecks)).

Mutações usam a origem HTTPS **configurada**, não uma origem reconstruída de cabeçalhos. Origem diferente, `null`, origem de desenvolvimento e `Sec-Fetch-Site: cross-site` são recusados. Requisições técnicas sem Origin preservam o contrato anterior e continuam exigindo autenticação/autorização. Sem CORS aberto ou wildcard de domínios.

Railway documenta `X-Forwarded-Proto=https`, `X-Forwarded-Host` e `X-Real-IP` ([headers](https://docs.railway.com/networking/public-networking/specs-and-limits)). Este start usa `--no-proxy-headers`: nenhum deles altera host autorizado, origem, cookie ou identidade. O limitador existente continua pela conexão TCP/usuário; atrás do edge, o IP pode ser compartilhado e a limitação mais agregada. Não habilitar confiança global `*` em forwarded headers. IP original individual exigiria validação específica da cadeia de proxies, fora deste mínimo.

Cookie público: Secure + HttpOnly + SameSite=Strict, duração de 12 h, token/Argon2/logout/revogação preservados. Modo local mantém cookie HTTP de loopback. Na futura instância, conferir certificado, host recebido, Origin real, cookie e logout no navegador; um proxy TLS local não homologa o edge Railway. Manter cache da API desabilitado; não ativar CDN/regras extras.

## 9. Banco inicial

Volume novo e exclusivo; não enviar banco do desenvolvedor nem rodar seed-demo. Migrações ocorrem no start **após** montagem. Criam estrutura e registros padrão existentes; não criam usuários/senhas demo. Health somente retorna pronto quando a revisão do banco corresponde às migrações da imagem. O start recusa um banco contendo os usuários demo conhecidos e a CLI recusa seed-demo nesse modo.

Antes de atualização com alteração de schema, exigir backup exportado e código compatível para restauração. Erro de migração falha sem reset/downgrade automático. Um volume anexado pode implicar indisponibilidade curta em redeploy; não prometer zero downtime.

## 10. Primeiro administrador

No container **em execução e com volume montado**, usar shell SSH interativo do serviço, selecionando explicitamente projeto/ambiente/serviço no cliente Railway autorizado. Exemplo de entrada: `railway ssh -p <project-id> -s <service-id> -e <environment-id>`. Lá dentro:

```bash
cd /app
python -m app.cli create-admin
```

O comando existente pede usuário, nome e senha por getpass (sem eco); não passar senha em argumento, variável, pipe, arquivo, GitHub ou log. Usar credencial individual exclusiva e entregar por canal privado. No ERP, criar a conta individual da avaliadora com o perfil autorizado; operador não recebe acesso financeiro administrativo por conveniência.

`railway run` injeta variáveis num processo **local** e não equivale a SSH no container. A CLI/SSH não foi instalada nem conectada neste trabalho. Confirmar acesso SSH e volume no Trial antes de disponibilizar a URL; se indisponível, interromper o bootstrap e avaliar alternativa autorizada, sem endpoint público ou senha padrão. Referência: [Railway SSH](https://docs.railway.com/cli/ssh).

## 11. Acesso

Abrir `https://<host>/entrar` ou `/app`. Testar login inválido/válido, retorno à rota protegida, perfil operador, logout e sessão expirada. Confirmar proteção de anexo sem sessão. Conferir a empresa fictícia configurada e os fluxos essenciais com a avaliadora; nada nessa preparação é homologação humana ou autorização de dados reais.

## 12. Persistência após restart

Criar cliente/título e anexo fictícios; registrar IDs, centavos, datas ISO e hash do arquivo. Reiniciar somente o deployment pelo painel, preservando o volume. Reautenticar e conferir os mesmos registros/anexo; repetir num redeploy da mesma versão. Conferir ocupação no painel Volume Metrics ou via SSH `df -h /data` e `du -h /data/gestao.sqlite3*`. Incluir WAL/SHM e espaço de trabalho no limite; não esperar volume encher para exportar dados.

## 13. Backup e recuperação

Na shell remota com volume, executar o backup existente para um nome novo, por exemplo `python -m app.cli backup-bundle --output /tmp/pilot-backup-01.zip`. Verificar SHA-256, baixar imediatamente para armazenamento privado pelo SSH/SFTP/SCP suportado e conferir hash local. `/tmp` é efêmero; não deixá-lo como única cópia. O bundle contém SQLite, anexos exportados e manifesto, incluindo hashes de senha/sessões; não publicar em GitHub ou logs, nem tratar o ZIP como criptografado.

Exemplo de transferência documentada pela Railway, com identidade de instância confirmada: `scp <service-instance-id>@ssh.railway.com:/tmp/pilot-backup-01.zip ./pilot-backup-01.zip`. Proteger o arquivo local e manter cópia fora do provedor. Um backup dentro de `/data` pode consumir grande parte dos 0,5 GB; preferir exportação imediata do arquivo temporário. O snapshot do provedor não substitui restauração testada.

Restauração futura supervisionada: suspender uso; preservar/exportar estado atual quando possível. Usar temporariamente um start de manutenção `sleep infinity` no serviço e fazer deploy manual autorizado, com o mesmo volume/código compatível, sem servidor de aplicação. O CMD normal está no Dockerfile, permitindo esse override operacional. Via SSH/SFTP enviar o snapshot SQLite já extraído/verificado para um nome novo em `/data`; preservar juntos o banco anterior/WAL/SHM, sem misturá-los à restauração. Conferir integridade, FKs, migração, hashes/quantidades de anexos, IDs e valores antes de colocar o snapshot como `gestao.sqlite3`. Não usar Wipe Volume ou downgrade. Remover o override de manutenção e iniciar normalmente; comparar registros e arquivo baixado. Sessões estão no backup: definir revogação apropriada antes de qualquer uso real (limite já registrado no PILOT-00).

## 14. Consumo e parada

Acompanhar Usage/serviço (RAM, CPU, tráfego, volume) e logs no painel após cada sessão. Logs do start mostram revisões/estado; access log HTTP fica desligado para evitar registrar buscas/identificadores na URL. Não logar corpos/cookies. Ociosidade consome recursos enquanto houver processo; não foi medido um período de 24 h.

Parar o deployment pelo painel quando não estiver em avaliação, conferindo que a ação não apaga volume/projeto. Armazenamento retido pode continuar consumindo crédito. Exportar e verificar backup antes de encerrar o experimento; eliminar recursos persistentes só com autorização própria. Não instalar monitoramento ou habilitar serviços adicionais automaticamente.

## 15. Trial e prevenção de gasto

Condições públicas consultadas em 16/10/2026: Trial de até 30 dias ou consumo dos US$ 5 iniciais. A documentação lista Trial com até 1 GB RAM/2 vCPU compartilhadas, volume de 0,5 GB, disco efêmero de 1 GB e imagem de até 4 GB; o painel informado mostrou 0,5 GB de RAM, que permanece a referência conservadora desta preparação. Limited Trial pode limitar rede. Confirmar o efetivo da conta antes de deploy; não consultar/modificar a conta nesta tarefa ([Trial](https://docs.railway.com/pricing/free-trial), [planos](https://docs.railway.com/pricing/plans)).

Preços de referência de containers: RAM US$ 10/GB-mês, CPU US$ 20/vCPU-mês, tráfego de saída US$ 0,05/GB e volume US$ 0,15/GB-mês; a documentação atual informa build sem cobrança de CPU/memória. Hipótese ilustrativa, **não projeção medida**: RAM média de 0,1–0,2 GB consumiria US$ 1–2/mês só em RAM, além de CPU/tráfego/armazenamento. Uma configuração limitada a 0,5 GB não significa que toda essa RAM será usada, nem que o crédito durará 30 dias. Custos reais dependem das métricas ([preços](https://docs.railway.com/pricing/plans)).

A documentação informa retorno ao Free após Trial e exclusão de volumes Trial 30 dias após expiração dos créditos; não usar retenção como backup. Exportar **antes** do término ou esgotamento e confirmar status no painel. Não inserir cartão, contratar/alterar plano, autorizar upgrade ou criar recursos extras; não prometer disponibilidade contínua. Caso o painel solicite pagamento, parar e comunicar ao proprietário.

## 16. Limitações e validação desta preparação

Somente dados fictícios. Ainda faltam verificação do edge/volume/SSH reais, capacidade sustentada, restauração no host, recuperação de contas/sessões, homologação humana/assistiva/dispositivos e decisões de privacidade/suporte. Configuração empresarial continua global: uma empresa por instância. P05/P07/V01/T01/Q01/E01 mantêm seus estados; IMP01/F01/F02 permanecem integradas. Nenhuma prontidão comercial ou de produção é declarada.

Verificação reproduzível local, com dependências e Docker já instalados:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_deployment.py -q
.venv/bin/python scripts/check_railway.py --build --browser
```

O segundo comando cria/removerá somente seus containers e volume Docker sintéticos, publica portas **apenas em loopback**, usa certificado TLS descartável e senha gerada em memória. Não usa Railway CLI/API nem créditos. Chromium pode ser indicado por `SILEX_CHROMIUM_PATH`; a exceção de certificado é restrita ao teste, não à aplicação. `make dev`/`make run` permanecem inalterados.

Resultados locais: suíte backend de 115 casos aprovada, seguida por seis casos adicionais de validação do start aprovados; duas regressões existentes de navegação/permissões em Firefox aprovadas. Build TypeScript/Vite e instalação pelas versões fixadas concluídos na imagem (~286 MB, sem Node). O builder inicialmente esgotou o heap automático sob 470 MiB; com heap explícito de 320 MiB compilou sob o mesmo teto, atingindo o limite do cgroup (inclui cache), portanto sem margem de build comprovada. Runtime testado separadamente sob 470 MiB: amostra final de repouso 73,38 MiB/0,11% CPU; pico observado 143.286.272 bytes (~136,7 MiB), incluindo CLI. São amostras de ensaio curto, não dimensionamento de produção ou previsão de consumo de crédito.

Persistência de usuários/títulos/anexos foi comparada após restart e criação de container novo com o mesmo volume; o bundle restaurou centavos e BLOB idênticos. O ensaio confirmou ausência de seed automático, recusa de volume ausente, lock de instância, interrupção segura por revisão de migração inválida, recusa de banco demo e ausência de bypass por forwarded headers. Chromium via TLS local confirmou página pública, retorno protegido, login, Dashboard/livro caixa, cookie Secure e logout concluído. Limitações do instrumento foram corrigidas: atualizar porta aleatória após restart, selecionar o link Entrar do cabeçalho e aguardar a resposta real do logout; sem relaxar o resultado esperado. Aviso existente de depreciação TestClient/httpx foi preservado, sem atualizar dependências incidentalmente.
