# Pré-publicação — Gate A e Gate B

Revisão em 09/11/2026. **O SHA solicitado `0ade7944238cfa52175936650115f5bcf86592e4` não deve ser publicado: P1 novo comprovado e corrigido em candidata empilhada.** Correção `720c73e9ca2091c7c01b368765bd26d8d7cc7b15`, branch `fix/predeploy-session-response-guard`; HEAD final, novo Draft PR e CI da correção constam nos checks/descrição desse PR, sem reescrever os PRs anteriores. Worktree isolada `/home/leofernandesc/silex-predeploy-audit`.

## 1. Pilha e evidências conferidas

| PR | HEAD efetivamente confirmado | Estado |
|---|---|---|
| [14](https://github.com/leofernandesc/silex-business/pull/14) | `00fcaa5f869d702dda6ad535d264a0216dd11b65` | Aberto/Draft, sem conflitos |
| [15](https://github.com/leofernandesc/silex-business/pull/15) | `985e50c4bf33aa976252cfc49696c28765a25ef9` | Aberto/Draft, base #14 |
| [16](https://github.com/leofernandesc/silex-business/pull/16) | `0ade7944238cfa52175936650115f5bcf86592e4` | Aberto/Draft, base #15 |

Ancestralidade conferida localmente; candidata contém a pilha inteira. Main permanece `7214ad2543e0e980366a386b27cc7bbb39eddb32`. Não é necessário mover main ou integrar os PRs para homologar um snapshot aprovado separado.

[CI 42570197661](https://github.com/leofernandesc/silex-business/actions/runs/42570197661) reconfirmado **success**, quatro jobs e logs: 339 backend, 259 frontend, TypeScript/build, 338 E2E por motor Chromium/Firefox; 30/8/35 complementares por motor, 124 comparações de 26 relatórios, reinício/backup/restauração e anexos. Evidência **anterior desta candidata, conferida agora**, não reexecução nesta auditoria. Os seis documentos desta pasta foram lidos integralmente.

## 2. Revisão focada dos três PRs como candidata única

| Área | Conclusão e código examinado |
|---|---|
| Comercial/financeiro | Recebíveis usam principal assinado em lote, parciais/estornos preservados; transações SQLite serializam mutações e chave de quitação é vinculada ao título. Mudanças intencionais de relatórios #14 mantidas. `api.py`, `services.py`, `reporting.py`, `schemas.py`. |
| DRE e histórico | Fonte canônica de venda/serviço/título evita contar pagamento de principal como nova receita; centavos inteiros, evidência, revisões imutáveis, vigências sem sobreposição e ajustes separados. `dre_sources.py`, `dre.py`, `dre_history.py`, `dre_cancellations.py`, `dre_policy.py`. Sem divergência nova demonstrada. |
| Origem/propriedade | Guard admin/ativo e filtragem de fontes especializadas precedem resumo, detalhe, CSV e reconhecimento. Revisão histórica exige autor e fontes ainda visíveis; não há concessão por username. `sources`, `source_entry`, `can_read_review`, `service_orders.py`. Não é multitenancy. |
| Apresentação #16 | `dre.tsx`, `drePresentation.ts`, `dreSource.tsx`, `dreExport.ts`: texto React escapado; IDs/rotas limitados/allowlist; consultas de descrição protegidas, sem cache entre contas; valores desconhecidos continuam indisponíveis; coluna técnica separada; texto de fórmula CSV neutralizado. |
| Sessão/exportação | A reconsulta existente recusa 401/403 e reautoriza ao iniciar, porém havia a corrida P1 abaixo em respostas 200 antigas. Única correção de produção desta auditoria é no tratamento compartilhado. |
| Migração/persistência | 0014–0017 aditivas, sem backfill econômico inventado; transação física DDL; startup serializa migração após mount e mantém lock durante servidor. SQLite/WAL/SHM no diretório do volume; anexos BLOB no mesmo backup. |
| Inicialização/segurança pública | Host/origem HTTPS explícitos, cookies Secure/HttpOnly/Strict, proxy headers não autorizam host/origem, seed público recusado; health valida head do Alembic. Dockerfile e backend intactos. |

Limitações de CMV, DA/provisões, execução por etapas, cancelamento parcial e apuração fiscal permanecem explícitas em [políticas](FINANCIAL-POLICY-CONFORMANCE.md), no demonstrativo parcial e na impressão/CSV. Não impedem homologação fictícia; não vender como contabilidade fiscal ou DRE completa sem fontes/aceite. Nenhuma funcionalidade contábil nova foi implementada.

## 3. Único defeito novo comprovado: PRE-01 — P1

**Reprodução real em ambos os navegadores:** administrador consulta DRE com R$ 100,01; inicia CSV; o instrumento retém a resposta HTTP 200 realmente autorizada pelo backend; sai pela interface e entra como operador; nova consulta direta do operador recebe 403; ao liberar a resposta antiga, `dre.csv` era baixado na sessão de operador. Não é bypass do endpoint: é entrega tardia de dados de outra sessão no navegador. [Chromium antes](evidence/predeploy/race-before-chromium.txt), [Firefox antes](evidence/predeploy/race-before-firefox.txt).

Causa: `api.ts` comparava geração apenas para evento de expiração 401; sucesso JSON/blob antigo ainda resolvia. Correção mínima: conferir a geração existente **depois de consumir o corpo e antes de retornar dados**. Se mudou, recusar entrega e orientar conferir o resultado antes de reenviar; sem retry, segundo logout, novo guard ou alteração HTTP/backend. Abrange JSON da DRE e downloads CSV legados. Operação mutável eventualmente concluída no servidor não é repetida nem declarada desfeita.

Arquivos: `frontend/src/api.ts` (único de produção); cinco testes em `api.test.ts`; `tests/predeploy-export-session.spec.ts` com backend real, retenção de resposta e troca pela interface; inclusão desse teste na matriz. Números, fontes, políticas e permissões não mudaram. A leitura financeira de administrador genérico continua conforme o contrato, sem consultar metadados especializados não autorizados.

## 4. Verificações novas, justificadas e reproduzíveis

| Execução desta auditoria | Resultado |
|---|---|
| Cinco testes novos contra código antigo | 5 FAIL esperados / 30 existentes PASS, demonstrando ausência do descarte; [log](evidence/predeploy/unit-before.txt) |
| E2E negativo no SHA solicitado | 1 FAIL esperado em Chromium e 1 em Firefox; download indevido reproduzido |
| API após correção | 35/35 PASS, incluindo os cinco novos; [log](evidence/predeploy/unit-after.txt) |
| Frontend completo / build corrigidos | **264 PASS**, TypeScript/Vite PASS; [frontend](evidence/predeploy/frontend.txt), [build](evidence/predeploy/build.txt) |
| DRE, histórico, permissão e corrida corrigida | **20/20 por navegador**, desktop/mobile, sem retries/skips; [Chromium](evidence/predeploy/directed-chromium.txt), [Firefox](evidence/predeploy/directed-firefox.txt). São subconjuntos da matriz, não cenários a somar. |
| Imagem do SHA solicitado, startup público real local | **PASS**: mount real, banco vazio no caminho exato dos clientes, `/app`/health 200, zero usuários iniciais, CLI protegida, restart/novo container com dados iguais, anexo e backup restaurados, lock e falhas seguras. [Recibo](evidence/predeploy/startup-receipt.json), [log](evidence/predeploy/startup-docker.txt) |

Comandos: `npm test --prefix frontend`; `npm run build --prefix frontend`; testes API com `npm test -- --run src/api.test.ts`, cwd frontend; E2E com `PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers SILEX_E2E_PORT=8033 npx --no-install playwright test --config playwright.integration.config.ts --grep 'a financial download from|DRE release:|DRE review:|DRE:'` (cwd frontend); Firefox adiciona `SILEX_INTEGRATION_BROWSER=firefox`, porta 8034. Cada execução gravou report/output separados em `/tmp`, indicados pelos logs.

Startup: `python3 /tmp/silex-predeploy-startup-check.py --build --image silex-predeploy-0ade794:local`. Instrumento derivado de `scripts/check_railway.py`, somente ROOT da worktree, host sintético `.test` e `/data/silex-clientes.sqlite3` adaptados; hashes/receita no recibo. Sem mock do mount, limite local 470 MiB; pico observado 137728000 bytes, amostra idle 79,16 MiB. Não comprova consumo/SLA remoto. Somente volumes/containers fictícios próprios removidos, sem prune ou alteração de recursos existentes. Tentativa inicial com cwd incorreto não executou testes; corrigida antes das reproduções, não contada como falha do produto.

A correção afeta o cliente HTTP compartilhado: o novo PR aciona a regressão completa existente (backend/frontend/build, **340 E2E por motor** e complementos). Resultado final/HEAD exato ficam nos checks e na descrição do PR da correção; não atribuir o CI antigo à versão nova. Backend, migrações e startup são byte a byte iguais ao SHA ensaiado. Evidências textuais arquivadas somente com LF/espaços finais normalizados, originais intactos; [manifesto](evidence/predeploy/manifest.json).

## 5. Infraestrutura dos clientes

Estado **confirmado pelo proprietário por consulta direta, adotado como referência; não reconfirmado por ferramenta nesta execução**: projeto `silex-business-clientes` / `ebfa4cbf-aba5-4388-ae95-387b836072b7`; environment production / `3c84a85b-5d0a-4a64-95f1-1b9ca791fe86`; serviço `silex-business-clientes-app` / `697bf677-ec0a-4987-b05b-3c27745aca8f`; volume próprio `silex-business-clientes-data`, 500 MB, `/data`; sem source, deployment ou alterações pendentes. Railway CLI/token/config/MCP não disponíveis; nenhum acesso à conta ou à Sammya foi tentado.

Presentes segundo consulta informada: `GESTAO_ENV=railway`, `GESTAO_DATABASE_URL=sqlite:////data/silex-clientes.sqlite3`. Faltam domínio real, `GESTAO_PUBLIC_HOST` e `GESTAO_PUBLIC_ORIGIN`. São configurações da operação autorizada de deployment, **não defeitos de código nem motivo para refazer infraestrutura**.

## 6. Primeiro deployment — executar somente com autorização

1. Aprovar a correção PRE-01 e o **SHA completo final do novo PR com CI verde**, incluindo a pilha #14/#15/#16. Não publicar `0ade794` isoladamente. Criar/publicar somente referência dedicada `release/clientes-homologacao-<sha12>` no commit exato; conferir `git ls-remote` antes de conectar. Não atualizar main ou as branches de trabalho. Referência Git é mutável: não movimentá-la sem nova autorização.
2. No painel, conferir os três IDs acima, volume exclusivo e ausência de alterações inesperadas. Não selecionar o projeto/serviço da Sammya. Preparar configurações antes do source: Dockerfile raiz, CMD `python -m app.start`, **pre-deploy vazio**, `/api/health`, timeout inicial 120 s, uma réplica/worker, reinício On Failure (limite inicial 10 conforme controles existentes), sem mudança de plano.
3. Gerar domínio Railway **desse serviço**; só depois copiar o host real para `GESTAO_PUBLIC_HOST` e `https://` + host para `GESTAO_PUBLIC_ORIGIN`, sem barra/caminho/curinga. PORT e target port do domínio devem coincidir; se for necessário definir previamente a porta no painel, usar `PORT=8080` e target 8080. Não inventar o domínio nem alterar configurações agora. `RAILWAY_VOLUME_MOUNT_PATH=/data` deve vir do mount real, não de uma variável que finja volume.
4. Conectar exclusivamente a referência congelada dos clientes. Essa conexão pode iniciar o primeiro deployment: **é parte da autorização de publicar**, não uma ação exploratória. Desabilitar autodeploy para novos commits e conferir que o source/trigger jamais seja main; depois, somente deployment manual da referência aprovada. Alteração de main não será gatilho dos clientes. Não depender de “Wait for CI” automático: workflow atual é de PR; conferir manualmente o run do SHA aprovado.
5. No primeiro start, mount/lock → upgrade até 0017 → cadastros referenciais mínimos → servidor. Não haverá usuário, cliente, venda ou movimento demo. Não executar seed-demo nem copiar dados do piloto. Em caso de falha, parar e preservar volume/logs; não trocar para modo local nem apagar banco. Conferir SHA, health e HTTPS antes de criar usuário.
6. Pelo SSH remoto **com projeto/ambiente/serviço explícitos e TTY**, executar `python -m app.cli create-admin`, entrada protegida e senha exclusiva. [Comando e salvaguardas](RAILWAY-CLIENT-DEPLOYMENT.md#5-banco-vazio-e-primeiro-administrador--somente-em-futura-execução-autorizada). Nenhuma credencial em arquivo, env ou relatório; não usar `railway run` como se fosse remoto. Conta individual de avaliadora, sem transporte por padrão, criada somente com autorização. Testar login/logout, 401/403, cookie Secure/HttpOnly/Strict, anexos protegidos, host/origem e ausência de demo.
7. Smoke test fictício, registro/anexo/título com centavos, reinício só dos clientes e comparação de IDs/bytes/valores. Usuária então executa [HOM-22 e aceite](HUMAN-UAT-CHECKLIST.md). Um serviço, banco e volume para **uma empresa**, sem supor isolamento por CNPJ.

Fontes oficiais consultadas: [gatilhos de branch e deployment manual](https://docs.railway.com/deployments/github-autodeploys), [domínio HTTPS](https://docs.railway.com/networking/public-networking), [mount em runtime](https://docs.railway.com/volumes), [SSH remoto](https://docs.railway.com/cli/ssh). Nenhuma ação remota foi executada.

## 7. Recuperação, monitoramento e responsabilidade

Primeiro deploy sem dados: se falhar, parar somente clientes, preservar logs/volume e corrigir configuração; não apontar o código antigo da Sammya para o banco novo. Não há release anterior dos clientes para presumir rollback de botão. Código e schema precisam ser compatíveis.

Antes de novas atualizações/dados reais: `python -m app.cli backup-bundle --output /data/<arquivo-novo>.zip` no serviço correto; copiar por canal autorizado para destino externo restrito, verificar SHA-256 e ensaiar restauração. ZIP de backup usa membro `gestao.sqlite3`, independentemente do nome original do banco; restaurá-lo como `/data/silex-clientes.sqlite3` é etapa supervisionada, com serviço parado, cópia do estado falho preservada e sem escritores/WAL antigos. Confirmar revisão do schema, integridade/FKs, IDs/centavos/anexos e iniciar versão compatível; **sem downgrade automático ou troca de banco em uso**. Nunca tocar backup/volume da Sammya.

Responsável operacional proposto para homologação: **proprietário, a confirmar na autorização**, com capacidade de interromper somente clientes e acionar suporte. Acompanhar health, logs sem corpos/credenciais, erros 5xx, memória, disco/WAL e consumo durante a sessão e após restart; healthcheck de deploy não é monitoramento contínuo. Verificar espaço antes/depois de anexos/backup; com 500 MB não guardar única cópia no mesmo volume. Frequência, retenção, RPO/RTO e plantão do uso real devem ser definidos no Gate B; não ativar serviço pago ou aumento de plano automaticamente.

## 8. Parecer e operações que faltam

| Gate | Parecer / condição |
|---|---|
| **A — SHA original `0ade794`** | **NO-GO**: PRE-01 reproduzido. CI anterior verde não elimina a evidência nova. |
| **A — candidata com correção PRE-01** | **GO técnico para deployment controlado de homologação**, condicionado ao CI completo do HEAD final e aprovação expressa desse SHA. Não é autorização operacional nem confirmação de que o domínio já está configurado. Antes de abrir acesso, cumprir os passos 1–7. Não há outro bloqueador de código P0/P1 comprovado nesta revisão focada. |
| **B — operações reais** | **NO-GO**: aceite da usuária, verificações físicas/assistivas aplicáveis, escopo econômico-financeiro e responsável financeiro, backup externo/restauração reais dos clientes, administrador/permissões conferidos, responsável de suporte/recuperação, smoke test real e autorização expressa ainda pendentes. |

**A próxima autorização deve abranger exatamente:** aprovar o SHA corrigido; criar/publicar a referência Git dedicada; gerar domínio e configurar host/origem/porta e parâmetros do serviço existente; conectar a origem congelada (podendo disparar primeiro deploy), manter autodeploy desabilitado; executar o deployment; criar administrador individual por TTY e conta da avaliadora; efetuar smoke test, backup fictício/restauração e reinício exclusivamente dos clientes. Solicitar confirmação nominal do responsável operacional. Não exige merge em main, leitura do piloto, provisionamento de Sammya ou nova arquitetura.

HOM-22/aceite humano e validação contábil não bloqueiam a criação do ambiente fictício: são gates posteriores ao deploy para autorizar uso real. A homologação online permitirá executá-los. Limitações financeiras conhecidas não foram convertidas em zeros ou aceites fictícios.

**Preservação:** sem merge, deploy, Railway, banco persistente, usuário real, credencial permanente, cópia entre instâncias, alteração em main/PR14/PR15/PR16, mudança de fórmula/guard de autorização, migração ou transferência de propriedade. Apenas uma correção P1 reproduzida e seus testes/documentação na branch isolada.
