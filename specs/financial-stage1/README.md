# Evolução Financeira Empresarial — Etapa 1

> Revisão dirigida após auditoria independente: [REVIEW-DATES.md](REVIEW-DATES.md), a partir de cff5f2e. Os resultados e evidências abaixo registram a entrega original; o documento da revisão contém a validação atual. `CHECKSUMS.sha256` é histórico da árvore cff5f2e e permanece intacto; o manifesto atual é `REVIEW-CHECKSUMS.sha256`.

Base: `main/origin/main` **7214ad2543e0e980366a386b27cc7bbb39eddb32**. Branch independente: `feat/finance-enterprise-stage1`. Trabalho em worktree própria, preservando `fix/forms-usability-system-review` (6c873d0) e PR #11 (ed51939). Não houve merge dessas linhas. Nenhum acesso ao SQLite persistente/Railway, provisionamento de contas reais ou deploy.

Risco **moderado** para apresentação/filtros financeiros e alteração aditiva de leitura da API, com atenção à navegação autenticada. Não altera cálculo, persistência, autorização, pagamentos ou schema. A implementação não contém motor DRE.

## Diagnóstico e resultado

| Antes | Depois |
|---|---|
| Indicadores atuais sem acesso direto ao conjunto correspondente | Atalhos filtrados para entradas/saídas realizadas, títulos pendentes, vencidos e próximos vencimentos |
| `status=open` exclui parciais, enquanto saldo pendente os inclui | Alias aditivo `pending` une open/partial, preservando os filtros antigos |
| Datas de edição poderiam ser confundidas com período aplicado | Período aplicado e alterações ainda não aplicadas indicados separadamente |
| Vencimento chamado “Lançamento”; registro da quitação chamado “Baixa” | Rótulos “Vencimento” e “Quitação integral (registro)”, sem redefinir filtros ou timestamps |
| Navegação normaliza URL e perde parâmetros | Somente parâmetros financeiros permitidos e validados são preservados em URLs autenticadas/recarregamento |
| Dados de uma chave anterior poderiam sobreviver durante transição de consulta | Snapshot financeiro local por chave e revisão; limpa dados imediatamente, aborta consulta anterior e ignora sua resposta tardia |
| Títulos/livro caixa apresentavam zeros de fallback em consultas indisponíveis | Indicadores e contagens indisponíveis como `—`; erro não é resultado vazio. Zeros reais continuam válidos |
| Ausência de contas somada como saldo zero | “Saldo não informado” quando não há contas; conta cadastrada de saldo zero continua R$ 0,00 |

O saldo continua sendo **saldo registrado no ERP** (saldo inicial + todo o histórico), sem alegar confirmação externa do banco. Títulos atuais e próximos vencimentos independem do período realizado. “Próximos 7 dias” preserva a regra existente, hoje até hoje + 7 inclusive: são oito datas civis possíveis. O novo `summary.as_of_date` vem da mesma data de referência do cálculo backend, evitando links deslocados pelo calendário do navegador. Datas ISO, pagamentos parciais, estornos e centavos permanecem intactos.

O gráfico mantém 12 meses completos até o mês final, independentemente da data inicial. Resultado por grupo continua sendo **realizado pela competência das baixas**, com exclusões existentes; não é DRE integral por competência. O atalho de caixa usa `posting_date`; quitação integral dos títulos não é sinônimo dessa data.

URLs preservam período, base temporal, direção e situação, sem transportar autorização. Demais filtros do cadastro continuam no estado da tela e nos mecanismos existentes de consulta/exportação. O backend continua validando perfil e requisição. O novo hook fica restrito às três superfícies financeiras; `useLoad`, `api.ts` e autenticação não foram reescritos. Não há cache nem repetição automática.

## Arquivos e integração

| Grupo | Arquivos | Justificativa |
|---|---|---|
| Dashboard | `frontend/src/financialOverview.tsx`, `financialData.ts`, `useFinancialSnapshot.ts`, `financialDashboard.css` | Extração do componente, consultas existentes, indicadores, estados e links com estilos locais de tela |
| Compatibilidade | `frontend/src/financePlanning.tsx` | Reexporta FinanceOverview no caminho existente; funções de relatórios/OFX intactas; import CSS na posição histórica |
| Filtros | `financialNavigation.ts`, `finance.tsx`, `ledger.tsx`, `navigation/useAppNavigation.ts` | Parâmetros permitidos, período aplicado, rótulos e dados somente da chave atual |
| Leitura backend | `backend/app/api.py` | Apenas alias pending e metadado as_of_date, sem alterar os quatro totais existentes |
| Testes | `test_financial_stage1.py`, `test_dre_specification.py`, ajuste de duas expectativas em `test_finance_expansion.py`, testes TS e `financial-stage1.spec.ts` | Reconciliação centavo a centavo, aritmética proposta, metadado aditivo, navegação, estados e layout |
| Instrumentos | `scripts/check_financial_stage1.py`, `scripts/compare_financial_stage1.py`, `playwright.financial-stage1.config.ts` | Bancos descartáveis, credenciais aleatórias em arquivo temporário 0600, comparação com a base |
| Especificação | Esta pasta | DRE proposta, próximas etapas, integração e condições de publicação |

