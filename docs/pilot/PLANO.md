# PILOT-00 — Plano de homologação isolada

Base inspecionada: `07ed8c25885f6f117945ba138fa0268b34fd8bd3`, em 16/10/2026. Planejamento documental; instalação, testes operacionais e homologação humana abaixo **ainda não executados**. Decisões e autorizações em [DECISOES.md](DECISOES.md).

## 1. Arquitetura mínima recomendada

Uma instância exclusiva da Silex Business para uma empresa, inicialmente com dados inteiramente fictícios. Manter React compilado + FastAPI/SQLAlchemy/Alembic e SQLite em disco local do mesmo host. Um processo de aplicação inicialmente; navegador não acessa o arquivo SQLite. Sem banco em pasta de rede, sincronizador ou volume compartilhado com outra instância.

Para acesso remoto, recomenda-se preliminarmente o **cenário C: servidor exclusivo, aplicação acessível somente pela rede privada/VPN, com HTTPS**:

```text
Navegador da avaliadora → VPN com acesso individual → proxy HTTPS privado
                                                    ↓ loopback
                                          FastAPI + frontend compilado
                                                    ↓ disco local
                                          SQLite exclusivo + anexos BLOB
                                                    ↓ snapshot consistente
                                          backup restrito fora do host
```

Manter conta de sistema sem privilégios, diretório privado para dados e configuração por instância. `GESTAO_DATABASE_URL` já permite escolher um arquivo exclusivo; dados empresariais e usuários ficam nesse banco. Os comprovantes atuais são BLOBs: não há diretório externo de anexos obrigatório. O bundle também exporta cópias dos comprovantes e manifesto. Exportações/PDFs baixados no dispositivo da avaliadora exigem cuidado separado.

