# Integração supervisionada do ERP

**Parecer: APROVADO COM RESSALVAS para revisão técnica da integração local.** Regressão executada em 07/11/2026 (America/Manaus), sem falhas críticas/altas pendentes nos cenários exercitados. Ressalvas: Firefox indisponível para automação e homologações físicas/humana/assistiva não realizadas. Não autoriza merge nem produção.

Commit funcional validado: `2b068818c817f75793b53257646e3535305c9edf`. O commit posterior acrescenta somente instrumentos/CI/documentação/evidências; o SHA final completo consta no Draft PR e na entrega, evitando inventar um auto-hash dentro deste documento.

## Base, escopo e preservação

Worktree isolada `silex-erp-integration`, branch `integration/erp-full-regression`, a partir da main confirmada `7214ad2543e0e980366a386b27cc7bbb39eddb32`, igual à origin/main na preparação. As três referências corresponderam exatamente às aprovadas:

| Frente | SHA integrado | Merge local na branch de integração |
|---|---|---|
| Transporte / PR #11 | 5aa52150ea0c64c01cb37ed53099899359ddbcbf | 36ea6cc |
| Formulários | 6c873d07cdfcbbf4f6bcdefc17e827a2b48cc439 | ede3021 |
| Financeiro / PR #12 | 288ba61d377054e5bac2872d9663e002fe76491c | 06571c1 |

Baseline e sobreposições em [BASELINE.json](BASELINE.json). Merges `--no-ff` preservam as três ancestralidades; não são merges na main. Branches, PRs e worktrees originais permanecem independentes. A visibilidade remota foi conferida como **pública**, conforme decisão anterior do proprietário; não foi modificada.

Conflitos resolvidos semanticamente:

- `serviceOrders.tsx`: manter guards/custos restritos e formulários assíncronos, feedback, atualização e cancelamento.
- `finance.tsx`: preservar capacidade e filtros do PR #11, estados de indisponibilidade/formulários e snapshots/filtros vinculados do PR #12.
- `ledger.tsx`: preservar resumo acessível e erro de contas; integrar snapshots, filtros ISO e links aplicados.
- `scripts/e2e_server.py`: manter fixture especializada explícita e manifestos temporários de sessão; acrescentar isolamento por teste, sem promover todos os administradores.
- Arquivos auto-integrados foram revisados, especialmente `financial.py`, `financePlanning.tsx`, schemas e testes de parceiros.

## Ressalvas corrigidas

### Autorização e fixtures

`test_registration.py`, E2E de cadastros e navegação passam a representar administradores genéricos e especializados. A matriz inclui Demo, segundo administrador genérico, dois administradores especializados, operador e visitante. A conta Demo não recebe transporte para fazer testes passarem. Os testes de API do PR #11 preservam 401/403, revogação, conta inativa, autoconcessão negada, renomeação, identidade recriada, propriedade e histórico financeiro.

Os cenários que usam frete fazem login em fixture explicitamente habilitada. A navegação genérica filtra rotas por capacidades retornadas pelo servidor. A nova matriz verifica também a resposta GET da tela de destino e seu breadcrumb real, evitando validar a tela anterior apenas pela mudança de hash.

### Texto de processamento

`Form.processingText` opcional mantém `Salvando...` como padrão. Os dois caminhos de cancelamento usam `Cancelando serviço...`. O teste cobre clique duplicado, HTTP 503, manutenção do modal/motivo, reabilitação e fechamento apenas no sucesso. O lock síncrono, fieldset, validação nativa e feedback de erro permanecem intactos.

### Integridade operacional somente leitura

Nova CLI `app.operational_integrity`: recebe uma cópia SQLite **offline**, existente e consistente; abre `mode=ro&immutable=1` e `query_only=ON`. Recusa WAL/journal pendente. Não importa a aplicação, inicia servidor, migra, corrige ou apaga dados.

Identifica custo com tipo de fornecedor divergente, fornecedor/pedido inexistente, referência financeira a custo ausente, divergências de fornecedor/pedido/direção/valor contratado. Executa `integrity_check` e `foreign_key_check`. A saída informa IDs e categorias, sem nomes nem credenciais. Testes comprovam hash do banco inalterado e dados inconsistentes preservados.

