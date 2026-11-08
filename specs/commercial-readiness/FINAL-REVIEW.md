# Revisão de prontidão comercial — Silex Business

**Parecer: PENDENTE DE CORREÇÕES para uma oferta SaaS multicliente e de liberação operacional para dados reais.** Os defeitos reproduzidos de integridade, apresentação e recuperação foram corrigidos; a candidata tem evidência local ampla para uma homologação supervisionada em instância exclusiva. Isso não comprova separação entre empresas, operação produtiva, segurança completa nem homologação humana. Não houve publicação.

## Versão, escopo e evidência

Base auditada: `9f284fb6cfaeea7f34bc8ce4d4eba7075f3c9c82`, PR #13, mantido aberto e intacto. Main/origin-main na preparação: `7214ad2543e0e980366a386b27cc7bbb39eddb32`.

Worktree exclusiva `silex-commercial-readiness`, branch `fix/erp-commercial-readiness`. Commit de implementação da candidata: **`f3b745d736adb903eb3b9e5bcca01361d6305535`**. O ajuste posterior `3c6e2b3` sincroniza somente o teste de caixa e adiciona atraso controlado; os demais commits posteriores de evidência/documentação não modificam a implementação; conferir o HEAD final e os checks do Draft PR direcionado à branch de integração. Não houve alteração das branches #11/#12/formulários nem da main.

Commits funcionais:

- `746dc004ff1e4f2ab6bd8d74b8caff2cd4f4f019`: estados HTTP/consultas, quitação, integridade e recuperação, instrumentos/CI e testes.
- `6a7302623bb1c4491ba8d04e862acca65701a8dd`: login acessível, preservação do foco financeiro, cabeçalhos e paginação de impressão.
- `e5a25233323a9ed4ca21ff3ca5726267cf1a1a1a`: manter faixas pequenas de colunas juntas na impressão.
- `0c06430ce0bcffe338b8edca6effde626c88cebf`: detalhes financeiros aninhados, saldo pendente e timestamps em Manaus.
- `f3b745d736adb903eb3b9e5bcca01361d6305535`: falhas auxiliares de orçamento/subcategorias/livro caixa e preservação de descrições/documentos que parecem datas.

O [manifesto de fonte](evidence/source-checkpoint.json) associa hashes à implementação. O backend da suíte completa em `746dc00` é byte a byte idêntico ao backend da candidata final. Os recibos locais de 306 pertencem a 0c06430; os últimos ajustes têm 234 unitários e 16 E2E dirigidos, e a matriz integral atual de 312 deve ser conferida nos checks do HEAD final do PR. O repositório permanece público conforme decisão anterior do proprietário, conferida via GitHub; não foi alterada sua visibilidade. O [inventário independente](UI-INVENTORY.json) parte de AST da interface; o [registro de backend](BACKEND-INVENTORY.json) foi obtido de uma aplicação real com esquema descartável. São 25 rotas, 154 pontos de interação estáticos e 72 operações API registradas. Não se convertem esses números em jornadas aprovadas por inferência.

Ambiente local: Ubuntu 24.04.5 LTS, Linux 7.0.0-42-generic, Python 3.12.3, SQLite 3.45.1, Node 26.8.1, Playwright 1.64.0, React 19.3.0; dependências dos lockfiles/requirements existentes. Navegadores correspondentes ao Playwright: Chromium 156.0.8078.4 e Firefox 157.0. CI preparado para Ubuntu 24.04/Python 3.12/Node 22. Única dependência de projeto acrescentada: `@axe-core/playwright@4.14.0`, MPL-2.0, somente desenvolvimento, sem importação no bundle do ERP.

## Resultados observados nesta auditoria

