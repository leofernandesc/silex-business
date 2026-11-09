# PR #15 — correções da revisão independente

HEAD revisado confirmado, local e remoto: `13c2de557f40029b1008f019236d7551ac11eb03`. Workspace inicialmente limpo. Trabalho exclusivamente em `feat/dre-integrated-financial-ux`, sem mudar a base empilhada do PR #14. Correção principal: `3e0a2af2d125b21a97999684d907956d4bb6b86e`; último código validado localmente: `7e5adb6bd6c94e54088cb9875b06169f43b0ab01` (política legada não confirmada). [Arquivos e justificativas](FILES.tsv), [manifesto](evidence/source-hashes.json), [galeria](evidence/index.html).

## Problemas, reprodução e correção

| Prioridade | Reprodução na base revisada | Correção e prova |
|---|---|---|
| P1 política histórica | Após reconhecimento/classificação/revisão, editar `Category.classification` ou `Subcategory.affects_result` alterava os fatos sem alterar o fingerprint das fontes | Política econômica capturada no mapeamento imutável; reconhecimento vinculado ao fingerprint da política aplicável; atributos do catálogo incluídos no estado da fonte. Edição comum não pode contornar política usada. Testes de alteração, revisão antiga, versões e confirmação obsoleta |
| P1 cancelamento | Pendência `economic_cancellation_review_required` sem endpoint de resolução (404) | Prévia e decisão explícitas, evidência, data, justificativa, autor e idempotência. Reverter integralmente os componentes comprovados ou manter reconhecimento em cancelamento apenas financeiro. Fonte e revisões antigas preservadas; nenhum título/pagamento criado |
| P2 vigência | Substituição parcial recusada (422); só se podia substituir o intervalo inteiro | Recorte supervisionado por referência aditiva; projeção de intervalos sem alterar a linha original. Múltiplos recortes da mesma revisão, partes anteriores/posteriores e replay por versão; cobertura histórica não é invalidada por política futura não aplicável |
| P2 Início | Persistia o código da seção de Visão geral independente. No HEAD confirmado ela já era inalcançável porque o modelo excluía o alias; não foi fabricada evidência de um link visível | Seção e referência removidas; `#dashboard` continua alias. Primeiro indicador e painel de serviços ao lado de vendas/recebíveis, atalhos genéricos priorizados. Operador e fontes de transporte continuam limitados pelos guards existentes |

Reproduções negativas: [guard/vigência](evidence/before-guard-and-split.txt), [fingerprints dos dois atributos](evidence/before-policy-fingerprints.txt), [cancelamento sem procedimento](evidence/before-cancellation.txt). São falhas **esperadas na base antiga**, não falhas ocultadas da candidata. Os probes usam arquivos arquivados do Git e SQLite temporário, sem reescrever branches.

## Política econômica e vigência

`economic_classification`/`economic_affects_result` são capturas do mapeamento DRE, não uma alteração silenciosa do catálogo utilizado pelos relatórios por baixa. Subcategoria explícita prevalece. Para uma subcategoria que herda a regra da categoria, sua incidência cadastral fica protegida quando houver fatos vinculados; subcategorias novas sem vínculos continuam editáveis. Nome, grupo e ativação não são congelados por essa proteção.

O reconhecimento guarda o fingerprint da política mostrada para a data selecionada. Alteração aplicável exige confirmação atualizada; a interface permite atualizar a consulta no mesmo modal. Data e campos continuam editáveis durante a consulta; `Form.submitDisabled`, opcional e falso por padrão, bloqueia somente a confirmação pendente, sem mudar as demais submissões.

A nova referência `replaces_id` permite recortar sem remover a restrição antiga de `supersedes_id` nem reescrever linhas. A leitura subtrai somente o trecho substituído e conserva as partes restantes com seu ID/revisão originais. Sobreposição, referência inválida e revisão concorrente são recusadas. A prévia mostra datas, política e intervalos preservados, vinculando fontes e políticas atuais à confirmação. Uma mudança somente futura não invalida a cobertura nem marca como alterada uma revisão de período cuja política permaneceu igual.