SQLite é uma opção inicial adequada a avaliar para baixa concorrência, sem migração preventiva: o código usa WAL, chaves estrangeiras, timeout de 15 s e serialização de gravações. Isso não é ensaio de capacidade. Medir dois usuários nos fluxos de escrita, espaço ocupado e ocorrências de 503 antes de aceitar a instalação. A documentação oficial admite esse uso com aplicação e banco no mesmo host e ressalta o limite de um escritor por vez: [SQLite](https://www.sqlite.org/whentouse.html).

## 2. Comparação dos acessos

| Cenário | Preparação e segurança | Infraestrutura e custo aproximado | Uso pela avaliadora / riscos |
| --- | --- | --- | --- |
| A — somente no computador local | Menor complexidade. Aplicação em `127.0.0.1`; sessão do SO protegida, usuários próprios e banco separado. HTTP de loopback permanece limitado a esse contexto; TLS/VPN não são necessários para atravessar uma rede, pois não há acesso de rede | Computador já disponível: sem mensalidade adicional de VM; energia, internet, suporte e backup não estimados. Hardware novo não incluído | Browser simples, mas exige presença nesse computador. A localização da avaliadora é desconhecida; não serve como solução remota por si só. Falha/desligamento do computador interrompe a sessão |
| B — rede privada controlada | Complexidade intermediária. LAN confiável ou VPN entre redes; firewall por participantes, HTTPS e configuração de host/origem/cookie para a URL escolhida. VPN não torna automaticamente correta a configuração da aplicação | Host dedicado já disponível pode evitar mensalidade de VM; energia, disponibilidade, VPN e cópia externa dependem da solução escolhida, ainda sem cotação | VPN pode exigir instalação e suporte inicial. Acesso não depende da mesma LAN se houver VPN. Host doméstico depende de energia/conectividade e não deve compartilhar os dados do desenvolvimento |
| C — servidor com acesso remoto seguro | Maior preparação inicial. VM exclusiva, VPN, proxy TLS privado, firewall, acesso administrativo restrito, serviço supervisionado e backup externo. Sem porta da aplicação publicada na Internet | Referência ilustrativa: VM de 1 vCPU/2 GiB/50 GiB por US$ 12/mês; snapshot diário opcional de 30% acrescenta US$ 3,60. Total ilustrativo US$ 15,60 **não inclui** VPN, domínio, backup independente, tributos, câmbio ou trabalho operacional | Após configuração assistida, acesso por navegador + VPN de outra rede. Melhor independência do computador do desenvolvedor; exige responsável por atualizações, recuperação e custos |

Preço consultado em 16/10/2026 na [tabela oficial DigitalOcean](https://www.digitalocean.com/pricing/droplets), apenas para ordem de grandeza, sem escolha de fornecedor ou contratação. Dimensionamento é hipótese a medir; snapshot do provedor não substitui backup consistente do SQLite nem restauração ensaiada. Valores de A/B pressupõem equipamento existente e não representam custo total zero.

A recomendação C depende de confirmar dispositivo, permissões para VPN, necessidade de acesso sem supervisão e orçamento. Se a avaliação for presencial e pontual, A é uma primeira demonstração mais curta. Não se pressupõe que a avaliadora esteja na rede do desenvolvedor.

## 3. Segurança S01: o que existe e o que falta

Evidência dirigida em [api.py](../../backend/app/api.py), [schemas.py](../../backend/app/schemas.py), [financial.py](../../backend/app/financial.py), [db.py](../../backend/app/db.py) e [cli.py](../../backend/app/cli.py). Inspeção de código nesta etapa, sem novo pentest ou certificação de segurança.

| Área | Comprovado na implementação | Preparação ou lacuna para o piloto remoto |
| --- | --- | --- |
| Autenticação e sessão | Argon2, token aleatório, hash do token no banco, expiração de 12 h; logout revoga a sessão. Desativação revoga sessões, mas exige fechar caixa aberto e não permite desativar a própria conta | Criar contas individuais e credenciais exclusivas. Não executar seed demo na instância com dados reais. Definir recuperação de acesso; não há fluxo de redefinição de senha exposto na API atual |
| Cookie e transporte | `HttpOnly`, `SameSite=Strict`, **`Secure=false` fixo**; `make run` escuta loopback | HTTPS/proxy e cookie seguro precisam de trabalho separado. Não existe opção de ambiente para habilitar Secure hoje; não basta configurar o servidor |
| Hosts, origens e proxy | Hosts fixos `127.0.0.1`, `localhost`, `testserver`; mutações verificam Origin/Sec-Fetch-Site, sem CORS aberto. Há origens de desenvolvimento em 5173 | URL remota legítima é bloqueada pelos hosts atuais. Autorizar ajuste pequeno de configuração de hosts/origens/cookie e validar esquema/IP no proxy; não contornar com reescrita indiscriminada de Host/Origin. Confiar cabeçalhos somente do proxy conhecido ([FastAPI](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)) |
| Permissões e arquivos | Backend aplica admin/operador e propriedade em fluxos como vendas/caixa. Anexos financeiros exigem administrador, limite/tipo/assinatura de arquivo, download sem cache | Homologar matriz com as contas reais do piloto e IDs de terceiros; não confundir admin com acesso limitado por empresa. Admin vê os dados dessa instância inteira. Assinatura de arquivo não é antivírus; inicialmente usar somente anexos sintéticos seguros |
| Proteções e logs | Bloqueio após oito falhas de login por IP/usuário em 10 min; cabeçalhos de proteção, API sem cache; auditoria de ações no banco e saída do Uvicorn | Definir retenção/rotação e acesso aos logs; URLs de consulta podem conter buscas. Não registrar corpos, senhas ou cookies. Validar IP real no proxy para não distorcer o limitador. Não há monitoramento/alerta operacional configurado por estes comandos |
| Segredos e exposição | CLI cria admin por prompt protegido; `.gitignore` exclui banco, backups e arquivos de segredos | Contas demo são conhecidas, não segredos de operação. Sem credenciais neste PR. Guardar configuração/credenciais fora do Git, limitar leitura no SO, manter banco/backups fora do diretório estático. Fazer teste de acesso negado de fora da VPN e sem sessão |

## 4. Operação O01 e recuperação mínima

Os comandos atuais estão no [README](../../README.md#dados-backup-e-restauração) e [Makefile](../../Makefile). `make run` serve a compilação na porta 8000/loopback e encerra com Ctrl+C; `make dev` inicia API/Vite de desenvolvimento e encerra ambos. Para o piloto remoto, usar compilação aprovada, sem Vite/reload, com serviço supervisionado e parada controlada ainda a configurar. Não instalar dependências nem iniciar serviço neste incremento.

`make migrate` aplica Alembic e registros padrão; [env.py](../../backend/migrations/env.py) usa o banco indicado por `GESTAO_DATABASE_URL`. Não há rollback operacional automático. Antes de atualização: parar gravações, gerar bundle, preservar versão de código/dependências e versão de migração; migrar uma cópia e fazer smoke antes de atualizar a instância. Falha exige restaurar banco **e código compatíveis**, sem downgrade destrutivo.

`make backup` usa a API de backup SQLite e checa integridade; `make backup-bundle` inclui snapshot, BLOBs exportados e manifesto/hash de anexos, recusa sobrescrita e cria arquivo modo 0600. São comandos manuais; o ZIP **não é criptografado** e inclui hashes de senha e sessões. Configurar cópia criptografada fora do host, chave separada, agenda e verificação de sucesso. Proposta a aprovar: bundle antes/depois de cada sessão supervisionada, mais diário quando houver uso contínuo; sete diários e quatro semanais. RPO proposto: perda máxima da sessão em curso no uso supervisionado, ou 24 h no uso contínuo; RTO de até quatro horas supervisionadas. Metas não medidas e sem SLA.

### Ensaio futuro em diretório descartável

Somente após autorizar a preparação. Nunca apontar estes comandos ao banco persistente do desenvolvimento. Em shell dedicado, com dependências existentes:

```bash
umask 077
PILOT_CHECK_DIR=$(mktemp -d /tmp/silex-pilot-check.XXXXXX)
export GESTAO_DATABASE_URL="sqlite:///$PILOT_CHECK_DIR/source.sqlite3"
make migrate
make seed-demo
```

1. Confirmar o caminho absoluto antes de cada operação. Reservar uma porta livre de loopback, por exemplo 18130; iniciar com o ambiente acima usando `PYTHONPATH=backend .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 18130`. Criar um comprovante fictício pela interface e registrar IDs, valores/centavos, saldos, estoque e SHA-256 do arquivo; encerrar a aplicação.
2. Executar `make backup-bundle OUTPUT="$PILOT_CHECK_DIR/full.zip"`; registrar SHA-256 do ZIP, versão de código e migração. Validar o ZIP e comparar todos os anexos com `attachments-manifest.csv` e hashes dos BLOBs.
3. Extrair somente `gestao.sqlite3` para um **novo** diretório privado de restauração, preservando origem/ZIP. Não reutilizar WAL/SHM da origem. Conferir `PRAGMA integrity_check` = `ok`, `PRAGMA foreign_key_check` sem linhas e a revisão Alembic esperada; verificar também os vínculos de serviços validados pela API, pois há limitações de FK documentadas na [arquitetura](../ARQUITETURA.md).
4. Apontar `GESTAO_DATABASE_URL` ao arquivo restaurado, iniciar em loopback e repetir login, consultas e download do comprovante. Conferir IDs, valores, saldos e SHA-256 do arquivo baixado contra o registro anterior. Simular uma interrupção controlada só nessa cópia e confirmar recuperação sem perda de operação já confirmada.
5. Aceitar somente se as comparações forem exatas, os tempos atenderem às metas aprovadas e o procedimento for repetível pelo responsável. Os testes existentes de [persistência](../../backend/tests/test_app.py) e [bundle/anexos](../../backend/tests/test_finance_expansion.py) são referências; não substituem ensaio no host escolhido. Apagar a cópia descartável só após revisão do resultado e encerramento dos processos.

Backups preservam sessões. Na restauração real, manter acesso bloqueado até executar um procedimento de revogação/reautenticação aprovado e validado; abrir outro navegador não revoga tokens antigos. O fluxo atual de logout/desativação tem os limites acima. Não executar SQL de saneamento improvisado.

Mínimo de operação: responsável e contato definidos, health restrito pelo perímetro (`/api/health` não exige login e testa conexão, não todos os fluxos/migrações), verificação de processo/disco/backup antes de cada sessão, aviso de indisponibilidade, janela de manutenção e registro de incidentes. Agenda, alerta externo e recuperação operacional ainda não foram configurados nem medidos.

## 5. Sequência proposta e homologação

| Etapa proposta | Entrega pequena / dependência | Critério de passagem |
| --- | --- | --- |
| PILOT-01 — acesso e segurança | Após decisões do proprietário, autorizar configuração remota S01 estritamente necessária; para A, validar o isolamento local sem ampliar autenticação | Host/origem/TLS/cookie corretos no cenário escolhido; contas individuais; acesso externo/sem permissão negado; nenhuma exposição pública |
| PILOT-02 — instância fictícia e recuperação | Autorização de infraestrutura, host e teto de gasto; instalar cópia fixa, SQLite próprio, supervisionar serviço e ensaiar bundle/restauração | Sem dados reais, snapshot verificável, anexos restaurados, smoke e medição de uso simultâneo; responsável capaz de parar/recuperar |
| PILOT-03 — homologação humana supervisionada | PILOT-02 aprovado e avaliadora disponível; roteiro abaixo | Resultados observados por fluxo e browser, dificuldades registradas, valores comparados; bloqueio essencial tratado antes de ampliar uso |
| PILOT-04 — decisão sobre dados reais | Aceite técnico/humano, segurança e responsabilidades de dados aprovados | Autorização específica para banco novo sem demo; recuperação, privacidade, retenção e suporte aceitos; não implica liberação comercial |

Roteiro compacto sobre recursos existentes; usar cliente/produto/serviço/contas fictícios de uso geral, sem novas funções setoriais:

| Fluxo | Verificação automática dirigida na preparação | Observação humana na homologação |
| --- | --- | --- |
| Login/perfis | Válido/inválido, logout/expiração, operador sem acesso administrativo, rotas diretas | Acesso pela VPN/browser, mensagens compreendidas e permissões adequadas ao trabalho autorizado |
| Cadastros/estoque | Criar/editar/inativar cliente, fornecedor/prestador e item; entrada/inventário; estoque e histórico coerentes | Encontrar registros, compreender unidades/quantidades, buscas e filtros; sem alegar estoque físico validado |
| Vendas/caixa | Caixa próprio, rascunho, finalização, prazo e baixa; fixture de caixa independente (Q01) | Operar abertura/fechamento e conferir centavos/troco/recibo não fiscal |
| Financeiro | Lançamento, Pagar/Receber, parcial/estorno; OFX fictício com confirmação; Dashboard distingue falha e zero (F01/F02) | Entender saldos, situações, período, sugestões e erros; não efetuar transferências bancárias |
| Serviços/pedidos | Criar/editar, data civil, custos e gerar títulos uma vez; conferir IDs/valores | Interpretar 04/03/2026 e competência; teclado/calendário/Modal e foco sem ajuda dirigida |
| Saídas | Relatório selecionado/filtros/página, CSV sem alterar contrato e integridade dos valores | Prévia/PDF e impressora se disponível; reconhecer escopo da página impressa e formatos de data do CSV (P05) |
| Recuperação | Ensaio da seção 4 e comparações exatas | Responsável reproduz o roteiro; avaliadora reencontra registro e comprovante após restauração |

Registrar por caso: data, versão, perfil, ação, esperado, **observado**, evidência mínima e aprovado/reprovado/não executado. Reutilizar os testes já aprovados de IMP01/F01/F02 e o [roteiro humano/assistivo](../silex-business/SB-07E/HOMOLOGACAO-MANUAL.md); não repetir o ERP inteiro nem tratar automação como compreensão humana. Começar com uma sessão de 60–90 min e complementar somente os fluxos pendentes. Necessidades assistivas, aparelho e impressão física dependem da avaliadora.

Liberar a demonstração fictícia após PILOT-01/02 aplicáveis, acesso restrito, backup recuperável e smoke dos fluxos selecionados. Iniciar o piloto supervisionado quando agenda, contas, suporte, roteiro e regra de interrupção estiverem definidos. Divergência financeira, acesso indevido, perda de gravação ou controle essencial inacessível exige parar o fluxo e registrar diagnóstico. Dados reais exigem o gate específico em [DECISOES.md](DECISOES.md); não são consequência automática do piloto verde.

Referências: [workflow](../development/WORKFLOW.md), [arquitetura](../ARQUITETURA.md), [pendências](../silex-business/PENDENCIAS.md), [riscos S01/O01/A01/M01](../silex-business/SB-07E/RISCOS.md). Documentos históricos têm estado anterior à integração; IMP01, F01 e F02 estão integradas na base deste plano.