| Execução distinta | Resultado | Evidência |
|---|---|---|
| Backend completo após correções/novos casos | **288 aprovados**, zero falhas/ignorados | [log](evidence/backend-final.txt) |
| Frontend completo final | **234 aprovados**, 20 arquivos, zero falhas/ignorados | [log](evidence/frontend-final.txt) |
| TypeScript + Vite final | Aprovados | [log](evidence/build-final.txt) |
| Chromium, bateria completa anterior ao último ajuste textual de relatório | **304/304**, uma única bateria, zero falhas/skips/retries | [log](evidence/chromium-304.txt); fonte compilada e5a2523 |
| Firefox, bateria completa em 0c06430 (antes das últimas guardas) | **306/306**, uma única bateria, zero falhas/skips/retries | [JSON](evidence/firefox-306.json), [log](evidence/firefox-306.txt); fonte 0c06430 |
| Chromium, bateria completa em 0c06430 (antes das últimas guardas) | **306/306**, uma única bateria, zero falhas/skips/retries | [JSON](evidence/chromium-306.json), [log](evidence/chromium-306.txt); fonte 0c06430 |
| Datas/filtros/dashboard financeiro dirigidos | **30 Chromium + 30 Firefox** | [Chromium](evidence/finance-chromium.txt), [Firefox](evidence/finance-firefox.txt) |
| Componentes de datas e Modal/foco | **35 Chromium + 35 Firefox** | [Chromium](evidence/components-chromium.txt), [Firefox](evidence/components-firefox.txt) |
| Módulo opcional, fixture separada | **8 Chromium + 8 Firefox** | [Chromium](evidence/transport-chromium.txt), [Firefox](evidence/transport-firefox.txt) |
| Últimas guardas auxiliares, detalhes/print e foco | **16 aprovados** (8 cenários × desktop/móvel), complemento à matriz | [log](evidence/final-directed.txt) |
| CI do HEAD documental final | **312 casos por navegador** + backend/frontend/build: resultado verificado e registrado na descrição/checks do Draft PR após sua criação | Não substituir pelas baterias locais anteriores |
| Comparação financeira com integração aprovada | **124 iguais**: 68 respostas JSON e 56 CSVs byte a byte | [comparação](evidence/finance-comparison.json) |
| Container local, volume, HTTPS e recuperação | Aprovado com volume/usuários sintéticos | [log](evidence/docker-recovery.txt) |
| Gate de CI | 7 casos aprovados, inclusive diffs inválidos realmente recusados | backend/tests/test_pr_diff_gate.py; logs da suíte |

Os complementos se sobrepõem à matriz; **não somar como cobertura única**. O CI remoto pertence ao HEAD do Draft PR, e seus resultados serão registrados na descrição do PR após execução. Este relatório não apresenta o run histórico `42439906782` como prova da candidata atual. Não se declara um check remoto aprovado antes de observá-lo.

A matriz final de CI contém todos os 244 pares caso/projeto históricos e 68 adicionais, totalizando 312: estados HTTP/consulta/CSV, acessibilidade e relatório/volume. Ambos os projetos usam uma fixture nova por caso, um worker e retries=0. As últimas guardas tiveram três falhas de E2E reproduzidas antes e seis aprovações depois, além das regressões de foco/detalhes. A formatação passou a respeitar a natureza do campo: descrições/documentos/nomes que parecem ISO permanecem literais; datas de agrupamento diário continuam brasileiras. Testes não foram desativados. Os três condicionais históricos de sessão recebem manifesto temporário e foram efetivamente executados.

### Falhas, reproduções e reexecuções

