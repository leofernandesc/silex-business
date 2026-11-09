# UX da homologação: moeda, baixas e DRE

Candidata isolada de `24d9e3949b150474c78512335c5dbc47857fdacb` (PR #17), na branch `fix/homologation-money-layout-dre`. Código e testes deste incremento: **b2578c25489ecdc730bdc761c41f66f2e7e3a66d**. O commit posterior apenas arquiva este relatório e as evidências; o HEAD exato e o CI final ficam nos checks e na descrição do novo Draft PR, sem atribuir resultados históricos a um SHA novo.

**Pronta para revisão técnica; não publicada.** Nenhum acesso à Railway ou a banco persistente, alteração de usuário real, senha, main, PR anterior ou referência congelada de publicação. A aplicação da Sammya não foi acessada. O estado da instância publicada e a correção operacional do administrador são informações do proprietário, não uma nova consulta remota desta tarefa. Continua necessária autorização específica para atualizar a homologação.

## Reprodução e correção

| Achado | Causa comprovada / antes | Depois |
|---|---|---|
| Entradas monetárias naturais recusadas | O parser decimal comum recusou cinco dos oito exemplos básicos, incluindo prefixo e agrupamento; três exemplos sem prefixo passaram. | Parser monetário compartilhado, exato, separado de quantidades e percentuais; 62 testes parametrizados. |
| Estorno escondido | A borda direita do botão ficou em **1107,296875 px** numa viewport de 375 px na base, com baixa e comprovante fictícios. | Histórico em registros sem rolagem horizontal: identificação da baixa, motivo, ação, principal/encargos/desconto/líquido e comprovantes. |
| DRE vazia parecia defeituosa | Em janeiro/2000 sem fontes elegíveis a base mostrava 16 rubricas indisponíveis e versões zero. | Estado vazio legível, preservando indisponibilidade; não fabrica zeros nem reconhecimento. |
| DRE pouco legível | Texto longo e versões internas no conteúdo principal; colunas dos detalhes comprimidas no celular. | Orientação curta, versões em detalhes administrativos recolhidos, rubricas/fontes/margens em registros responsivos no celular. Mesmos dados e semântica de tabela. |
| Evidência de serviço rotulada como venda | O código compartilhado `verified_finalization` era traduzido sempre como venda, inclusive para serviços/custos. | Rótulo contextual da fonte: conclusão de serviço, incorrência de custo ou venda conferida. Sem mudar evidências econômicas. |
| Username público reservado aceito | CLI/API permitiam criar nomes que o startup público já recusava. Sete controles novos falharam na base; duas fixtures locais passaram. | `demo.admin` e `demo.operador`, com normalização de caixa/espaços, recusados antes da escrita no modo público. Fixtures locais e proteção do startup preservadas. |

[Controles negativos e resultados](evidence/ux-homologation/) são evidências sintéticas; não contêm bancos, backups ou contas reais.

## Dinheiro: regras determinísticas

`frontend/src/moneyInput.ts` usa **BigInt** e retorna centavos inteiros, sem parsing por ponto flutuante nem arredondamento. `money()`, cálculos financeiros e contratos de API não foram alterados.

- `5000,01`, `5000.01`, `R$ 5000,01`, `R$ 5000.01`, `R$ 5.000,01` e `R$ 5,000.01` resultam exatamente em **500001**.
- `5000` e `R$ 5000` resultam em **500000**. Aceita espaços normais, NBSP e espaço estreito não separável.
- Um único ponto/vírgula com uma ou duas casas é decimal. Com ambos, o último é decimal e o outro deve separar grupos de três. Grupos repetidos ou separados por espaço exigem três dígitos e não podem misturar estilos.
- `1.000` e `1,000` são ambíguos e recusados: informar `1000`, `1000,00` ou `1.000,00`. Também recusa casas excedentes, agrupamento irregular, exponencial, sinais duplicados e conteúdo arbitrário. Nenhum arredondamento silencioso.
- Limite mantido: **100000000000 centavos**. Negativos continuam recusados, exceto no saldo inicial assinado de contas, explicitamente habilitado. Entrada limitada a 128 caracteres.
- Nenhuma máscara reescreve a digitação. O E2E verifica inserção no meio do texto e posição do cursor.
- Quantidades de três casas e percentuais em pontos-base continuam em `parseDecimal`. A regra anterior de cálculo de totais de vendas por quantidade permanece igual; o parser não cria uma nova regra de arredondamento.

Consumidores revisados: preços de produtos/serviços; valores sugeridos de prestadores; serviços e custos contratados; vendas e descontos; abertura/fechamento de caixa; receitas/despesas/recorrências; baixas e encargos; saldos iniciais; movimentos do livro caixa; orçamento; campos de conciliação OFX. Os dois parsers monetários locais de orçamento/OFX foram substituídos pelo compartilhado. Não houve alteração no importador OFX, CSV ou backend financeiro.

Os testes de navegador salvam/reabrem produtos com os oito formatos básicos, recusam quatro formatos inválidos sem POST e verificam edição, venda com quantidade fracionária, custos de serviços, conta assinada e orçamento. Para receita e despesa: principal **200001**, juros **101**, multa **2**, desconto **3**, líquido **±200101**, saldo principal **300000**; estorno retorna o principal restante a **500001** e a soma das duas baixas a zero. Dois cliques geram somente uma mutação.

## Baixas, layouts e acessibilidade

`PaymentHistory` preserva os endpoints, ref de exclusão mútua, auditoria, permissões, motivo mínimo de três caracteres e tratamento de erro. O botão informa sua baixa por descrição acessível e fica junto à data/ID; o modal só conclui após resposta bem-sucedida. Comprovantes continuam vinculados às baixas e ao título.

A grade compartilhada usa trilhas `minmax(0, 1fr)`, campos sem largura mínima intrínseca e ações que podem quebrar linha. Controles e datas ficam alinhados com altura mínima coerente; regras de apresentação adicionais são limitadas à mídia de tela. Não houve nova paleta, tipografia, shell ou redesign.

Matriz automática real: Clientes, Produtos/Serviços, Serviços/pedidos, Vendas, Receber, Pagar, Visão financeira, Lançamentos, Plano financeiro e Relatórios, em **1440, 1024, 768 e 375 px**, em ambos os motores. Abre formulários disponíveis, verifica títulos, término de carregamento, largura do documento/modal, Escape e inclui nomes longos sem espaços e preço elevado fictício. Tabelas que exigem várias colunas mantêm seu contêiner rolável; não escondemos colunas para produzir PASS. A DRE foi exercitada separadamente em 1440/375 px; detalhes de fontes no celular têm células de largura legível, não colunas de poucas letras.

Axe não encontrou violações nas telas exercitadas de DRE parcial/completa e histórico de baixas. Isso **não** é certificação WCAG, teste com leitor de tela real ou aceite humano. As imagens anexas são capturas reais do navegador com fixtures fictícias. A inspeção visual abrangeu formulários representativos, histórico e DRE; medições de largura não equivalem a homologar todo dispositivo físico.

## Diagnóstico funcional da DRE

Não foi encontrado defeito de cálculo nos cenários reproduzidos. Versões zero, isoladamente, não demonstram falha: podem indicar ausência de fontes, falta de classificação ou simplesmente ausência de revisão manual — execução comprovada já pode fornecer reconhecimento válido. **Não consultamos o banco publicado para inferir sua configuração.**

| Cenário sintético | Evidência | Apresentação |
|---|---|---|
| A: sem operações elegíveis | Sem fatos, pendências, exclusões ou valores conhecidos em janeiro/2000. | Mensagem de período vazio, sem tabela de 16 linhas aparentemente quebrada. Não apresenta zero como resultado. |
| B: serviço concluído com título, sem mapeamento | Fontes presentes, versões iniciais zero e pendência `unclassified`. | Orientação para classificar/confirmar e link ao Plano financeiro. Nenhuma classificação presumida. |
| C: operação classificada e reconhecida, cobertura parcial | Receita conhecida **500001**; componentes sem prova e lucro final permanecem `null`. | Mostra o valor conhecido e aviso curto de resultado parcial. Não inventa CMV, tributos, DA ou lucro. |
| Cobertura integral comprovada na fixture | Cada componente recebe uma confirmação **explícita, fictícia e auditável**; não é configuração automática do ERP. | Rubricas e margens completas somente depois das confirmações. |

Jornada real de navegador: **Cliente → Serviço concluído com evidência → Título → Plano financeiro (prévia e confirmação de classificação) → Reconhecimento pela conclusão comprovada → DRE**. Descrição autorizada e rótulo de evidência permanecem acessíveis. Recebimento parcial e estorno bancário subsequentes não criam uma segunda receita nem um cancelamento econômico presumido.

No teste backend independente, serviço **500001** menos custo incorrido documentado **200001** = **300000** de resultado após confirmação de todos os demais componentes fictícios; margem líquida **60,00%**. Na fixture de interface, sem custo, receita **500001** e demais componentes explicitamente atestados como zero produzem **500001**. São cenários distintos, não bases reais nem aceite contábil.

Cálculo, versionamento, fingerprints, filtros de competência, reconhecimento, ajustes e guards não foram alterados. CSV técnico/readable e histórico econômico mantêm rastreabilidade; versões e ressalvas necessárias ficam disponíveis em detalhes administrativos. Os relatórios legados já possuíam rótulos comerciais e colunas de auditoria deliberadas: não removemos dados ou campos dos seus contratos.

Dois PDFs A4 sintéticos, parcial e completo, foram gerados e o texto extraído foi conferido: valores completos, ressalva material no parcial, ausência de botões/versões internas. Os componentes desconhecidos continuam como travessão. Firefox teve mídia print verificada; geração de PDF usa Chromium. Não houve impressão física.

## Usernames reservados e arquivos

O guard público compartilhado considera `GESTAO_ENV=railway` ou metadados de projeto/ambiente Railway. CLI recusa antes de solicitar senha ou abrir o banco; API valida o `UserInput` e responde 422 com mensagem objetiva, sem eco de senha/corpo. Não existe endpoint de edição de username nesta versão: não criamos um fluxo novo; os consumidores existentes do schema ficam protegidos. O provisionamento especializado e o login não foram alterados. Contas existentes não são editadas, removidas ou renumeradas.

| Área | Arquivos principais | Justificativa |
|---|---|---|
| Parser | `moneyInput.ts`, `moneyInput.test.ts` | Interpretação monetária independente, exata e parametrizada. |
| Consumidores | `catalog.tsx`, `partners.tsx`, `serviceOrders.tsx`, `sales.tsx`, `operations.tsx`, `finance.tsx`, `financeCatalog.tsx`, `ledger.tsx`, `financePlanning.tsx` | Substituições locais apenas nos campos de dinheiro; quantidades/percentuais preservados. |
| UX | `styles.css`, `accounts.css`, `dre.css`, `dre.tsx`, `drePresentation.ts` e seu teste | Alinhamento, histórico acessível, estados e leitura da DRE, rótulo de evidência correto. |
| Username público | `deployment.py`, `schemas.py`, `cli.py`, `start.py`, handler de validação em `api.py` | Regra única de nomes reservados; nenhum guard financeiro/sessão alterado. |
| Regressões | `test_reserved_usernames.py`, `test_dre_homologation.py`, `ux-homologation.spec.ts`, `playwright.integration.config.ts` | Novos testes e inclusão na matriz integral existente. |

**Sem migração**, novo campo, dependência, endpoint, transferência de propriedade ou alteração de contrato monetário. `frontend/src/api.ts`, a correção PRE-01 e os motores financeiros/DRE permanecem idênticos à base.

## Testes executados e reprodução

Ubuntu local, Python 3.12, Node 22, dependências fixadas já instaladas; Chromium **156.0.8078.4**, Firefox **157.0** do Playwright. Bancos exclusivos temporários por teste; scripts de integração recusam fixtures fora do ambiente descartável. Nenhum serviço externo ou crédito Railway utilizado.

| Execução local | Resultado observado |
|---|---|
| Backend completo | **349 PASS**, 239,10 s; um aviso preexistente de depreciação TestClient/httpx. |
| Frontend completo | **332 PASS**, 24 arquivos; 62 casos novos de dinheiro, quatro de estados DRE e dois de evidência contextual. |
| TypeScript/Vite | PASS. |
| Novo E2E | **25/25 Chromium e 25/25 Firefox**, uma bateria por motor, sem retries/skips. |
| Reexecução DRE após refinamento mobile | **2/2 em cada motor**, cenários já existentes nessa bateria, não testes novos. |
| Reexecução após chaves sintéticas aleatórias | **3/3 em cada motor**, subconjunto já contado. |
| Relatórios legados | **124 comparações / 26 relatórios, zero divergências** contra `24d9e39`. |
| Reinício/restauração | Três processos; linhas/IDs, fatos e bytes de anexo idênticos; `integrity_check=ok`, violações FK=0. |
| CLI/API pública dirigida | **52 PASS** (subconjunto com testes antigos), sobrepostos aos 349, não somar. |
| Teste do ciclo DRE | PASS, incluído nos 349. |

Comandos executados na raiz ou, quando indicado, em `frontend/`:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_reserved_usernames.py backend/tests/test_admin_cli_safety.py backend/tests/test_deployment.py -q
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_dre_homologation.py -q
npm test --prefix frontend
npm run build --prefix frontend
PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py --base 24d9e3949b150474c78512335c5dbc47857fdacb --output /tmp/silex-ux-legacy-comparison.json
SILEX_DRE_RESTART_OUTPUT=/tmp/silex-ux-restart.json PYTHONPATH=backend .venv/bin/python scripts/check_dre_restart.py
```

Execução E2E local utilizou um launcher temporário `ux.playwright.config.ts`, importando `playwright.integration.config.ts` e limitando `testMatch` ao novo arquivo e o projeto `audit` à viewport 1440×900 (os próprios casos exercitam os demais tamanhos). Este instrumento não é versionado. Comando efetivamente executado em `frontend/`:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers SILEX_E2E_PORT=8035 SILEX_UX_EVIDENCE=/tmp/silex-ux-verified-chromium SILEX_INTEGRATION_REPORT=/tmp/silex-ux-verified-chromium.json SILEX_INTEGRATION_OUTPUT=/tmp/silex-ux-verified-chromium-output npx --no-install playwright test --config ux.playwright.config.ts
# Firefox: SILEX_INTEGRATION_BROWSER=firefox, porta 8036 e arquivos separados.
# Reexecuções: --grep 'UX DRE:' e, depois, --grep 'UX DRE:|reversal action'.
```

Reprodução equivalente no checkout final, sem o instrumento temporário:

```bash
cd frontend
npx --no-install playwright install --with-deps chromium firefox
SILEX_E2E_PORT=8035 npx --no-install playwright test --config playwright.integration.config.ts --project desktop ux-homologation.spec.ts
SILEX_INTEGRATION_BROWSER=firefox SILEX_E2E_PORT=8036 npx --no-install playwright test --config playwright.integration.config.ts --project desktop ux-homologation.spec.ts
# Matriz integral da candidata, usada no CI: retirar --project e o nome do arquivo.
```

O workflow existente executa a matriz completa, backend, frontend, build, comparação legada, backup/restauração e complementos de datas, permissões/transporte. A matriz principal passa de 340 para **390 execuções por motor**: 25 definições novas × dois projetos, incluindo verificações de viewport deliberadamente sobrepostas. Não são 780 cenários funcionais únicos. Os resultados finais do SHA remoto serão registrados no PR/checks, não tratados como executados antes de existirem.

### Falhas intermediárias e controles negativos

- Base: dinheiro **5 FAIL/3 PASS** em oito requisitos; nomes reservados **7 FAIL/2 PASS** executando os testes novos com o backend original via `PYTHONPATH`; estorno **1 FAIL** por geometria real. O primeiro inventário de seis casos teve quatro PASS e dois FAIL: um vazio DRE confirmado e um erro de fixture de categoria; o estorno foi reproduzido novamente com a categoria correta antes de corrigir produção.
- A primeira candidata de 25 casos teve **22 PASS/3 FAIL em Chromium**: seletor de teste usava “Salvar” em vez do botão real “Cadastrar serviço”; dois casos encontraram incompatibilidade real entre texto visível e nome acessível dos novos botões DRE. Corrigidos os nomes/textos preservando as asserções. A execução Firefox dessa etapa foi interrompida e não conta como aprovação.
- Uma nova bateria teve **21 PASS/4 FAIL** por nomes fictícios maiores que o limite cadastral de 150 caracteres. Corrigida somente a fixture, mantendo textos longos dentro do contrato. Uma tentativa Firefox encontrou porta do launcher interrompido ocupada: encerrado somente esse processo de teste, sem reutilizar servidor desconhecido.
- O teste backend DRE inicialmente referenciava incorretamente a resposta compacta de geração de títulos e tentava uma baixa anterior à abertura da conta. A fixture foi ajustada aos contratos existentes: competência econômica antiga e liquidação na data atual. Nenhuma regra de saldo/data foi relaxada.
- A inspeção do PDF identificou um seletor de tela que fazia “Detalhar” reaparecer na impressão. Limitado à mídia screen e adicionada asserção de invisibilidade de **todos** os botões em print.
- Gitleaks marcou uma chave de idempotência fixa **fictícia** como possível API key. Confirmada a natureza não secreta e trocada por UUID aleatório na fixture; nova varredura sem achados. Não houve credencial real encontrada.

As cópias arquivadas de CSV usam LF para permitir verificação de diff; os SHA-256 dos bytes CRLF originais estão no manifesto. O exportador e os originais não foram alterados. Logs arquivados têm somente whitespace final normalizado.

Os relatórios finais preservam falhas e reexecuções como tais; testes dirigidos e completos se sobrepõem e não são somados como cobertura nova.

## Evidências e limites dos gates

- [Antes: DRE sem operações](evidence/ux-homologation/dre-empty-before.png) → [depois](evidence/ux-homologation/dre-empty.png).
- [Antes: histórico de baixas](evidence/ux-homologation/payment-history-before.png) → [depois](evidence/ux-homologation/payment-history.png).
- [Cliente em 375 px](evidence/ux-homologation/customers-form-375.png) e [serviço em desktop](evidence/ux-homologation/service-orders-form-1440.png).
- [DRE parcial desktop](evidence/ux-homologation/chromium-dre-partial-1440.png), [DRE parcial mobile Firefox](evidence/ux-homologation/firefox-dre-partial-375.png).
- [PDF A4 parcial](evidence/ux-homologation/chromium-dre-partial-a4.pdf), [PDF completo sintético](evidence/ux-homologation/chromium-dre-a4.pdf).
- [Valores/contratos legados](evidence/ux-homologation/legacy-comparison.json), [reinício/restauração](evidence/ux-homologation/restart-restoration.json); inventário e hashes em `evidence/ux-homologation/MANIFEST.json`.

**Gate A:** correções preparadas para revisão e futura atualização controlada da homologação após aprovação do SHA e checks finais. A versão publicada continua sendo a referência fixa informada; este PR não modifica a publicação. Não foi encontrado P0/P1 novo nos cenários deste incremento; isso não constitui garantia absoluta de ausência de defeitos.

**Gate B: NO-GO** enquanto faltarem aceite funcional da usuária, HOM-22 em dispositivo físico/impressora A4/leitor de tela, escopo econômico-financeiro aprovado para a oferta, backup externo/restauração e smoke test da instância autorizada, suporte e autorização expressa para operações reais. Não há multitenancy homologado; uma empresa por instância/banco. CMV automático, DA/provisões, reconhecimento por etapas, cancelamento econômico parcial e apuração fiscal não foram implementados por este trabalho.

Sem merge, deploy, migração persistente, seed público, alteração de credenciais ou transferência de dados. A atualização não está publicada e os PRs anteriores permanecem intactos.