## Ajuste econômico mínimo

Novas operações: `POST /finance/dre/cancellation-review/preview` e `POST /finance/dre/cancellation-review`; contexto de reconhecimento em `GET /finance/dre/recognition-policy`. Mesmos guards administrativos e filtros de identidade/capacidade. Não há concessão de permissão pelo navegador.

O ajuste é uma decisão excepcional sobre fonte existente, **não um cadastro financeiro**. O cliente não envia valor arbitrário: o servidor deriva a reversão integral dos componentes reconhecidos, com sinais opostos, preservando o fato original. No mês seguinte, o original continua no mês original e o ajuste aparece na data econômica comprovada. Em competência já revisada, exige confirmação explícita; o snapshot anterior permanece byte a byte preservado. Cancelamento somente financeiro pode manter o reconhecimento. Estorno bancário isolado não cria cancelamento econômico.

Revisões são acrescentadas, com chave idempotente e controle de concorrência (201/409, uma revisão). Uma fonte ou classificação alterada invalida a resolução corrente; existe caminho de nova prévia/revisão, sem apagar a decisão anterior. É possível reproduzir a versão anterior com `mapping_version`, `decision_version` e `cancellation_version`. Detalhes, CSV, reconciliação, snapshots e versões de cancelamento não expõem fontes especializadas a identidades sem acesso; revogação é revalidada.

A reversão implementada é integral, por componente original; não inventa um rateio de cancelamento parcial, tributos, CMV ou reconhecimento por etapas. Esses casos continuam sujeitos a política/evidência específicas, conforme a especificação aprovada, sem apresentar lucro definitivo indevido.

## Migração 0017 e dados anteriores

Migração aditiva, após 0016: campos anuláveis de captura/vínculo de política, referência de recorte e tabela de revisões de cancelamento. Não há backfill de natureza econômica, alteração de valores financeiros ou reescrita das migrações publicadas.

**Compatibilidade explícita:** políticas DRE anteriores que não guardavam os atributos necessários ficam pendentes de confirmação supervisionada; sua classificação passada não pode ser inferida. Snapshots históricos continuam preservados e consultáveis conforme a autorização. Não prometer replay ad hoc de uma política antiga que nunca foi registrada; o snapshot é a evidência congelada disponível. Antes de futura publicação, inventariar esses registros e confirmar a política, se existirem. A incidência ausente é apresentada como **“Incidência não confirmada”**, nunca como “Não incide”; a confirmação fica desabilitada até revisão válida. Um teste backend usa uma linha legada real com capturas NULL e prova resposta 409; o E2E injeta esse contexto controlado e prova indicação, bloqueio e recuperação pelo mesmo modal.

Testes verificam 0016→0017 com registros/documento histórico sintéticos, todas as colunas anteriores iguais, integridade/FKs, interrupção com rollback e retry. As regressões anteriores também percorrem 0012/0013→head. O ensaio de três processos comprovou reinício e restauração com anexo, [recibo](evidence/restart.json). Nenhum bundle, banco ou credencial foi incluído.

## Testes e resultados observados

| Execução local | Resultado |
|---|---|
| Backend completo, checkpoint anterior aos últimos refinamentos de fingerprint/guard | 338 PASS, zero falhas/ignorados; [log](evidence/backend-checkpoint.txt) |
| Backend dirigido após ajuste de política legada | 33 PASS (19 casos novos + 14 de API DRE); [log](evidence/backend-directed-legacy.txt) |
| Frontend completo | 243 PASS, 22 arquivos; [log](evidence/frontend-legacy.txt) |
| TypeScript + Vite | PASS; [log](evidence/build-legacy.txt) |
| Chromium dirigido | 12/12 PASS, desktop/celular, sem skips/retries; [log](evidence/chromium-directed-legacy.txt) |
| Firefox dirigido | 12/12 PASS, desktop/celular, sem skips/retries; [log](evidence/firefox-directed-legacy.txt) |
| Comparação direta com `13c2de557f40029b1008f019236d7551ac11eb03` | 26 relatórios, 124 saídas iguais, zero divergências; [dados](legacy-comparison.json) |