```bash
# Somente sobre cópia OFFLINE obtida em procedimento previamente autorizado:
PYTHONPATH=backend .venv/bin/python -m app.operational_integrity --database /copia-descartavel.sqlite3
```

Saídas: 0 íntegro, 2 inconsistências, 1 entrada/esquema inválido ou cópia não fechada. Não executar contra arquivo ativo; copiar apenas o .sqlite3 de uma aplicação com WAL aberto não é um backup válido. Nenhuma verificação foi executada na Railway.

### Isolamento da regressão / Q01

A matriz serial recebe um baseline SQLite privado no diretório temporário do launcher. Antes de cada teste, a API de backup SQLite restaura o baseline **no mesmo inode**, sem trocar o arquivo usado pelo pool. O reset recusa caminhos arbitrários, nomes diferentes e manifestos que não declarem banco descartável. Isso elimina dependência de caixa/estado entre suítes sem alterar asserções financeiras nem usar retries. Os fluxos dentro de cada teste continuam usando dados reais da API e SQLite, não mocks de cálculos.

### Defeitos adicionais confirmados na matriz de relatórios

Reproduzidos com 503 controlado: (a) reenviar filtros idênticos não refazia GET; (b) consulta malsucedida mostrava também “Nenhum registro encontrado” e contagem zero. Correção local: incrementar a versão no envio e apresentar dados/tabela/paginação apenas em sucesso, com carregamento e indisponibilidade explícitos. Impressão permanece desabilitada sem resultado válido. Não muda API, CSV, cálculos, colunas ou CSS de impressão. Uma verificação separada confirmou o mesmo problema no carregamento do orçamento: faltava feedback de erro e a tabela parecia vazia. O mesmo bloqueio local de dados pendentes/indisponíveis foi aplicado a esse painel, preservando criação, desativação e cálculos de orçamento.

## Inventário e cobertura

[FLOW-MATRIX.md](FLOW-MATRIX.md) e [INVENTORY.json](INVENTORY.json) foram construídos a partir das 25 rotas, 73 declarações de endpoints e testes reais. São 122 funções de teste backend antes da parametrização, não 122 execuções. O inventário estático não concede autorização a mutações; dependências do servidor continuam autoritativas.

A validação combina: API real/SQLite, invariantes de centavos/vínculos/transações, comparação base/candidata, navegador real, falhas controladas apenas nos cenários de tratamento HTTP, e inspeção estática. Navegar não comprova sozinho que todos os estados de um módulo foram exercitados; os testes específicos abaixo complementam o percurso.

## Matriz funcional executada

Resultado “PASS” refere-se aos cenários identificados, não a prova de todos os estados possíveis ou segurança produtiva.