[INTEGRATION.md](INTEGRATION.md) foi preparado antes das alterações de produção e mapeia os arquivos compartilhados com PR #11/formulários. A extração reduz sobreposição futura em financePlanning, mas não elimina a necessidade de revisar os hunks e preservar os guards de transporte em integração autorizada. **Não há migração nesta etapa** e a 0013 não foi incorporada.

A main pública não rastreia mais `docs/`; a política atual ignora documentação interna histórica. Por isso os documentos novos desta entrega são autoria própria em `specs/financial-stage1/`, sem forçar a republicação dos relatórios antigos. Os cinco documentos locais de referência foram lidos; serviram a requisitos observáveis e planejamento, não a código, identidade, capturas ou fórmulas financeiras presumidas.

## Validação observada

Ambiente local isolado, dependências exatas do lockfile/requirements, SQLite descartável, fixture sem seed-demo. Chromium/Brave 157 via Playwright, locale en-US, fuso America/Manaus. Não houve instalação de dependências de produto nem mudança de lockfiles.

| Execução / comando na raiz da worktree (salvo indicação) | Resultado |
|---|---|
| `cd frontend && npm test` | **158 testes**, 16 arquivos, aprovados na versão final. Execuções anteriores: 156 e 157, antes de concluir os testes de linha financeira inválida e limites vazios da URL do Dashboard; não somar como casos distintos |
| `cd frontend && npm run build` | TypeScript + Vite aprovados; assets de build não versionados |
| `PYTHONPATH=backend .venv/bin/python -m pytest -q backend/tests` | Coleta de 156 casos: **147 aprovados / 9 falhas preexistentes**, antes de criar os seis exemplos DRE. Não declarar suíte backend integralmente aprovada |
| `PYTHONPATH=backend .venv/bin/python -m pytest -q backend/tests/test_financial_stage1.py backend/tests/test_dre_specification.py backend/tests/test_finance_expansion.py::test_finance_filter_summary_uses_full_result_and_seven_day_boundary backend/tests/test_finance_expansion.py::test_dashboard_all_reports_budgets_and_export` | **11 aprovados**: nove novos casos e duas regressões. Inclui novamente testes já contados na suíte geral; não são 11 casos adicionais à suíte |
| `.venv/bin/python scripts/check_financial_stage1.py` | Primeira coleta: **20/20**, dez cenários × desktop/mobile |
| `.venv/bin/python scripts/check_financial_stage1.py --grep 'keyboard shortcut'` | **2/2**, um cenário adicional × dois projetos. Exercita foco, alvo ≥36px, tabela alternativa, 768px e texto computado a 200% em 375px |
| `.venv/bin/python scripts/check_financial_stage1.py --grep 'integer-cent\|genuine zero\|keyboard shortcut'` | Regressão dirigida depois da validação de linhas/respostas; seis reexecuções dos cenários existentes, não seis casos novos |
| `.venv/bin/python scripts/compare_financial_stage1.py --output specs/financial-stage1/evidence/financial-comparison.json` | **124 comparações**, sem divergências na coleta final: 68 JSON e 56 CSV byte a byte; dois snapshots, antes/depois de estornos |
| `git diff --check` | Sem erros |

Total de cenários distintos de navegador: **11 × dois projetos = 22**. Houve coleta/reexecução dirigida conforme novos testes/validações; não alegar que todas as execuções são casos independentes. Nenhuma retry automática habilitada. A suíte geral backend e os exemplos posteriores cobrem 162 casos distintos, dos quais 153 passaram e nove falharam na base e na candidata; execuções dirigidas se sobrepõem a esses casos.

### Falhas preexistentes, sem mascaramento

As nove falhas foram reproduzidas em uma extração descartável do commit 7214ad2 com as mesmas dependências. Todas produzem `TypeError: 'service_details' is an invalid keyword argument for Supplier`, já presente no cadastro genérico da base. Nós de teste: `test_catalog_edits_deactivation_and_history`; cinco parâmetros de `test_pix_formats_are_normalized_and_do_not_create_payments`; dois de `test_partner_in_payables_preserves_history_and_pix_does_not_send_money`; `test_service_order_costs_titles_actual_result_idempotency_and_cancel`. A validação de base foi direcionada a esses nove, não uma segunda suíte completa.

Não corrigidos aqui: mudança pertence aos trabalhos independentes e ampliaria o escopo. O Draft PR deve explicitar essa limitação; aprovação desta etapa não equivale a liberar a main para uso comercial.

### Comparação financeira e integridade