- Primeiro CI desta candidata (`2040e05`, [run 42480807089](https://github.com/leofernandesc/silex-business/actions/runs/42480807089)): core **288 backend/234 frontend/build PASS**; Firefox **312/312**, mais 30 financeiros, 8 transporte e 35 componentes; Chromium **311 PASS/1 FAIL**, complementos não executados após a falha. [Recibo](evidence/ci-initial.json). A falha móvel de caixa escolhia abrir/fechar por `isVisible()` antes de aguardar o estado consultado. Uma consulta inicial retida reproduziu exatamente o timeout original de 60000 ms, sem alterar o produto. O teste agora comprova os três estados de carregamento, ausência das duas ações durante a consulta e aguarda uma ação válida antes da decisão; conserva abertura/fechamento por teclado e foco após cada operação. [Reprodução](evidence/cash-race-before-controlled.txt): 1 FAIL; [Chromium](evidence/cash-race-after-chromium.txt) e [Firefox](evidence/cash-race-after-firefox.txt): 2 PASS cada (desktop/móvel), sem retries. A matriz permanece em 312 casos e será executada integralmente no novo HEAD; o primeiro run não é apresentado como bateria aprovada no Chromium. O resultado do novo CI deve ser conferido nos checks e na descrição do PR #14, vinculados ao SHA final.

- Primeira suíte backend: 251 PASS/2 FAIL. Os dois casos congelavam o dia em 07/11/2026 depois de criar contas na data corrente. A fixture passou a alinhar a referência de abertura; a proteção de saldo inicial não foi relaxada. Reexecução intermediária: 286 PASS; suíte ampliada final: 288 PASS.
- Primeira matriz integrada ampliada: **295 PASS/5 FAIL de 300**. Quatro falhas demonstraram perda de foco após novo bloqueio durante refresh de contas. Uma detectou falta de h1 visível no login móvel. As causas foram corrigidas; os seletores de prontidão foram tornados mais específicos (`.app-shell main h1`), preservando as verificações de foco e valores.
- Uma tentativa de 304 casos foi interrompida após 12 aprovações durante a inspeção visual do PDF, para corrigir faixa de colunas dividida. Seus 291 não executados e um interrompido **não são aprovações**. A bateria seguinte executou integralmente 304/304; depois foram executados 306/306 em cada navegador. As três guardas auxiliares finais acrescentam seis pares e a matriz atual tem 312 casos. O CI deve validar essa versão integralmente; os recibos locais de 306 são identificados como anteriores a essas guardas.
- Ajuste de agrupamento de impressão teve duas falhas dirigidas ao gerar cinco páginas; a causa era aplicar break-inside à primeira faixa maior que uma folha. A regra foi limitada às faixas seguintes. Mantido o teste de no máximo quatro páginas para essa fixture, sem ampliar seu limite.
- Os sete testes novos de apresentação falharam executando o código anterior de relatório (e5a2523) em módulo descartável e passaram após a correção. Evidências [antes](evidence/report-details-before.txt) e [depois](evidence/report-details-after.txt). Esse módulo temporário foi removido.
- O ensaio antigo de container esperava seis cartões e um botão para abrir o livro caixa; a interface aprovada do PR #12 já possui oito cartões e um link. O instrumento passou a conferir os oito cartões e a semântica real do link, sem remover checagens de login, cookie, persistência ou logout.
- O primeiro guard de respostas desta auditoria recusou campos legitimamente nulos de caixa aberto. Foi corrigido para aceitar somente os nullable previstos, com teste que continua recusando saldo de conta nulo.
- Preparações instrumentais falharam por diretório de execução ou caminho de browser incorreto, não por fluxo de produto; foram corrigidos o cwd explícito da fixture e o uso de browser correspondente ao Playwright. Duas falhas de página 500 ocorreram durante reconstrução concorrente de `dist`; com build e testes sequenciados a bateria de 30 casos Firefox passou. Nenhum timeout/assertion foi ampliado para mascarar o problema.
- Na primeira fixture da CLI, uma senha sintética de dez caracteres passou pela validação e tentou gravar em SQLite vazio recém-criado na worktree, sem tabelas; nenhum registro foi criado. O arquivo foi conferido vazio e removido. A fixture negativa usa entrada curta e impede abertura de qualquer banco. Nenhum banco preexistente foi utilizado.

Alguns logs do executor contêm espaços finais/linhas vazias incompatíveis com o próprio gate de diff. As cópias legíveis foram normalizadas **somente nesse whitespace**; os bytes originais permanecem em gzip, com [proveniência e hashes](evidence/log-provenance.json). Nenhum resultado, asserção ou valor foi alterado.

As reproduções negativas são evidência de defeitos ou do instrumento, não testes “ignorados” nem execuções aprovadas. Não há retries automáticos. Falhas anteriores não foram apagadas/reclassificadas como sucesso.

## Correções e preservação financeira

Ver [DEFECTS](DEFECTS.md) para causa, reprodução, severidade e teste de cada correção. Destaques:

- Dados financeiros inválidos não são convertidos em zero para quitar. Campo opcional realmente vazio continua zero legítimo; total inválido fica indisponível e nada é enviado.
- Request key de outra quitação/título é recusada com 409; o mesmo título/payload continua idempotente.
- Relatório por documento aplica período de inclusão em Manaus; resultado mensal respeita affects_result, como o Dashboard já fazia. Filtro de conta incompatível com orçamento global é explicitamente recusado em JSON/CSV e não oferecido nessa consulta. Isso altera intencionalmente o comportamento antes silencioso; não afirmar contratos completamente idênticos nesses casos.
- Os 26 relatórios têm comparação célula por célula do CSV com todas as páginas da API, filtros fora do período, dados/ausência e 401/403. Não apenas geração de arquivo.
- Oracle adicional independente: recebimento parcial 3001+101+17−37=3082 centavos, despesa 4003, recebimento final 7000, estornos preservados. Fluxos brutos finais 14085/7085 e saldo 7000 conferidos em API, banco, reinício e backup restaurado com anexo.
- As 124 comparações da fixture histórica continuam iguais; não incluíam a subcategoria excluída nem o filtro de documento defeituoso, por isso foram acrescentados oracles independentes. Das 32 funções financeiras selecionadas, 30 têm AST idêntica; duas alteram predicados de seleção, não expressões de soma/arredondamento.
- [Preservação](evidence/preservation.json): 16 arquivos protegidos idênticos, incluindo models/schemas/services/financial/service_orders/capabilities, transport_admin, componentes de datas e configuração de publicação; funções atuais de autenticação/guards/get_db idênticas por AST. Nenhuma permissão foi concedida ou removida.

## UX, segurança e integridade

Consultas são vinculadas à chave atual, abortam requisições obsoletas e não mantêm produtos/valores antigos como atuais. Tabelas diferenciam falha de vazio e oferecem nova tentativa. HTTP estruturado/HTML/rede/timeout tem mensagem segura, deadline de 30s e nenhuma repetição automática de mutações. Downloads CSV usam o mesmo tratamento central, preservam bytes/contratos e bloqueiam cliques simultâneos.

A recepção ASGI limita bytes reais antes de interpretar JSON/OFX, incluindo header ausente/falso e envio lento; 400/413/408 não confirmam gravação. O limite de 10 MiB comporta o OFX atual e cada anexo permitido. A CLI administrativa exige terminal com entrada protegida, recusa fallback com eco e sanitiza validação/conflito. Não cria conta de produção automaticamente.

Matriz de identidades: genérico Demo, segundo genérico, dois especializados, operador, visitante; inativo/revogação/autoconcessão nos testes backend. Cadastro genérico, diaristas e financeiro histórico permanecem disponíveis às permissões existentes. Transporte exige admin ativo + capacidade explícita, sem exceção por username; propriedade de metadados não foi transferida.

Axe percorreu login, 25 rotas e modal de clientes em desktop/móvel, sem regras excluídas para fabricar aprovação. Ver recibos da matriz e [galeria](evidence/index.html). Responsividade exercida em 1440/1024/768/375/320; componentes também em 291 px. Dados de volume: 240 clientes criados, páginas distintas, exportação completa e recarregamento. Datas/filtros em Manaus, UTC, Tóquio e Los Angeles, com mudanças de dia/mês/ano e ano bissexto. Não há homologação de leitor de tela real, dispositivo físico, impressora ou conformidade WCAG completa.

Gitleaks 8.30.1, binário oficial com checksum verificado: [inventário sem valores](evidence/secret-scan.json). Os achados observados são hashes de preservação e request_keys fictícios de idempotência; não foram identificadas credenciais reais. Isso não certifica ausência de todo dado pessoal ou segredo desconhecido. Arquivos de banco, ambiente, chaves, backups, caches e builds estão fora da entrega. npm audit: zero alertas conhecidos; OSV: zero para as 32 versões Python após atualizar somente o pip da venv isolada (24→26.3). Não houve atualização de runtime indiscriminada nem pentest/scan completo de imagem.

A migração 0013 permanece intacta. O envelope de migrações agora inicia transação SQLite real antes do DDL: interrupção após ALTER faz rollback de coluna e revisão; retry funciona sem recriar dados. Foi reconstruído o backend histórico `191ed179...` em diretório temporário, criado esquema 0012 sintético, migrado e comparadas todas as colunas anteriores/IDs/linhas. PRAGMA integrity_check e foreign_key_check, reinício e recuperação foram aprovados. Também permanecem os testes 0011→0012 de endereços legados.

Container final de ensaio: backend/entrypoint do e5a2523, idênticos aos da candidata, limite 470 MiB, um serviço/processo e volume privado. Banco vazio sem seed, ausência de volume recusada, migração inválida recusada sem apagar registros, duas instâncias impedidas, reinício/container novo iguais, anexos restaurados, HTTPS local, cookies Secure/HttpOnly/Strict, host/origin/proxy forjado e login/logout testados. Amostra em repouso **72,13 MiB**, CPU **0,11%**; pico **142028800 bytes**, incluindo CLI. Não é teste de capacidade, carga prolongada ou garantia de operação na Railway.

Metadado público do GitHub ainda registra deployment bem-sucedido de `191ed179e2c7f8b2a3e53ddd1aca422e4168cdf0`, em 17/10/2026. [Recibo](evidence/deployment-reference.json). **A versão do processo e o banco em execução não foram verificados**, pois não houve acesso à Railway.

## Reproduzir e conferir CI

No checkout limpo, instalar requirements/lockfile sem seed persistente:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
cd frontend
npx --no-install playwright install chromium firefox
cd ..
.venv/bin/python scripts/validate_commercial_readiness.py --layer core --output /tmp/silex-core
.venv/bin/python scripts/validate_commercial_readiness.py --layer browsers --browser chromium --output /tmp/silex-chromium
.venv/bin/python scripts/validate_commercial_readiness.py --layer browsers --browser firefox --output /tmp/silex-firefox
.venv/bin/python scripts/check_pr_diff.py --base 9f284fb6cfaeea7f34bc8ce4d4eba7075f3c9c82 --head HEAD
```

O script imprime o comando/cwd, interrompe na primeira falha e conserva logs no diretório fornecido. Não recria asserções nem aplica retries. Em Linux descartável de CI, o workflow instala dependências de sistema dos browsers com `playwright install --with-deps`. Localmente foi usado `PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers`; não foi instalado software global.

Comandos efetivamente executados: `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q`; em frontend `npm test`, `npm run build`, `npx --no-install playwright test --config playwright.integration.config.ts` (ambos browsers via SILEX_INTEGRATION_BROWSER), `npx --no-install playwright test --config playwright.components-review.config.ts`; na raiz `.venv/bin/python scripts/check_financial_stage1.py`, `scripts/check_transport_module.py`, `scripts/compare_commercial_finance.py`, `scripts/check_railway.py --build --browser --image silex-commercial-readiness:final-audit`; parâmetros/cache e resultados nos recibos. Docker nunca publicou imagem nem conectou à conta Railway.

O CI verifica o diff **completo** entre base e HEAD reais, rejeita whitespace/marcadores/conflitos e roda o gate negativo sobre commits inválidos descartáveis. Um PR só documental recebe gate leve; código/instrumentos recebem backend/frontend/build e matriz Chromium/Firefox, com financeiro/transporte/componentes em fixtures próprias. Sem deploy, segredos ou conexão persistente.

## Impedimentos e decisão de liberação

O ERP continua multissetorial; transporte é opcional. Nenhum endpoint novo/tenant/assinatura/DRE foi criado. DRE/EBITDA continuam especificação proposta, não recurso homologado. Não foram encontrados botões demonstrativos sem implementação entre as ações inspecionadas; isso não prova ausência absoluta de defeitos ou todas as combinações de dados.

A oferta precisa definir se é instância exclusiva por empresa ou SaaS compartilhado. **Não existe isolamento entre empresas independentes**, provisionamento comercial, contratação/assinaturas ou autosserviço de recuperação/encerramento. A configuração de empresa e os dados genéricos são globais na instância. Isso bloqueia a oferta compartilhada, mesmo com testes verdes.

Para dados reais, faltam autorização, backup do volume real/restauração ensaiada, inventário de identidades e dados antigos, atualização supervisionada, teste pós-migração e operação/suporte/monitoramento/RPO/RTO definidos. Não se implementa essa infraestrutura automaticamente. Ver [RELEASE-CHECKLIST](RELEASE-CHECKLIST.md) e [FLOW-VALIDATION](FLOW-VALIDATION.md).

**Operações persistentes/de produção nesta tarefa: nenhuma.** Sem acesso ao SQLite Railway, migração persistente, provisionamento real, alteração de contas reais, transferência de propriedade, alteração de fórmulas financeiras, merge na main ou deploy. Predicados incorretos e guard de idempotência foram corrigidos explicitamente; regras de autorização existentes permanecem iguais. P05 parcial; P07 controlada; V01/T01 em acompanhamento. A liberação comercial não é autorizada por este relatório.