| Módulo | Fluxos validados | Perfis | Resultado | Evidência |
|---|---|---|---|---|
| Público / login | seções, teclado, fontes, sem API privada, retorno protegido, inválido/válido, logout e expiração | visitante, admin, operador | PASS | browser.txt: public/navigation/home; backend test_app |
| Início / Visão Geral | atalhos, rotas distintas, dados reais de GET, reflow e permissões | seis identidades | PASS | browser.txt: home/integration/system-review |
| Clientes | criar/editar/buscar/inativar, documento normalizado, dados antigos e dois endereços, propriedade por ID | genéricos, especializados, operador | PASS | test_customer_details (32); registration; customer-details/forms/integration |
| Produtos e serviços | cadastro, preço, busca, validação, histórico e consumo | admin / operador conforme operação | PASS | test_app; app.spec |
| Fornecedores | cadastro, CNPJ alfanumérico, PIX, contato único, vínculos e tipo estável | admin genérico; negar operador | PASS | test_partners (17), registration, supplier_kind_links (20); forms/app |
| Diaristas | cadastro genérico, custos, quantidades e bloqueio de reclassificação vinculada | admin genérico/especializado | PASS | test_service_orders, supplier_kind_links; app/forms |
| Fretes subcontratados | cadastro/módulo com capacidade e negações diretas, sem esconder financeiro histórico | especializados / genéricos recusados | PASS | test_transport_capabilities (13), transport.txt; integration |
| Estoque | movimentos implementados, saldo, insuficiência, atomicidade e concorrência | admin; operador recusado | PASS | test_app; app.spec; route guards |
| Frente de caixa / Vendas | rascunho, dinheiro/cartão/crédito, cliente obrigatório, finalizar/cancelar, estoque, recibo | admin e operador/propriedade | PASS | test_app (35), app.spec |
| Serviços e pedidos | genérico, diarista/frete, custos/títulos, idempotência, edição permitida e negada, cancelamento/erros | genéricos e dois especializados | PASS | supplier_kind_links; transport_capabilities; forms/app/modal |
| Controle de caixa | abrir/fechar, único caixa ativo, conferência, propriedade, falha e zero real | admin e operador | PASS | test_app; app/modal/financial-states; reset isolado |
| Dashboard financeiro | oito indicadores integrados, confirmados/zero/erro, vencidos e janela inclusiva, atalhos e mensal | admin; negar operador/visitante | PASS | financial-stage1.txt (26), test_financial_stage1; browser |
| Livro caixa | filtros, presets, contas indisponíveis, lançamentos/estorno, impressão e CSV | admin; negar operador/visitante | PASS | test_financial_ledger (8); app/financial-states; timezones |
| Pagar / Receber | títulos, pesquisa/filtros, recorrência, baixa parcial/total, encargos, estorno, anexos e histórico | admin; negar não autorizado | PASS | test_finance_expansion (8), test_financial_print (14); app/modal |
| Conciliação OFX | importar/duplicados, conciliar/criar/ignorar, 400/401/403/404/422/500/503, rede, não JSON e corrida entre sessões | admin; negações backend | PASS | finance_expansion; ofx-errors em browser.txt |
| Contas | criar/editar, saldo inicial, histórico e restrições | admin | PASS | financial_ledger; app/modal e route GET |
| Categorias / Subcategorias | cadastro/edição/inativação conforme contratos, classificação, vínculos e filtros | admin | PASS | financial_ledger/finance_expansion; app/modal; routes |
| Relatórios (26) | tela/GET, filtros, paginação, todas as colunas, print/CSV, vazio, 503/recuperação e 401/403 | admin / operador / visitante | PASS | system-review; reports.txt; comparação JSON/CSV |
| Orçamento existente | cadastrar/atualizar meta, realizado, desativar/erro/duplicidade, consulta indisponível e recuperação | admin | PASS | finance_expansion; actions-review; reports.txt |
| Usuários / Histórico | criar/editar conforme API, inativação/revogação, proibir autoconcessão, preservar auditoria e IDs | admin / operador recusado | PASS | test_app, transport_capabilities; forms; route GET |
| Empresa | leitura/edição, documento, persistência, falha e nova tentativa | admin; leitura mínima autenticada | PASS | test_registration/test_app; forms/actions-review |
| Alias financeiro de fornecedores | catálogo genérico continua acessível, não concede transporte | admin genérico/especializado | PASS | integration route/API + transport |
| Persistência / migração | mesmo SQLite após reiniciar, guarda de tipo após reinício, 0012→0013 duas vezes, todas as colunas antigas preservadas | fixtures descartáveis | PASS | test_app, supplier_kind_links, transport_capabilities; backend.txt |

A matriz de seis identidades percorre 25 destinos por projeto, com login/guard e resposta GET das rotas permitidas. Reflow: 24 rotas genéricas + 25 especializadas em cinco larguras, repetidas nos dois projetos = 490 medições, **245 combinações distintas** de perfil/largura/rota. Não contar a repetição como cobertura de 490 telas diferentes. Tabelas têm rolagem própria quando prevista; o documento não deve exceder a viewport.