A primeira rodada de navegador teve 8 aprovações/4 falhas em cada motor: quantidade indevida na fixture de frete e locator do texto anterior ao estado de processamento. As fixtures foram corrigidas conforme o contrato; a asserção continua exigindo botão desabilitado, uma única mutação, erro recuperável e financeiro inalterado. Um comando Firefox foi iniciado no diretório errado e não executou testes; foi refeito a partir de `frontend/`. [Contadores separados](evidence/browser-runs.json). Não somar reexecuções como cenários novos.

Os logs dirigidos anteriores (32 backend/12 por motor) foram preservados como checkpoints, sem somar reexecuções. O CI do HEAD intermediário `45e5410` executou 338 testes backend com sucesso, mas não comprova o novo ajuste; o total esperado passou a 339 após a nova regressão. Capturas/PDF representam os fluxos visuais já testados na correção principal; o novo teste de política legada possui log próprio.

A matriz integral contém **330 casos por navegador**, confirmados por `--list` (isso não é aprovação de execução). **A execução integral final será a do CI no HEAD exato do PR**, depois do commit deste relatório, incluindo backend completo, frontend/build, 330 casos por motor, complementos de 30 financeiro/fusos + 8 transporte + 35 datas/foco, comparação das 124 saídas e reinício/restauração. SHA final, run e resultados efetivamente observados serão registrados na descrição do PR para evitar um ciclo de commits apenas do próprio SHA. Não antecipar aprovação desses checks.

Comandos:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py --base 13c2de557f40029b1008f019236d7551ac11eb03 --output specs/dre-integration/review-fixes/legacy-comparison.json
SILEX_DRE_RESTART_OUTPUT=/tmp/review-restart.json PYTHONPATH=backend .venv/bin/python scripts/check_dre_restart.py
cd frontend
PLAYWRIGHT_BROWSERS_PATH=/tmp/silex-commercial-browsers npx --no-install playwright test --config playwright.integration.config.ts
# Para Firefox, adicionar SILEX_INTEGRATION_BROWSER=firefox; usar outra porta se simultâneo.
```

Python local 3.12.3, Node 26.8.1; CI Python 3.12/Node 22, dependências fixadas e browsers correspondentes. Chromium 156/Firefox 157 foram executados de fato. O teste responsivo completo existente cobre 1440/1024/768/375/320 px; os novos casos dirigidos cobrem 1440/375. Axe examinou o modal de ajuste. Não declarar WCAG completa, leitor de tela real ou impressão física. O aviso de depreciação TestClient/httpx continua registrado; não se ignoraram testes nem se mudaram dependências.

## Parecer e limites de publicação

A candidata só será apresentada para homologação isolada após os checks integrais do HEAD final passarem. A captura histórica agora tem caminho supervisionado; a DRE continua gerencial e pode ser parcial por falta legítima de evidência, nunca por zero inventado. Validação técnico-financeira humana e classificação dos registros legados permanecem necessárias.

Sem merge, deploy, Railway, dados reais, migração persistente, multitenancy, assinaturas, integração de pagamento ou provisionamento real. Preservar [PUBLICATION.md](../../financial-stage1/PUBLICATION.md): backup verificável de SQLite/anexos e restauração ensaiada; inventário de identidades; migrações supervisionadas 0013–0017 conforme esquema confirmado; nenhuma transferência automática de propriedade; provisionamento somente autorizado; regressão posterior. Aprovação técnica não autoriza produção.
