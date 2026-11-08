# Silex Business — Plano de implementação: DRE + consolidação de experiência

**Documento:** PI-DRE-UX-001 · **Versão:** 1.0 · **Data:** 08/11/2026  
**Norma vinculante de escopo:** [`SILEX_DRE_ESPECIFICACAO_TECNICA.md`](SILEX_DRE_ESPECIFICACAO_TECNICA.md).  
**Baseline:** `leofernandesc/silex-business` — PR #14, SHA `00fcaa5f869d702dda6ad535d264a0216dd11b65`. PR em Draft na consulta.  
**Objetivo:** entregar o conjunto de mudanças aprovado pelo proprietário sem repetição de fluxos, sem merge, deploy ou acesso ao banco real.

## 0. Protocolo de trabalho e preparação (bloqueante)

1. Conferir status, base e HEAD de [PR #14](https://github.com/leofernandesc/silex-business/pull/14) no início da execução. Se o HEAD divergir de `00fcaa5...`, recalcular diff/risco; não presumir a mesma base.
2. **Não implementar sobre `main` diretamente** nem modificar o branch `integration/erp-full-regression` sem aprovação. Se o PR #14 já tiver sido integrado de maneira aprovada, criar branch `feat/dre-integrated-financial-ux` a partir do SHA aprovado da integração. Se ainda estiver pendente, criar branch isolada a partir do HEAD do PR #14 e abrir **Draft PR empilhado**, com dependência declarada; nenhuma conclusão de integração é presumida.
3. Antes de mudar qualquer arquivo, gerar inventário de arquivos afetados, contratos atuais, rotas, migrations e matriz de testes. Revisar conflitos com PRs abertos, sem sobrescrever código.
4. Congelar comparações de referência: API `/api/dashboard`, `/api/finance/dashboard`, os 26 relatórios/CSV, venda→título→baixa, OS→títulos→baixa, conciliação OFX, permissões `transport_operations`, histórico de URLs.
5. Manter **SQLite sintético descartável** para desenvolvimento. Nada de usar credenciais, volume Railway, dados de cliente, fotos ou backups reais no workspace. Não copiar dados privados para fixtures/logs.
6. Registrador de decisões: cada premissa financeira não verificável torna-se pendência visível com nome, impacto, fallback seguro e teste que comprova não ter sido interpretada como zero.
7. Definir autoria: alterações em pequenos commits por entrega; todos os passos exigem testes antes de avançar. Não ocultar falhas, desativar testes nem criar `skip` para “concluir”.

## 1. Entregas e sequência recomendada

| ID | Entrega | Pré-requisito | Resultado demonstrável |
|---|---|---|---|
| **E0** | Baseline e proteção | PR #14 inspecionado | Snapshot de contratos/fixtures, CI reproduzível, nenhum efeito em produção |
| **E1** | Consertos de consistência | E0 | Recebíveis parciais coerentes nas duas telas; retry OFX em tela, com testes |
| **E2** | Contratos de DRE e regras de cobertura | E1 | Especificação executável, cenários de comércio/serviços, nenhum lucro falso |
| **E3** | Migrações e políticas versionadas | E2 | Mapeamento e revisão auditável, histórico preservado, rollback sintético comprovado |
| **E4** | Motor DRE + APIs | E3 | Fatos únicos, lucro parcial/honesto, drill-down, reconciliação e CSV |
| **E5** | UX integrada (cadastros, relatórios, dashboard, início) | E4 | Plano financeiro, DRE nos relatórios, Início unificado, Visão financeira especializada |
| **E6** | Ordem de serviço contextual + fluxos ponta a ponta | E4 + E5 | Conclusão contextual, geração única confirmada, custos/incorrência rastreados |
| **E7** | Auditoria, homologação com fixture e entrega para revisão | E1–E6 | CI completo por navegador, relatórios, matriz de regressão e Draft PR sem publicar |

**Estratégia para reduzir retrabalho:** E1 isolada; E2+E3 apoiadas em testes de domínio; E4 sem mudar as 26 saídas atuais; E5 majoritariamente frontend; E6 depois de contratos econômicos estáveis; E7 valida integração. Idealmente entregar por commits/PRs menores ou commits organizados em um Draft PR; ao empilhar PRs, documentar dependências e não integrar branches automaticamente.

## 2. E0 — Baseline técnico, contrato e matriz de regressão

**Inspeções:**

- Backend: `backend/app/models.py`, `services.py`, `financial.py`, `reporting.py`, `service_orders.py`, `api.py`, `schemas.py`, migrações `backend/migrations/versions/`, `backend/tests/`.
- Frontend: `frontend/src/App.tsx`, `home/AuthenticatedHome.tsx`, `home/model.ts`, `navigation/routes.ts`, `navigation/useAppNavigation.ts`, `financialOverview.tsx`, `financePlanning.tsx`, `financeCatalog.tsx`, `serviceOrders.tsx`, `financialNavigation.ts`, `types.ts`, CSS e testes.
- Referência já existente: `specs/financial-stage1/DRE.md`, `dre-examples.json`, `backend/tests/test_dre_specification.py` — **especificação aritmética, não engine**.
- CI: `.github/workflows/integration-tests.yml`; `Makefile`, `frontend/package.json`.

**Artefatos:** `specs/dre-integration/BASELINE.md` (SHA, contratos, dependências, permissões, limites), `MATRIX.md` (fluxos e expectativa), fixtures apenas fictícias. Revisar critérios de aceite do documento ST-DRE-UX-001.

**Gate E0:** nenhum pressuposto sobre modelo de dados que não esteja confirmado no HEAD; baseline verde ou falhas preexistentes delimitadas e documentadas.

## 3. E1 — Consertos imediatos (antes da DRE)

### E1.1 Recebíveis e vencidos

**Defeito confirmado:** `/api/dashboard` considera `FinanceEntry.status == 'open'` e `amount_cents` integral, enquanto `/api/finance/dashboard` considera também `partial` e subtrai principal já pago.

**Ação:** extrair rotina compartilhada `open_title_principal(db, ...)` / query agregada equivalente no serviço financeiro. Critério: `open|partial`, `remaining=max(amount_cents - principal_pago_com_estornos, 0)`, por direção, vencimento e dados da data civil do servidor. Caso de 1000 com 400 quitados = 600 nas duas telas; vencidos também coerentes. Atualizar consultas sem divergência de escopo/permissões, de modo que operador não obtenha financeiro global. Testes com compensação e estorno, vencimento hoje/ontem, sem títulos e centavos.

### E1.2 Retry do histórico OFX

**Defeito de UX identificado:** `frontend/src/financePlanning.tsx` no ramo `imports.error` renderiza somente `Notice` sugerindo reabrir a tela, impedindo o acesso ao `LedgerTable onRetry={imports.reload}` no momento da falha.

**Ação:** botão acessível **Tentar novamente** no ramo de erro que chama `imports.reload`, ou manter tabela com erro/retry visível, com proteção contra múltiplos cliques. E2E: HTTP 503 → aviso → retry → 200 sem sair da tela; responsivo e navegação por teclado.

**Gate E1:** testes específicos backend/frontend/E2E, compatibilidade com API atual; nenhuma mudança financeira de negócio invisível.

## 4. E2 — Especificação executável do motor econômico

Criar no código uma biblioteca pura (ex.: `backend/app/dre_policy.py`) com contratos imutáveis/funções determinísticas; não começar pela interface. O motor deve diferenciar:

- **Causa econômica:** venda finalizada/entregue, serviço executado, obrigação/receita manual comprovada, custo incorrido, encargos reconhecidos.
- **Título (`FinanceEntry`)**: documento/cobrança e vínculo; pode preceder ou suceder o fato econômico.
- **Pagamento (`Payment`)**: caixa; não reconhecimento independente do principal.
- **Classificação:** rubrica da DRE, mapeamento versionado, exclusão/incompletude.
- **Cobertura:** `complete|partial|unavailable|not_applicable` com `missing_components`, contagem e origem.

**Contrato interno sugerido:**

```text
RecognizedFact {
  key: "sale:123:principal" | "service_order:5:revenue" | ...,
  source_type, source_id, component, linked_finance_entry_id?,
  economic_date, amount_cents: signed_integer,
  dre_line_code, mapping_revision?, recognition_revision?,
  recognition_basis, status, issue_codes[]
}
DRELine {
  code, known_amount_cents?, final_amount_cents?: integer|null,
  coverage_status, contributing_facts, pending_facts, issue_codes[]
}
```

**Regras de validação:** centavos inteiros, datas civis ISO, regra da subcategoria explícita > categoria; `affects_result` incompatível => issue; sem mapeamento => `unclassified`; ausência de DA/CMV/TL => indisponibilidade dependente. Não prometer lucro líquido/EBITDA antes de cobertura validada. Registrar cenário de receita líquida <= 0; margens `not_applicable`, valores monetários preservados.

**Fixture de referência:** vendas crédito/à vista; desconto de venda versus pagamento; OS concluída e não concluída; custo previsto versus incorrido; OFX associado e novo; título manual confirmado e não confirmado; recorrências futuras; parcial/estorno; empréstimo; transferências; estoque com custo ausente; impostos e DA desconhecidos; retroatividade.

**Gate E2:** exemplos independentes aprovados, testes unitários determinísticos e invariantes de duplicidade demonstradas. **Nenhum** engine que simplesmente copie `Payment.competence_date` ou `FinanceEntry.status='paid'` como critério de competência econômica.

## 5. E3 — Persistência aditiva, histórico e políticas

**Procedimento:**

1. Inspecionar Alembic head efetivo; na baseline é `0013`. Criar revisão(ões) **aditivas**; não modificar migrations antigas nem regenerar banco existente.
2. Implementar `dre_category_mapping_history`: categoria/subcategoria, linha, vigência, revisão, responsável, motivo e relação com revisão anterior. Definir estratégia de unicidade para `subcategory_id` nulo e detectar sobreposição de vigências dentro de transação SQLite.
3. Implementar `dre_recognition_decisions` para reconhecimento e exceções, ligado a IDs reais e componentes, com revisão e motivo; não criar lançamentos DRE que dupliquem `FinanceEntry`.
4. Implementar registro mínimo de revisão por período/declaração de componente igual a zero **comprovado**; permitir replay de versão histórica e prévia das diferenças antes de uma retroclassificação.
5. Adicionar à OS evento de conclusão (`completed_on` e auditoria/metadata conforme convenção). Migração de registros `completed` preexistentes: **não deduzir data de conclusão de `service_date` ou `updated_at`**; marcar para revisão.
6. Para FinanceEntry legado, **não fazer backfill de reconhecimento automático**; inventariar pendências. Eventual default só para novos eventos cujo reconhecimento decorra de fato explícito e comprovável.
7. Ensaiar upgrade de banco sintético desde `0012` e `0013`, interrupções/rollback, integridade de FKs, contagens, centavos, ausência de alteração em IDs, relações e hashes de registro antigo; simular retries de Alembic.

**Gate E3:** migração reversível no laboratório, sem alterações nos registros antigos, mapeamento histórico reproduzível, alteração retroativa auditada, concorrência coberta e testes idempotentes.

## 6. E4 — Motor DRE e contratos HTTP

### E4.1 Pipeline de leitura

1. Selecionar registros operacionais potencialmente econômicos por **data econômica**, com filtros seguros e batch queries.
2. Resolver `source_type/id/component` para identidade canônica única; vincular Sale/FinanceEntry/Payment e OS/Cost/FinanceEntry/Payment; evitar somas duplicadas.
3. Resolver confirmação do fato, data econômica, valor e natureza dos ajustes; empurrar ambiguidade para `issues` sem somar como zero.
4. Resolver classificação versionada correspondente ao período/versão da consulta e `affects_result`.
5. Agregar rubricas em centavos, propagar estado de cobertura e calcular somente totais/percentuais válidos.
6. Expor drill-down desde linha até registro original, com `recognition_basis`, IDs e valores; opção de correção **abre a funcionalidade original**.
7. Reconciliar resultado reconhecido, títulos, caixa e exclusões, **sem exigir igualdade entre DRE e fluxo de caixa**; explicar as diferenças por tempo/natureza.

### E4.2 APIs e autorização

Implementar endpoints propostos em ST-DRE-UX-001: resumo, itens, pendências, mapeamentos, revisão de reconhecimento, reconciliação e CSV. Reaproveitar dependência de admin e capacidade de transporte; toda rota de detalhe/CSV testada diretamente, não apenas visibilidade do menu. Validar `start<=end`, paginação, referências existentes, conflitos de revisão, filtros e ausência de fórmula em CSV.

### E4.3 Exemplos de testes econômicos

| Caso | DRE | Caixa | Observação |
|---|---|---|---|
| Venda a prazo R$ 1.000 concluída em nov, R$ 300 em nov, R$ 700 em dez | Receita reconhecida em nov (caso entrega comprovada) | 300 nov / 700 dez | Nunca duplicar principal |
| OS R$ 5.000, custos acordados R$ 2.000; concluída; títulos gerados | 5.000 de receita; custos reconhecidos somente se incorridos e comprovados | Conforme baixas | Não confundir previsto com realizado |
| OS concluída sem títulos | Pendência explícita; não inventar receita contabilizada | Sem movimento novo | Link para confirmar títulos |
| OFX R$ 400 conciliado com título existente | Sem novo principal | 400 registrado na conta | Anti-duplicação |
| Título parcial 1.000 / quitado 400 | 1.000 principal se fato reconhecido | 400 | Saldo pendente 600 |
| Categoria sem mapeamento | Cobertura parcial; totais dependentes indisponíveis | Sem alteração | Revisar cadastro atual |
| Operação com CMV inexistente | Lucro bruto/líquido não final | Sem alteração | Nunca CMV=0 por omissão |
| Estorno em mês seguinte | Ajuste rastreável segundo política | Saída/entrada do estorno no mês real | Não reescrever mês antigo |

**Gate E4:** regra de não duplicar demonstrada por testes independentes; zero/incompleto explícitos; exportação reproduzível; N+1 controlado; nenhum contrato dos 26 relatórios alterado silenciosamente.

## 7. E5 — Interface única, sem cadastros paralelos

### E5.1 Plano financeiro

- Criar `FinancePlanPage` aproveitando formulários atuais em `financeCatalog.tsx`: categorias com subcategorias expansíveis, criação/edição contextual, busca, status e status de mapeamento.
- Mesmos endpoints legados para CRUD; formulário de classificação DRE utiliza endpoints versionados, com justificativa e prévia de histórico. `affects_result` permanece editável sob as regras de validação.
- Rotas antigas `finance-categories`, `finance-subcategories` abrem abas da tela nova; menu único **Plano financeiro**, sem links quebrados nem duplo item. Preservar acessibilidade e URLs compartilháveis.

### E5.2 DRE em Relatórios Financeiros

- `financePlanning.tsx` deve suportar a visão DRE **sem inseri-la ingenuamente no `REPORTS` legado de `reporting.py`**, pois a saída estruturada, cobertura e paginação da DRE são distintas. Preservar os 26 relatórios/contratos e o texto que identifica a contagem desses relatórios.
- Reaproveitar filtros/período, componentes tabulares/estados/CSV/impressão; UI mostra valores **indisponíveis** em vez de “R$ 0,00” quando não apurados.
- Linhas expandem detalhes paginados; botão **Revisar classificação** navega à categoria/subcategoria ou fato original, sem formulário redundante.
- Exportação/print incorporam metadados de completude e total do período; imprimir todo o demonstrativo, não página atualmente carregada.

### E5.3 Unificar Início + Visão geral

- Em `App.tsx`, consolidar `AuthenticatedHome` e `DashboardPage` num componente/page canônico `Início`. **Não** duplicar consultas por montar ambos em paralelo; extrair cards/atalhos reutilizáveis somente quando agregarem valor.
- Perfis: operador vê métricas próprias de vendas/caixa, sem contas globais; admin vê totais globais, pendências autorizadas e resumo operacional. Indicadores opcionais de serviço usam dados autorizados. Evitar hero exclusivo de PDV para instalação de serviços.
- `#dashboard` é alias compatível com `#home`, com refresh/back/forward e estado de navegação corretos. Não mudar links de serviço sem teste.

### E5.4 Financeiro → Visão financeira

- Somente renomear menu/título, mantendo ID `finance-dashboard` e API `/api/finance/dashboard` para compatibilidade.
- Indicadores de recebíveis passam a usar função compartilhada E1; bloco resultado por classificação continua **“realizado por baixa/competência da baixa”**, não é substituído pela DRE.
- Incluir no máximo cartão/resumo DRE com fonte do motor E4, status completo/parcial e link para Relatórios → DRE. Não recalcular DRE no frontend.

**Gate E5:** navegação de ponta a ponta sem perda de links, menus duplicados ou informações sensíveis; desktop/tablet/mobile, teclado, foco, contraste, estados de erro e carregamento.

## 8. E6 — Serviços e pedidos: conclusão e títulos no fluxo

1. Registrar conclusão com data econômica **quando o usuário confirma** o serviço realizado, sem inferir data anterior. Não pedir novamente valor/cliente/fornecedores já cadastrados.
2. Mostrar no mesmo contexto da OS os custos acordados e permitir confirmar a incorrência por item ou marcar como pendente; qualquer valor divergente segue fluxo de revisão auditada e não edita silenciosamente o contratado já vinculado a título.
3. Se não houver títulos, apresentar **Gerar títulos agora?** com confirmação de conta, vencimento e competência; valores e destinatários são pré-preenchidos a partir da OS. Se o usuário optar por depois, a OS permanece concluída e exibe aviso/atalho persistente.
4. Manter `ServiceOrderTitleRun` e idempotência/concurrency: um conjunto de títulos por OS, sem duplo clique/corrida criar duplicatas. Não disparar geração ao renderizar, recarregar ou editar status sem consentimento.
5. A DRE deve usar **a mesma OS e seus títulos**, sem terceiro lançamento; a ausência de custo comprovado é lacuna explícita.
6. Cancelamento/revisão após conclusão exige trilha de eventos e avaliação da competência; não permitir rollback da conclusão que apague histórico econômico.
7. Preservar autorização de transporte e valores de frete subcontratado, inclusive em resumos/agregados da nova UI.

**Gate E6:** testes de OS criada → concluída → confirmação opcional → títulos únicos → recebimentos/custos → DRE; OS concluída sem títulos; cancelamento/estorno; duplicidade e autorização.

## 9. E7 — Regressão, auditoria independente e preparação de homologação

### 9.1 Comandos já existentes

Usar ambiente isolado com Python 3.12/Node 22 (conforme CI), dependências instaladas do lockfile; verificar comandos contra repositório da branch:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
cd frontend && npx --no-install playwright test --config playwright.integration.config.ts
```

A suíte Playwright de integração deve rodar em **Chromium e Firefox**, com browser explicitado por `SILEX_INTEGRATION_BROWSER`, conforme workflow atual, sem retries/skips. Se pertinente, scripts adicionais de regressão e testes de componentes do workflow devem acompanhar. `make test` e `make test-e2e` existem; **não** executá-los contra DB não descartável.

### 9.2 Testes dirigidos obrigatórios

- Unit: invariantes monetárias, classificação versionada, cobertura, cálculo de margens, ajuste/estorno, chave canônica, competência, data civil.
- Integration backend: migrations 0012/0013→head e falha no meio, IDs/FKs/contagens, venda crédito/à vista, título parcial, OFX (matched/posted/replayed), OS com e sem títulos, recorrência, cancelamento, idempotência.
- Contract: snapshots estáveis dos 26 relatórios, CSV/print, `/api/dashboard`, `/api/finance/dashboard`, permissões admin/operator/transport; atualização explícita apenas do cálculo **bugado** de pendentes na home, demonstrando a diferença desejada.
- E2E: cada fluxo novo, histórico de URLs, navegação, menu único, link DRE→cadastro original, admin/operador, sem transport, erro de rede e retry, telas vazias/parciais, exportação/print, foco/teclado/mobile, timezone Manaus, Chromium/Firefox.
- Performance: massa sintética representativa de títulos+parcelas+categorias/OS/meses; medir número de consultas/latência. Não aprovar degradação grave de relatórios/abertura da home.
- Segurança: IDOR, capability, CSV injection, alteração concorrente de mapeamento, forged requests, vazamento de anexos/identificadores em endpoints da DRE.

### 9.3 Evidências a entregar no Draft PR

- `specs/dre-integration/IMPLEMENTATION-REPORT.md`: SHA exato, escopo, arquivos, decisões finais, limitações e incompatibilidades conhecidas.
- `specs/dre-integration/FINANCIAL-RECONCILIATION.md`: cenários com valores em centavos, esperado vs realizado, duplicidade, relatórios anteriores preservados, exceções.
- `specs/dre-integration/UX-FLOW-MATRIX.md`: URL/rol/perfil, fluxo, número de preenchimentos, evidência de nenhuma duplicação, teclado/responsivo.
- `specs/dre-integration/MIGRATION-REPORT.md`: inspeção de versão, upgrade e restauração sintéticos, invariantes do DB.
- `specs/dre-integration/REVIEW-CHECKLIST.md`: aprovados, pendentes para profissional contábil, incompatibilidades, gates de release.
- CI e logs dos jobs no **HEAD final** do PR; screenshot/simulações com dados fictícios quando úteis. Não inventar execução nem chamar de “completo” aquilo que só foi especificado.

### 9.4 Critério de encerramento

**Aprovação técnica para homologação em ambiente isolado** somente se E1–E6 estiverem cobertas, migrações íntegras e regressão completa passar com evidência, sem P0/P1 ou lacunas disfarçadas. **Comercialização como DRE completa** apenas onde cobertura/critério contábil forem suficientes; DRE parcial deve continuar explicitamente rotulada. A autorização para homologação, merge e deploy pertence ao proprietário em etapas separadas.

## 10. Riscos, mitigação e pontos de interrupção

| Risco | Severidade | Mitigação/condição |
|---|---|---|
| Contar venda + título + pagamento | Crítica | Fato canônico por origem e contrato de reconciliação |
| Tratar títulos pagos como única base da DRE | Crítica | Separar competência econômica de baixa financeira |
| Inventar CMV, imposto ou DA zero | Alta | Cobertura parcial e dependências indisponíveis |
| Reclassificar história automaticamente | Alta | Versionar e exigir prévia, motivo e confirmação |
| OS sem `completed_on` preexistente | Alta | Requer revisão; não inferir data de `service_date` |
| Expor custos especializados na DRE | Crítica | Guards de capacidade em todos os endpoints, inclusive agregados/CSV |
| Quebrar 26 relatórios ou links antigos | Alta | Contratos congelados e aliases de navegação |
| Bloquear operação ao tentar “simplificar” OS | Alta | Contextual, opt-in, idempotente, cancelável, sem criação silenciosa |
| Migração SQLite parcial | Crítica | Alembic transacional, testes de interrupção e cópia restaurada |
| Escopo excessivo no caminho de venda | Média | Não implementar fiscal, assinatura, CMV automático, multilocação ou lançamento DRE paralelo |

**Pare e reporte, sem improvisar**, se: uma regra fiscal/contábil exige inferência não autorizada; dados históricos não permitem identificar evento; uma mudança rompe a capacidade de transporte; a migração toca registros reais; o baseline diverge sem entendimento; a integração ameaça perda de dados; ou a revisão detecta P0/P1.

## 11. Instrução operacional pronta para Codex (quando o proprietário autorizar iniciar código)

> Desenvolva o Silex Business conforme `SILEX_DRE_ESPECIFICACAO_TECNICA.md` e `SILEX_DRE_PLANO_IMPLEMENTACAO.md`, na ordem E0–E7. Antes, confirme que o PR #14 e seu SHA são os esperados e documente a dependência da branch. Não altere `main`, PR #14 ou ambientes externos. Use branch isolada, commits por entrega, migrações aditivas e SQLite fictício. Não crie um segundo livro financeiro, não conte recebimento novamente como receita, não presuma CMV/imposto/DA zero, não reclassifique períodos antigos automaticamente, não gere títulos sem confirmação e não mostre dados especializados a perfis sem autorização. Primeiro implemente consertos de recebíveis e retry OFX, depois contratos/engine, depois UI e fluxo OS. Preserve APIs/26 relatórios/links. Execute testes completos e reporte resultados verificados. Abra Draft PR contra branch de integração adequada ou PR empilhado, mantendo pendência explícita. **Proibidos merge, deploy, acesso ao Railway e manipulação de produção até autorização específica.**

## 12. O que exige participação humana (sem bloquear o esqueleto do desenvolvimento)

1. **Contador ou responsável técnico-financeiro:** validar quando a venda de serviços deve ser reconhecida, incorrência de custos, tratamento de adiantamentos, tributos sobre vendas/lucro, descontos, CMV/DA quando aplicáveis; registrar decisões com exemplos.
2. **Proprietário:** aprovar políticas econômicas específicas quando uma operação fugir dos cinco princípios já aprovados; confirmar a ordem de integração com PR #14; revisar UX de Início/Plano financeiro e o comportamento da OS no laboratório.
3. **Usuário de homologação:** testar o fluxo real com dados **sintéticos**, sem interferência no trabalho da transportadora; avaliar se a confirmação contextual é mais simples que o fluxo antigo.
4. **Operação (somente depois de nova autorização):** backup consistente SQLite+anexos, restauração testada, estudo da migração do schema real e publicação supervisionada. Isso **não faz parte da execução deste plano**.

## 13. Checklist de saída

- [ ] Cinco decisões aprovadas refletidas em testes de comportamento.
- [ ] Início e Visão geral consolidados, com aliases compatíveis.
- [ ] Visão financeira permanece especializada e usa recebíveis corretos.
- [ ] Categorias/subcategorias em Plano financeiro sem migração destrutiva.
- [ ] DRE nos relatórios, sem novo cadastro de lançamentos.
- [ ] Venda, OS e OFX reconciliados sem dupla contagem.
- [ ] Custos/impostos/DA ausentes reconhecidos como desconhecidos, não zero.
- [ ] Histórico versionado e reclassificação retroativa supervisionada.
- [ ] OS oferece geração contextual de títulos com confirmação e idempotência.
- [ ] Permissões e transportes protegidos em agregados, detalhes e exportações.
- [ ] 26 relatórios anteriores e URLs preservados.
- [ ] Migrações sintéticas, testes completos e revisão independente documentados.
- [ ] Draft PR criado/atualizado **sem merge nem deploy**.