35 cenários de componentes cobrem calendário em Modal, Escape/retorno de foco, estados disabled/read-only, limpeza, datas inválidas/parciais/limites e competência, inclusive en-US/de-DE e fusos. Os quatro testes de fusos adicionais percorrem cinco presets em quatro instantes de fronteira (dia/mês/ano/bissexto), verificando parâmetros ISO reais e recarga em Manaus, UTC, Tóquio e Los Angeles.

### Impressão e PDF

[Galeria pequena](evidence/index.html), [mensal A4](evidence/monthly-a4.pdf) e [página 2 com valores altos](evidence/page-two-large-a4.pdf). Este último foi gerado com 23 títulos sintéticos: página 2 contém somente seus três registros, IDs e centavos completos, sem repetir a página 1. `pdfinfo` confirmou A4; `pdftotext` recuperou título, página e valores `R$ 999.999.999,79`, `,78` e `,77`. A primeira página renderizada foi inspecionada visualmente, sem cortes nesses campos. O documento de 39 campos resultou em **oito páginas**; não foi criada otimização de impressão. Não há homologação em impressora nem PDF acessível certificado (o gerador informou Tagged: no).

## Comandos e resultados observados

Ambiente: Linux x86_64, Python 3.12, Node 26.8.1/npm 11.19.0, Chromium/Brave 157, Playwright do lockfile. Dependências instaladas com pip do requirements e `npm ci`; manifests/lockfile permanecem idênticos à branch de formulários. O npm informou zero vulnerabilidades naquela instalação; isso não constitui auditoria completa de dependências. Um warning preexistente de depreciação Starlette/TestClient/httpx foi preservado, sem atualizar pacotes para silenciá-lo.

Nos comandos abaixo, `PW` representa somente a notação documental para `SILEX_CHROMIUM_PATH=/snap/brave/current/opt/brave.com/brave/brave npx --no-install playwright test`, executado em `frontend/`. Não é um comando instalado. Redirecionamentos originais em `/tmp` foram usados para reter os logs; cópias públicas substituem o caminho absoluto da worktree por `<integration-worktree>` e removem espaços finais/linhas vazias no fim para atender ao diff-check; não alteram resultados. Fingerprints dos logs originais estão no recibo estruturado.

| Comando executado | Resultado real / evidência |
|---|---|
| `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q --junitxml=/tmp/silex-integration-backend.xml` | **235 PASS, 0 falhas, 0 ignorados**; backend.txt e casos estruturados em test-results.json |
| `npm test --prefix frontend` | **195 PASS**, 18 arquivos, zero falhas; última execução em frontend.txt, reexecuções intermediárias não somadas |
| `npm run build --prefix frontend` | **PASS**, inclui `tsc -b` e Vite; build.txt |
| `SILEX_INTEGRATION_REPORT=/tmp/silex-integration-browser-final.json PW --config playwright.integration.config.ts --max-failures=8` | **242 PASS / 2 falhas de asserção antiga de URL / 0 ignorados**; browser.txt |
| `SILEX_INTEGRATION_REPORT=/tmp/silex-integration-browser-recheck.json PW --config playwright.integration.config.ts --grep 'navegação interna\|all 26 financial report types\|budget deactivation\|financeiro ampliado'` | **8 PASS**: reexecuta as duas falhas corrigidas e seis casos afetados previamente verdes; browser-recheck.txt |
| `PW --config playwright.integration-extra.config.ts` | Última execução **6 PASS**; um teste parametriza os 26 relatórios e outro verifica todos os endpoints/CSV com 401/403. reports.txt |
| `PW --config playwright.integration-dates.config.ts` | **4 PASS**, quatro fusos, fronteiras e recarga; timezones.txt |
| `SILEX_FINANCIAL_EVIDENCE_DIR=/tmp/silex-integration-financial-evidence .venv/bin/python scripts/check_financial_stage1.py` | **26 PASS**, treze cenários em dois projetos; financial-stage1.txt |
| `.venv/bin/python scripts/check_transport_module.py` | Última execução **8 PASS**, quatro cenários em dois projetos; transport.txt |
| `SILEX_REVIEW_BROWSER=chromium npx --no-install playwright test --config playwright.components-review.config.ts` | **35 PASS**, componentes e Modal; components.txt |
| `.venv/bin/python scripts/compare_integrated_finance.py` | **124 comparações / 0 divergências**, AST 32/32 preservados; finance-comparison.json |
| `git fsck --full` | exit 0; sem corrupção; 13 blobs e duas trees dangling mantidos, sem prune/clean |
| `git diff --check` | PASS; conferido também antes dos commits |