Os dois probes criam oito títulos com centavos, baixas parciais com juros/multa/desconto, então estornos. Comparados: Dashboard, saldos por conta, títulos e filtros antigos, livro caixa, catálogo e **26 formatos de relatórios**, além dos 28 CSVs relacionados em cada snapshot. Os quatro totais antigos de summary são comparados; somente o metadado aditivo as_of_date é omitido na comparação retrocompatível. JSON desconsidera apenas timestamps voláteis de registro/evento; datas civis, IDs, valores, status, grupos e request keys são preservados.

Na primeira coleta, 14 hashes CSV diferiam porque fixtures independentes tinham timestamps de registro diferentes em campos técnicos exportados. O registro [inicial](evidence/comparison-initial-timestamp-drift.json) foi preservado. O instrumento passou a fixar os timestamps **nos bancos sintéticos de ambos os probes**, produzindo dados equivalentes, sem alterar CSV ou código de produto. A [nova coleta](evidence/financial-comparison.json) compara os bytes completos dos CSVs, sem normalização de conteúdo de CSV.

O mesmo instrumento confere hashes dos arquivos protegidos, incluindo fórmulas backend, modelos, schemas, estilos globais, helpers monetários/datas, UI, API de sessão e dependências. As funções FinanceReports e OFX permanecem byte a byte iguais na fonte. Não foi repetida a matriz visual completa de impressão: os respectivos componentes, cálculos e CSS de impressão estão preservados.

### Experiência e acessibilidade

Casos: sucesso em centavos; pendente inclui parcial; vencido e janela inclusiva; link realizado por data correta; recarregamento com filtros; rascunho versus aplicado; campo vazio; HTTP 500/503, rede, JSON inválido e objeto inválido; recuperação; resposta antiga ignorada; zero confirmado e ausência de conta; falha independente de próximos vencimentos; falhas em títulos/livro caixa; operador bloqueado; teclado, tabela alternativa e reflow. Novos links têm nomes explícitos, foco visível e alvo mínimo de 36px.

[Galeria](evidence/index.html): quatro capturas reais, apenas fixture fictícia, em 1440/375px. Medições adicionais a 768px e com texto computado 200%. Não foi executado Firefox compatível com Playwright nesta worktree, zoom nativo, leitor de tela real, avaliação humana de DRE ou dispositivo físico. Não declarar homologação dessas modalidades nem conformidade WCAG global.

## Condições obrigatórias antes de publicação com PR #11 / 0013

1. Backup verificável do SQLite persistente da Railway **e anexos**, com restauração ensaiada em ambiente descartável.
2. Inventário das identidades e dos registros especializados associados à antiga Demo, sem transferência automática.
3. Aplicação supervisionada da migração 0013 com conferência de preservação dos dados existentes.
4. Provisionamento de sammya somente com ambiente e identidade confirmados e autorização específica.
5. Testes separados de Demo/Sammya, incluindo restrições das APIs de transporte.
6. Validação financeira e dos registros históricos após atualização.
7. Nenhum downgrade, alteração persistente, merge ou deploy sem autorização explícita.

Essas condições também constam integralmente no [checklist de publicação](PUBLICATION.md). **Não foram executadas neste desenvolvimento e não estão autorizadas por este prompt.**

## DRE, próximas etapas e riscos

- [DRE.md](DRE.md): fórmulas propostas, classificação, regime, encargos, parcelas, estornos/cancelamentos, limites dos dados e exemplos executáveis com centavos. Resultado líquido, EBITDA e margens dependentes de critérios ainda não aprovados **não foram implementados**.
- [NEXT-STAGES.md](NEXT-STAGES.md): centros de custos opcionais, orçamento anual, projeção de caixa e painel/PDF. Apenas arquitetura/dependências/migrações futuras, sem novos módulos.
- [PUBLICATION.md](PUBLICATION.md): sete condições obrigatórias de backup/restauração, identidades, 0013, provisionamento Sammya, isolamento Demo/Sammya, histórico financeiro e autorização. Todas continuam pendentes para uma publicação que inclua PR #11.

| Risco | Gravidade / tratamento |
|---|---|
| Falha preexistente no cadastro de fornecedores da base | Alto para esse fluxo; comprovada antes/depois, fora do escopo. Revisar a correção independente antes de integrar trabalhos relacionados |
| Hunks compartilhados com PR #11/formulários | Médio de integração; estratégia documentada, sem merge automático, revalidar guards e estados |
| DRE sem reconhecimento/classificação completa | Alto se apresentada como completa; evitado mantendo especificação sem motor ou indicadores enganosos |
| Saldo interno confundido com confirmação bancária | Médio de interpretação; rótulo e origem explicitados, sem alegar conciliação externa |
| Browser/assistividade/homologação humana não cobertos | Limitação de validação, explicitada; roteiro futuro sem inventar resultados |

**Nenhum merge ou deploy está autorizado.** Nenhum banco persistente foi lido/modificado, nem conta Sammya provisionada. P05 parcial, P07 controlada e V01/T01 em acompanhamento permanecem nos estados anteriores. Aprovar a revisão desta etapa antes de escolher a próxima implementação.
