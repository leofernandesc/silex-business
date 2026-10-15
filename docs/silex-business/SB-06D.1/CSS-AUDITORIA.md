# P07 — Auditoria da cascata e plano SB-06D.2

Auditoria somente. **Nenhum CSS foi alterado no SB-06D.1.** `css-audit.json` registra seletores, linhas, contextos de media, declarações, referências de tokens e importações, usando o PostCSS já instalado pelo Vite. Não foi instalada dependência.

## Estrutura atual

| Arquivo | Linhas | Responsabilidade / dependência |
| --- | ---: | --- |
| styles/tokens.css | 108 | Fontes locais e tokens, importado antes de styles.css em main.tsx |
| styles.css | 2710 | Base, shell, formulários, tabelas, Modal e camadas históricas de identidade/a11y |
| ledger.css | 347 | Escopo Lançamentos; resumos, datas e tabelas, V02 |
| accounts.css | 258 | Pagar/Receber; foco P02, resumos, responsividade |
| reconciliation.css | 200 | Conciliação; tabelas/estados |
| financialDashboard.css | 303 | Indicadores, gráfico e tabelas do Dashboard |
| home/home.css | 237 | Home autenticada, importação pelo componente |
| public/public.css | 660 | Público, carregamento próprio; não presumir mesma ordem de chunks lazy |

999 regras; 40 blocos media; 76 grupos de seletor/contexto repetidos no mesmo arquivo, **nenhum com todas as declarações equivalentes**. 1074 declarações têm literal px/cor (inclui valores necessários, não 1074 defeitos). 24 regras em contexto print merecem revisão própria. 72 custom properties encontradas; 11 sem referência `var()` nos CSS auditados. Essa ausência não prova obsolescência: API de tokens e usos dinâmicos/futuros precisam de análise.

## Achados confirmados e classificação

| Grupo | Evidência | Proposta / arquivos | Benefício / risco / validação |
| --- | --- | --- | --- |
| A — limpeza segura | Não foi demonstrada duplicação integral removível automaticamente; comentários históricos documentam incrementos | Primeiro inventariar comentários e apenas remover os comprovadamente incorretos, mediante diff separado | Benefício pequeno; checar bytes efetivos das regras e build. Nenhuma remoção feita |
| B — refatoração moderada | `.silex-public__nav` aparece em linhas 58/644 e 561/651 sob breakpoint 700; declarações diferentes | Agrupar base/estado móvel mantendo ordem efetiva em public.css, em lote próprio | Navegação pública/foco/menu; imagens 1440/768/375/320, estados aberto/fechado e suíte pública T01 |
| B — refatoração moderada | Financeiro utiliza arquivos locais e tokens, mas ainda há literais e breakpoints específicos | Inventariar valores equivalentes por componente antes de trocar por tokens em ledger/accounts/reconciliation/financialDashboard | Menos divergência; literal não é automaticamente token. Regressões P02/P06/V02, dinheiro elevado, tabelas e texto 200% |
| C — risco elevado | `:root` em styles.css linhas 1/2049/2195; body 42/2059/2201; primary 72/2060/2212 | Consolidar somente após matriz de estilos computados por propriedade e ordem; preservar tokens antes de base | Cascata muda todas as telas, login e páginas lazy; exigir 26 telas × três larguras e estados |
| C — risco elevado | Foco global tem camadas em 104/2223 e reforços a11y finais sob screen; bordas de input também | Extrair por família com mesma ordem e especificidade; nunca remover override só porque seletor repete | Preservar P01/P02/P03/P04/P09, contraste e estados hover/focus/disabled |
| C — risco elevado | Shell/menus, grids, tabelas e Modal compartilham styles.css; breakpoints históricos sobrepostos | Lotes separados shell, formulários, tabelas, Modal; cada lote com contrato visual antes/depois | R02/retorno de foco/scroll podem regredir. Nenhuma refatoração arquitetural neste incremento |
| C — risco elevado | 24 regras print; `@media screen` do SB-06C deliberadamente não altera impressão | Manter camada print independente e ordem no bundle; auditar print media/PDF em lote autorizado | Não combinar print com limpeza de tela; preservar recibos, colunas, nomes empresariais e datas |

Seletores repetidos não comprovam conflito: os casos acima são dependências de ordem confirmadas e riscos de consolidação. Nenhuma regra foi declarada obsoleta apenas por não aparecer nas capturas iniciais. Classes geradas (`state-*`, badges, tons, rotas e diálogos) impedem limpeza por simples busca de string.

## Plano proposto — não iniciado

1. **D.2a, inventário executável:** capturar estilos computados dos componentes e estados, registrar ordem real de CSS com/sem navegação lazy, sem mover regras. Dependência: aprovação SB-06D.1. Aceite: matriz reproduzível e backup.
2. **D.2b, um componente piloto:** escolher família isolada após comparação (preferência regras de apresentação de um único componente financeiro). Agrupar regras conservando ordem, media e especificidade; sem trocar todos os literais. Aceite: mesmos estilos computados e screenshots, mesmos handlers/colunas/consultas.
3. **D.2c, migração controlada de tokens:** substituir somente valores semanticamente equivalentes; não reutilizar cor decorativa em borda funcional. Aceite: contraste P04, alvos P09 e focos medidos, texto 200%, sem novo overflow.
4. **D.2d, cascata global/print:** requer autorização específica e lote pequeno. Separar shell, formulários, tabelas e impressão; preservar a ordem da folha de entrada. Não usar `@layer`, CSS modules ou mudanças na arquitetura sem avaliação própria.

Cada lote: branch a partir do aprovado, commit pequeno, SHA-256 e backup anterior; restaurar arquivos originais e remover adições em diretório temporário; TypeScript/build/frontend/backend/E2E/a11y e comparação visual antes de aprovação. Rollback por commit corretivo ou restauração revisada dos arquivos do lote; sem reset destrutivo, sem alteração de histórico, sem push/deploy automático.

P07 permanece **pendente, com plano proposto**. Ganho de manutenção ainda não é uma correção implementada.
