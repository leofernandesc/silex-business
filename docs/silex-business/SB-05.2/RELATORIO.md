# Silex Business — SB-05.2

## Entrega para revisão

Escopo exclusivo Contas a Pagar e Receber. Identidade/tipografia/indicadores/filtros/tabelas/diálogos refinados, mantendo todas as colunas e operações existentes. Sem implementação de incremento posterior.

### Pendências

- **P02 corrigida e validada** nos dois módulos e três larguras: Tab/contorno 2 px/offset 3 px, busca/Enter e filtros preservados.
- **P05 parcial:** conferência dd/mm/aaaa nos quatro campos de cada fluxo, sem trocar inputs type=date/ISO. Listagem/histórico já usam formato brasileiro; editor nativo e impressão permanecem limitados. Padronização completa exige aprovação separada.
- **P06 corrigida em Pagar:** Nova despesa secundária/neutra; Nova receita primária; Cancelar/Estornar e confirmações originais intactos. Ledger SB-05.1 preservada; demais módulos ainda fora desta revisão.
- P01/P04/P07/P09 continuam documentadas. Zero novas falhas de contraste textual no recorte comparável; contrastes legados não declarados resolvidos.

## Git

Baseline aprovado confirmado `5e745062d2f015faecc1ad48e8a657e8f9d63f2b`, com os seis commits do SB-05.1. Repositório íntegro, branch feat/sb05-financeiro inicialmente limpa, main no baseline raiz 61c744f. Commits desta etapa por preparação/apresentação/foco/alinhamento/largura/testes/documentação, com staged revisado antes de cada commit. [Hashes/commits](../../evidence/sb05-2/COMMITS.md), [estado final](../../evidence/sb05-2/git-state.json), [diff](../../evidence/sb05-2/changes.diff), [stat](../../evidence/sb05-2/git-diff-stat.txt), [arquivos completos](../../evidence/sb05-2/files-changed.json).

## Arquivos e arquitetura

Preexistentes modificados: frontend/src/finance.tsx e docs/silex-business/PENDENCIAS.md. Novo CSS accounts.css e novos testes financePresentation.test.ts/accounts-interface.spec.ts; documentos próprios SB-05.2 e scripts próprios de validação/evidências. Fonte antiga finance.tsx: 15 adições/14 remoções; lógica não extraída.

Reutiliza LedgerDateField/LedgerTable sem modificá-los. CSS restrito a media screen/.silex-accounts; sem sobrescrita global ou biblioteca nova. Dois fluxos preservam sua direção, cliente/beneficiário/PIX e vínculos com venda. Não há edição ou exclusão direta no código: capturas mostram cadastro/baixa/histórico existentes. [Arquitetura](ARQUITETURA.md), [auditoria funcional](AUDITORIA.md).

## Testes e preservação

65 frontend, 69 backend, TypeScript/Vite e 45 novos E2E das duas telas, mais 132 regressões de app/Lançamentos/público/Home/navegação (177 na rodada final) e 18 verificações adicionais de foco/ampliação. [Resultados finais e contagens E2E](../../evidence/sb05-2/tests-summary.json), [matriz](../../evidence/sb05-2/test-matrix.json), [cenários/tentativas/limites](TESTES.md).

37 respostas equivalentes, incluindo filtros/estados/CSV/print/autorização; 291 chamadas/56 handlers/78 atributos nativos e dois arrays de cabeçalhos preservados. Fontes financeiras/estado/presets/condições de ações/cálculos/API não alterados. Apenas testes operam dados de demonstração em /tmp; dois guards históricos adaptados somente nas cópias de testes, com diffs explícitos; clique de navegação original mantido.

Dos 2.001 arquivos anteriores, 1.999 permanecem iguais; os dois autorizados são finance.tsx e PENDENCIAS. Backend/banco/contratos/auth/permissões/rotas/menu/outros módulos/regras/templates/build/identidade/público/Home/Ledger e evidências antigas preservados. Backup de 66 originais conferido e reversão ensaiada em /tmp, removendo os três novos frontend. [Manifesto](../../evidence/sb05-2/preservation-test.json), [procedimento de reversão](PRESERVACAO.md).

## Revisão visual e pacote

- [Galeria antes/depois](../../evidence/sb05-2/galeria.html): 1440/768/375, busca com foco, cadastro, baixa, histórico, parcial e última coluna; sete telas de regressão.
- [ZIP de revisão enxuto](../../evidence/sb05-2/SB-05.2-review.zip): fontes/diffs/commits, relatórios, capturas finais, testes, hashes e dois originais necessários para reversão. Sem .git, bancos, builds, dados reais ou traces completos. Logs/traces antigos continuam locais.
- [Prévia local fictícia](http://127.0.0.1:18037/app#finance-payable), [reprodução e contas demo](REPRODUCAO.md).

## Limitações e próxima decisão

Receber mantém filtros de fornecedores; rótulo Período por Lançamento corresponde ao vencimento due; formulário compartilhado de recebimento conserva palavras pagamento/quitação. São comportamentos anteriores, não corrigidos incidentalmente. Uma falha intermitente no atalho do Dashboard foi registrada e investigada; origem não comprovada, sem alteração de navegação. A rodada final e as repetições estão documentadas. Edição de títulos não existe. Leitor de tela real/dispositivos físicos e P01/P04/P07/P09 pendentes.

Aprovar esta entrega antes de discutir novos módulos, editor uniforme de datas ou correções funcionais. Nenhum push, merge, deploy, SB-06 ou outro subincremento iniciado.
