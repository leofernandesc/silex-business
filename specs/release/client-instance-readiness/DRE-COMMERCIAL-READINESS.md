# DRE comercial e configuração econômica separadas

Base: `e90a3de62644aa864a17cb05448fe2e56803f6b5` (PR #19). Código e testes: `260e27d78e34095db4e9ec715e43474f7eab2751`. Branch isolada `fix/dre-commercial-configuration`; o commit documental seguinte contém estas evidências. O HEAD final e seus checks ficam na descrição do novo Draft PR empilhado sobre #19, evitando commits circulares de evidência.

Sem acesso à Railway, Sammya, SQLite persistente ou dados reais. Sem merge, deploy, alteração da main, referência publicada, usuários ou credenciais. A versão online é a informada pelo proprietário; não foi consultada. Não houve migração nem mudança de contrato da API, fórmulas ou política de reconhecimento.

## Causas reproduzidas

1. `DreReport` reunia demonstrativo, pendências por fonte, revisão de reconhecimento/cancelamento/cobertura, histórico e identificadores. Mesmo recolhidos, os detalhes administrativos pertenciam ao mesmo documento.
2. `dreReadableCsv` era um diagnóstico: serializava versões, chaves canônicas, razões livres, pendências e fatos individuais. Melhorar os rótulos não separava sua finalidade comercial da auditoria. O controle negativo de `dreCommercial.test.ts` falhou na base por encontrar essas informações.
3. Uma categoria financeira genérica não define, por si só, sua rubrica econômica. Sem classificação vigente, um serviço comprovado continua sem rubrica; um título avulso também precisa de evidência/data própria. Um serviço planejado com título continua sem comprovação de execução. Os dois tipos de pendência relatados pelo proprietário foram reproduzidos com fontes fictícias.
4. O motor existente já reconhece automaticamente a conclusão comprovada de serviço com título coerente e classificação válida. Não foi demonstrado defeito de cálculo que justificasse alterar esse motor ou presumir fatos econômicos. A deficiência era o caminho de configuração e sua mistura com o relatório.

## Separação implementada

| Área | Conteúdo e comportamento |
|---|---|
| Financeiro → DRE gerencial (`#finance-dre`) | Somente rubricas, situação financeira, valores conhecidos/finais, margens, período e mensagem breve. Detalhamento comercial autorizado, sem evidência/códigos de auditoria. |
| Administração → Configuração da DRE (`#finance-dre-config`) | Editor de categoria/subcategoria com vigência, prévia e confirmação; exceções com ações contextuais; reconhecimento comprovado; cancelamentos; cobertura; histórico; versões, fingerprints e chaves. |
| CSV comercial (`dre.csv`) | Lista explícita de campos financeiros. Não serializa fontes, códigos, versões, fingerprints, evidências, razões livres ou orientações. |
| CSV de diagnóstico (`dre-diagnostico.csv`) | Disponível na área administrativa, com rastreabilidade e fingerprints. Leitura nova e reautorizada, com as mesmas proteções de sessão da exportação comercial. |
| Impressão comercial | O DOM do demonstrativo já não contém seções administrativas. PDF A4 retrato, texto selecionável, valores completos e indicação de parcialidade. Não é uma remoção apenas por CSS. |

O endpoint técnico legado `/api/finance/dre.csv` foi preservado, inclusive contrato e autorização administrativa. O botão comercial não o utiliza: releitura de `/api/finance/dre` autorizada e projeção financeira explícita. O diagnóstico não foi convertido em uma exportação pública. Todos esses endpoints continuam exclusivos de administradores ativos, com os guards e filtros de origem/transporte existentes.

Estados comerciais: **nenhuma operação no período**, **informações insuficientes**, **resultado parcial**, **demonstrativo completo**. Sem operações ou sem valores reconhecidos não se mostra uma tabela extensa de rubricas vazias. Quando há valores conhecidos, eles aparecem mesmo se os resultados derivados continuarem indisponíveis. Zeros legítimos, centavos, sinais e margens completas são preservados.

A rota administrativa é separada, com título/breadcrumb próprios. O período civil aplicado acompanha a troca entre demonstrativo e configuração. As rotas anteriores e os 26 relatórios continuam disponíveis. `ExportButton` ganhou somente um rótulo opcional; seu padrão, tratamento de erro e bloqueio de cliques simultâneos permanecem.

## Configuração inicial e operação cotidiana

1. O administrador abre **Configuração da DRE**, escolhe o período e a categoria existente. O seletor identifica categorias com vigência no período e permite exceções por subcategoria.
2. Seleciona a rubrica, natureza/incidência e vigência apropriadas, informa justificativa, lê a **Prévia do impacto** e só então confirma. O mesmo `DreMappingEditor` do Plano financeiro grava o histórico existente; não há plano paralelo nem nova tabela.
3. Essa configuração é reutilizada para as operações equivalentes abrangidas pela vigência. Uma confirmação de categoria não é uma confirmação automática de todos os fatos econômicos.
4. Para uma fonte sem classificação, **Classificar esta operação** abre o alvo no editor da própria área administrativa. Não exige ir e voltar ao Plano financeiro. Após gravar, a consulta é atualizada e tarefas resolvidas deixam a lista ativa.
5. Um serviço concluído com data/evidência válidas e título coerente alimenta a rubrica sem revisão individual adicional. Não se oferece revisão manual para substituir conclusão, correção de vínculo inválido ou classificação faltante.
6. Um serviço não concluído aponta para sua operação original, onde a execução deve ser comprovada. Essa decisão operacional não é tomada na DRE.
7. Um lançamento avulso realmente não comprovado exige revisão administrativa de natureza/data/evidência. Após confirmação válida e atualização, deixa de ser tarefa ativa. Cancelamento financeiro não presume cancelamento econômico.
8. Cobertura de custos, tributos, CMV e depreciação só é confirmada com comprovação específica. Não há defaults empresariais de zero nem confirmações criadas automaticamente.

A configuração é da empresa/instância atual, conforme a arquitetura single-tenant existente. Não foi criada infraestrutura de multitenancy. Dados especializados continuam vinculados às identidades originais, sem transferência ou provisionamento de Sammya.

## Cenários sintéticos e resultados independentes

- **A:** configurar a categoria antes da operação, cadastrar cliente/serviço de **500001 centavos**, comprovar conclusão e gerar um título. Resultado: **uma receita de R$ 5.000,01**, sem decisão individual extra de reconhecimento.
- **B:** receber **200001**: principal pendente **500001 − 200001 = 300000**. Receita econômica continua **500001**, antes/depois da baixa e do estorno; mesmos fatos e título. Repetir geração de títulos não duplica o documento.
- **C:** serviço com título, mas sem conclusão: não contribui com receita. A tarefa de conclusão aparece somente na configuração administrativa e leva à operação original; não é oferecido reconhecimento substitutivo.
- **D:** título avulso de **10001** não contribui antes da evidência; após revisão válida, um fato de **10001**. A categoria já classificada é reaproveitada, mas a evidência não é herdada indevidamente de outro registro.
- **Reutilização:** um segundo serviço válido de **500001** usa o mesmo mapeamento. Cenário combinado de navegador: **500001 + 500001 + 10001 = 1010003**, sem incluir o serviço não concluído. Receita conhecida **R$ 10.100,03**; lucro final continua `null`, nunca zero fictício.
- **E:** CSV comercial e texto extraído do PDF não contêm as expressões técnicas proibidas, chaves nem fingerprints. Diagnóstico mantém chaves, fatos com sinal, versões e fingerprints. Nenhum dado da auditoria é apagado.

No novo teste backend, dois serviços válidos usam um mapeamento; somente a revisão avulsa cria `DreDecision`. Zero declarações de cobertura são criadas nesse fluxo. Os testes históricos separados de cobertura completa mantêm suas evidências fictícias explícitas e não são configuração padrão de empresa.

## Comparação antes/depois

Antes, o CSV misturava linhas como `Versão de classificação`, `Pendências`, `Identificador técnico (auditoria)` e `finance_entry:1:principal` ao resultado. O [controle negativo](evidence/dre-commercial/baseline-negative.txt) registra a falha reproduzida. Depois, o [CSV comercial](evidence/dre-commercial/commercial-desktop.csv) contém somente período, mensagem de parcialidade, rubricas/valores/situação e margens. O [diagnóstico sintético separado](evidence/dre-commercial/audit-desktop.csv) preserva as informações administrativas.

O [PDF A4](evidence/dre-commercial/commercial-a4.pdf) e as capturas desktop/mobile são saídas reais da aplicação local com dados fictícios. Não são telas inventadas nem documentos da empresa em homologação. A extração de texto do PDF permite conferir a ausência de metadados sem depender apenas de inspeção visual.

## Testes e evidências

Ambiente local: Linux, Python 3.12, Node 22 e dependências já fixadas no projeto. Playwright Chromium e Firefox instalados, bancos descartáveis por caso, portas 8041/8042. Não foi instalado software global nem consumido serviço Railway.

| Execução local | Resultado observado |
|---|---|
| Controle negativo do CSV na base | **1 FAIL esperado**, exposição de dados técnicos reproduzida |
| Backend novo dirigido | **1 PASS** após corrigir a leitura da fixture pelo endpoint detalhado |
| Backend completo | **350 PASS**, um aviso preexistente TestClient/httpx |
| Frontend completo | **339 PASS**, 25 arquivos |
| TypeScript/build | PASS |
| Comparação base `e90a3de` | **124 comparações / 26 relatórios, zero divergências** |
| Primeira ampliação Chromium, 94 execuções | **88 PASS / 6 FAIL** por expectativas antigas do conteúdo comercial; não declarada integralmente aprovada |
| Reexecução Chromium dirigida | **14/14 PASS**, inclui casos anteriores e regressões das duas exportações; não somar como testes distintos |
| Firefox dirigido | **98/98 PASS**, sete arquivos, desktop/mobile; inclui casos sobrepostos, não somar às reexecuções Chromium |
| CI final | O novo Draft PR executa novamente backend/frontend/build e a matriz completa de **412 casos por motor**, além dos complementos existentes. Conferir o SHA exato nos checks e na descrição do PR. |

Comandos na raiz:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_dre_commercial_workflow.py -q
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py --base e90a3de62644aa864a17cb05448fe2e56803f6b5 --output /tmp/silex-dre-commercial-legacy.json
git diff --check e90a3de62644aa864a17cb05448fe2e56803f6b5..HEAD
```

Em `frontend/`, com `PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers` e porta local isolada:

```bash
npx --no-install playwright test --config playwright.integration.config.ts dre-commercial.spec.ts dre-integration.spec.ts dre-review-fixes.spec.ts dre-release-ux.spec.ts dre-home-navigation.spec.ts ux-homologation.spec.ts
npx --no-install playwright test --config playwright.integration.config.ts dre-commercial.spec.ts dre-integration.spec.ts predeploy-export-session.spec.ts ux-homologation.spec.ts --grep 'DRE commercial|previous session|lookup failure|service lifecycle, classification'
# Firefox: SILEX_INTEGRATION_BROWSER=firefox, SILEX_E2E_PORT=8042; os mesmos seis arquivos e predeploy-export-session.spec.ts.
```

O teste novo gera captura, CSV e PDF quando `SILEX_DRE_COMMERCIAL_EVIDENCE` aponta para diretório temporário. Falhas HTTP/JSON inválido, recuperação, autorização 401/403, políticas históricas, cancelamentos, descrições reautorizadas, sessão trocada durante exportação, mídia print e Axe são exercitados. Layouts 1440/1024/768/375 px e as regressões gerais permanecem nos testes existentes.

Falhas intermediárias: a primeira fixture backend usou o resumo do título sem `category_id`; foi corrigida para consultar o detalhe autorizado. Na primeira ampliação E2E, duas execuções esperavam uma linha de lucro indisponível no estado sem dados; quatro esperavam evidência de reconhecimento dentro do detalhe comercial. As asserções agora conferem estado comercial breve, resultado `null` na API, evidência preservada na área administrativa e ausência de auditoria no relatório. As invariantes financeiras, autorização, valores e recuperação foram mantidas. Nenhum skip, retry ou timeout aumentado para obter aprovação.

## Arquivos e limites

- `dre.tsx`: demonstrativo comercial separado.
- `dreAdministration.tsx`: configuração inicial e componentes administrativos existentes transferidos para uma área própria; editor único reutilizado pelo Plano financeiro.
- `drePresentation.ts`, `dreExport.ts`: serializadores comercial/diagnóstico separados, mesmas proteções de sessão e releitura.
- `App.tsx`, `financePlanning.tsx`, navegação e helpers de período: rota administrativa autorizada, compatibilidade e contexto civil.
- `dre.css`: apresentação local e exclusão dos controles administrativos da impressão; não substitui a separação de DOM.
- `ui.tsx`: somente label opcional de exportação, sem alterar o comportamento padrão.
- Testes backend/frontend/E2E: fluxo reutilizável, exportação limpa, diagnóstico preservado, permissões, relatórios, sessões, estados e expectativas atualizadas para a separação autorizada.

Não há mudança em backend de produção, migrações, cadastros financeiros, recebimentos, saldos, centavos, histórico, APIs, contratos dos 26 relatórios, transporte, credenciais ou dados persistentes.

## Validação futura na homologação, somente após deploy autorizado

1. Conferir SHA publicado e criar apenas dados fictícios autorizados; esta entrega não fez o deploy.
2. Administração → Configuração da DRE: conferir a categoria real utilizada pelo título, vigência e subcategoria; ler a prévia antes de confirmar. Não classificar pelo nome presumido nem reescrever histórico silenciosamente.
3. Para o lançamento avulso relatado, obter documento/data/natureza verificáveis e confirmar na área administrativa. Sem evidência, manter sem reconhecimento.
4. Para o serviço relatado, consultar seu estado atual no módulo de origem. Somente se efetivamente executado, registrar conclusão com evidência válida. Não presumir que o banco continua no estado do CSV anterior.
5. Gerar/consultar o mesmo título sem duplicá-lo, abrir DRE no período da conclusão e conferir receita única. Baixa não substitui competência econômica.
6. Exportar **CSV comercial** e imprimir: verificar somente conteúdo financeiro e indicação breve de parcialidade. Usar **Exportar diagnóstico CSV** na configuração apenas para auditoria autorizada.
7. Repetir serviço equivalente para comprovar reutilização da classificação, sem confirmação individual redundante.

Continuam dependendo de decisão humana: classificação econômica apropriada, execução real do serviço, evidência de fatos avulsos, cobertura documentada dos componentes, cancelamento econômico quando aplicável e aceite financeiro/contábil. Não há atestado automático de zero, lucro líquido completo ou EBITDA sem suporte. Homologação em dispositivo físico, impressora e leitor de tela real não foi realizada nesta tarefa.

Os resultados locais registram as iterações de desenvolvimento. A aprovação da árvore imutável final é verificada pelo CI do SHA final; não se soma o controle negativo nem as reexecuções aos testes distintos.