**Reconciliação da matriz:** 244 pares teste/projeto distintos, todos com execução aprovada ao fim, zero ignorados e zero falhas pendentes. Não se apresenta a execução 242/2 como uma execução única verde. A reexecução de oito não acrescenta oito casos distintos à matriz. Outros 79 pares teste/projeto dirigidos (35 + 26 + 8 + 4 + 6) têm finalidades próprias, parcialmente sobrepostas; não representam 79 módulos ou fluxos exclusivos. Resultados, títulos, projetos, duração e tentativas em [test-results.json](evidence/test-results.json).

### Falhas e reexecuções, sem ocultação

- Bateria backend dirigida inicial: **62 PASS / 8 falhas em 70** (`test_operational_integrity.py`, `test_supplier_kind_links.py`, `test_transport_capabilities.py`, `test_registration.py`). Em seguida, **4 PASS / 7 falhas em 11** ao ajustar a preparação da cópia. Causa: a fixture ainda tinha WAL/handles abertos e o verificador corretamente recusava entrada não offline. A preparação passou a usar a API de backup SQLite para uma cópia fechada; **11/11 PASS**, depois **235/235** na suíte completa. O verificador não foi relaxado. Reset de fixture: **3/3 PASS**, também incluídos nos 235.
- Piloto E2E de cinco casos: duas execuções **0/5** por manifestos com PID diferente entre worker e launcher. A configuração passou a herdar o caminho inicial. Terceira: **4/5**, com um frontend compilado anterior ao novo texto de cancelamento. Build atualizado; caso isolado **1/1**, posteriormente repetido na matriz ampla.
- Primeira matriz ampla: **183 PASS / 8 falhas / 53 não executados**, parada explícita em oito falhas; não contar os 53 como teste passado nem como teste desativado. Erros de fixture/contrato do teste: username incorreto do operador, mensagem de indisponibilidade mais específica, link antes procurado como botão e seis indicadores esperados onde o PR #12 tem oito. Sem concessão de privilégios nem redução das verificações.
- Nova matriz completa: **242/244**. As duas falhas eram a mesma asserção desktop/mobile exigindo `/app#finance` sem os filtros que o novo link deve preservar. Agora confere caminho/hash e **todos** os parâmetros esperados, mais o resumo aplicado. Reexecução dirigida **8/8**; nenhuma asserção foi simplesmente removida.
- Transporte independente: **6/8** inicialmente, porque o teste gerava vencimento em UTC enquanto o período da tela estava em Manaus (na execução, os dias eram diferentes). Fixture mudou para `localDate()`, sem mexer no filtro nem autorização; **8/8** depois.
- Três reproduções negativas novas: retry do relatório sem filtros novos, relatório malsucedido parecendo vazio, orçamento malsucedido parecendo vazio. Cada uma falhou antes da respectiva correção e passou depois. Primeira bateria adicional de relatórios: **3/3**; expandida com orçamento, 401/403 e página 2: **6/6**. As três são subconjunto da última execução, não nove casos adicionais.
- Falhas de preparação de comandos por diretório relativo foram corrigidas antes de executar as suítes correspondentes; não são resultados do produto. Fingerprints dos logs anteriores em [earlier-executions.json](evidence/earlier-executions.json). Não foram usados retries automáticos (configuração zero).

A correção final de feedback de consulta do orçamento foi posterior à matriz ampla; a função FinanceReports e seus fluxos foram reexecutados na bateria adicional e nos oito testes selecionados. Backend, dashboard extraído, datas, máscaras e demais caminhos não sofreram nova alteração funcional após suas validações. Isso explica por que não se repetiu toda a matriz de oito minutos novamente.

## Reproduzir em checkout limpo

Requer Python 3.12, Node compatível com o projeto (CI: 22; local: 26.8.1), npm, Git e Chromium compatível já instalado para E2E. Não executar `make setup`, bootstrap produtivo nem seed em banco persistente.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
.venv/bin/python scripts/validate_erp_integration.py --suite core
# Navegador instalado: deixar Playwright usar seu cache ou informar o executável:
SILEX_CHROMIUM_PATH=/caminho/para/chromium .venv/bin/python scripts/validate_erp_integration.py --suite browser
# Apenas listar comandos, sem executar testes:
.venv/bin/python scripts/validate_erp_integration.py --suite all --list
```

O wrapper cria um banco de guarda temporário, remove configuração Railway/origem pública e executa suítes sequencialmente. Cada launcher usa suas próprias fixtures descartáveis. A comparação financeira exige que o commit base esteja presente no clone; em clone raso, obter o histórico necessário antes de executá-la. A CLI de integridade não é chamada automaticamente sobre nenhum banco encontrado no computador.

Não havia CI de testes nas três frentes. Novo workflow mínimo: PR para main, Python 3.12/Node 22, dependências do lockfile, backend, frontend, TypeScript/build e diff-check; sem deploy, segredos ou conexão persistente, uma única job com timeout e cancelamento de execução obsoleta. E2E completos permanecem dirigidos/localmente para controlar custo. Ações fixadas por SHA; referências oficiais: [checkout](https://github.com/actions/checkout), [setup-python](https://github.com/actions/setup-python), [setup-node](https://github.com/actions/setup-node). Um workflow versionado não é prova de uma execução remota bem-sucedida.

## Preservação financeira e contratos

124 comparações equivalentes base/candidata: 68 resultados JSON e 56 CSVs byte a byte. Fixtures incluem centavos, baixas parciais, juros/multa/desconto e estornos. Timestamps sintéticos foram fixados; somente campos voláteis documentados e `summary.as_of_date` aditivo são normalizados no comparador herdado. Os bytes CSV não são normalizados. [Resultado e limites](evidence/finance-comparison.json).

32 funções financeiras selecionadas foram comparadas por AST e permanecem iguais. Isto não afirma que todo o backend é igual: guards de transporte e normalização de documentos são mudanças intencionais das frentes aprovadas. `edit_supplier`, políticas de capacidade, provisionamento, migração 0013 e serviço de pedidos permanecem equivalentes ao PR #11. [Comparação de autorização](evidence/authorization-preservation.json).

Contratos incorporados do PR #12: `summary.as_of_date` aditivo e alias `status=pending` (aberto + parcial), sem redefinir quitação integral como data de baixa. Campos CPF/CNPJ são normalizados conforme a branch de formulários. A integração não introduz novos contratos financeiros, endpoints HTTP nem novas migrações; incorpora somente a 0013 já revisada.

## Arquivos e revisão do diff

Inventário integral em [FILES.tsv](FILES.tsv), incluindo os arquivos já revisados nas três frentes e os acrescentados à integração. O tamanho do diff contra main inclui as três frentes; não deve ser interpretado como reescrita adicional de todos esses arquivos.

Mudanças funcionais específicas da integração, além dos merges semânticos:

- `frontend/src/ui.tsx` e `serviceOrders.tsx`: texto de processamento opcional e cancelamento específico.
- `frontend/src/financePlanning.tsx`: atualização explícita e estados de relatórios/orçamentos; não altera OFX, cálculos nem formatadores de impressão.
- `backend/app/operational_integrity.py`: CLI offline sem escrita; não registra endpoint ou inicia migração.
- Testes/launchers/configurações: identidades explícitas, reset de fixture descartável, GET real por rota, quatro fusos e relatórios. Não muda asserções de valores para acomodar resultados incorretos.
- Scripts de inventário/comparação/validação, CI mínimo e documentação/evidências: execução independente reproduzível.

Os manifests de dependências e lockfile são exatamente os da branch de formulários; não houve atualização adicional de pacotes nesta integração. DatePicker, MonthField, civilDates, Dockerfile e inicialização permanecem iguais à main. [Hashes e verificações](evidence/source-preservation.json). [Varredura dirigida](evidence/sensitive-review.json): assinaturas de chaves/tokens/URLs com credencial e tipos de arquivos sensíveis, além da revisão de diff; Gitleaks não disponível. Não é uma nova auditoria completa de todo o histórico Git.

[CHECKSUMS.sha256](CHECKSUMS.sha256) cobre os arquivos modificados/adicionados, exceto o próprio manifesto. Verificação na raiz: `sha256sum --check specs/integration/CHECKSUMS.sha256`. Os manifestos históricos das três frentes não foram reescritos para fabricar evidência retroativa.

## Critérios e riscos residuais

| Critério | Situação |
|---|---|
| Três SHAs incorporados e originais preservados | Atendido; ancestralidade e baseline registrados |
| Autorização genérica/especializada no backend e frontend | Atendido nos perfis e negações listados |
| Integridade financeira e identidade dos vínculos | Atendido nas fixtures, comparação de resultados e persistência |
| Migração 0013 descartável | Atendido: colunas/registros antigos iguais, novos flags desativados, integridade/FKs sem erro |
| Backend completo, frontend completo e build | Atendido: 235 / 195 / TypeScript+Vite |
| E2E relevantes e todos os módulos implementados | Atendido nos cenários da matriz; 244 pares reconciliados e 79 dirigidos complementares |
| Ressalvas obrigatórias e falhas altas/críticas conhecidas | Resolvidas nesta branch; nenhuma alta/crítica pendente nos casos exercitados |
| Reprodutibilidade | Comandos/fixtures, logs, testes versionados e CI mínimo; resultado remoto será informado no PR |
| Firefox, dispositivos físicos e avaliação humana/assistiva | Limitações explícitas; não validadas nesta execução |
| Produção | Fora do escopo; exige autorização e checklist separado |

Riscos: compatibilidade Firefox/Playwright ainda não demonstrada (médio, executar em ambiente compatível); impressão de 39 campos extensa (baixo, desenho aprovado, sem otimização neste trabalho); depreciação TestClient/httpx (baixo, suíte passa; atualização separada); recuperação/dados reais (bloqueadores **de publicação**, não da fixture isolada). Nenhum resultado de demonstração remove os requisitos operacionais futuros.

A aprovação com ressalvas é um parecer sobre esta integração e os cenários descritos, sujeito à revisão independente. Não substitui a autorização do proprietário para integrar a main ou publicar.

## Segurança operacional e publicação

| Ação | Realizada? |
|---|---|
| Acesso a banco persistente/Railway | Não |
| Migração persistente | Não; 0012→0013 somente em fixture descartável |
| Provisionamento real / mudança de senhas reais | Não |
| Deploy / alteração de infraestrutura | Não |
| Alteração de fórmulas financeiras | Não; comparação de resultados e AST |
| Alteração de guards | Incorporação dos guards aprovados do PR #11, sem relaxamento |
| Transferência de propriedade | Não |
| Merge na main / alteração dos PRs #11 e #12 | Não |

As credenciais conhecidas nos testes são exclusivamente fictícias, restritas às fixtures temporárias. Manifestos privados gerados pelos launchers não são versionados. Nenhum banco, backup operacional, .env, chave ou token integra a entrega.

[PUBLICATION.md](../financial-stage1/PUBLICATION.md) continua obrigatório: backup SQLite **e anexos** verificável, restauração ensaiada, inventário de identidades/metadados antigos, sem transferência automática, migração 0013 supervisionada, provisionamento específico autorizado de Sammya, testes Demo/especializadas e regressão financeira posterior. Não há autorização de produção por aprovação desta branch.

P05 permanece parcial, P07 dívida controlada, V01/T01 em acompanhamento. Q01 ganha isolamento na matriz de integração; outros launchers legados continuam exigindo fixtures independentes. Firefox/Playwright indisponível é limitação E01, não compatibilidade comprovada. Não há teste de leitor de tela real, dispositivo físico ou impressora física; não há declaração WCAG global.
