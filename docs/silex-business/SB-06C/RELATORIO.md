# Silex Business — SB-06C

Entrega de contraste e dimensões de controles para revisão. Somente SB-06C; sem SB-06D, push, merge ou deploy.

## Implementação

Produção limitada a **dois CSS**: `frontend/src/styles.css` e `frontend/src/styles/tokens.css`. Todos os bytes anteriores de styles.css foram preservados; correções aditivas sob media screen, delimitadas ao ERP/login. Não há mudança em React, handlers, formulários, rotas ou negócio.

- Texto secundário legado, ajuda, metadata, cabeçalhos e vazios usam os tokens legíveis existentes.
- Badges conservam textos, estados e distinções de sucesso, erro, alerta e roxo; nova variante roxa acessível para labels pequenos.
- Bordas relevantes de campos/buscas usam o token de controle, mantendo bordas decorativas claras. Placeholders ganham cor explícita/opacidade integral.
- PDV conserva catálogo, preço, estoque e ações; apenas seus textos de apoio e alvos selecionados mudam.
- O parágrafo no banner da Visão Geral fica branco, evitando perda de contraste na região clareada pelo ícone decorativo. Nenhuma ação ou conteúdo muda.
- Ações de linha, paginação e fechar diálogo: mínimo 36 px desktop/44 px móvel. Menu móvel e ações principais recebem ajustes delimitados de 44 px. Não se impõe essa dimensão a todos os controles densos.

Paleta institucional, Inter local, ativos SVG, semântica financeira, colunas e densidade operacional preservados. Não há nova biblioteca nem refatoração geral de CSS.

## Auditoria e medidas

23 telas operacionais + Início + login + público, 1440/768/375 e layout adicional em 320 px. Coletas de diálogos existentes, hover/foco/seleção e menu aberto complementam os estados iniciais. [Método e decisão](AUDITORIA.md), [matriz de contraste](CONTRASTES.md), [controles](CONTROLES.md).

| Amostra | Antes | Depois |
| --- | --- | --- |
| Texto secundário legado no canvas/branco | 3,71–4,02:1 | ≥4,5:1 nas amostras aplicáveis |
| Nota do login | 2,83:1 | token secundário acessível |
| Limite de campo, mínimo medido | 1,28:1 | 3,16:1 |
| Placeholder, mínimo após composição correta | 3,017:1 | 6,200:1 |
| Parágrafo no banner móvel, estimativa local sobre pixels adjacentes | 4,419:1 | 6,058:1 com branco |

As contagens brutas repetem instâncias/estados: não representam milhares de defeitos únicos. Gradientes/opacidade são separados da aprovação automática; não se exige contraste de bordas puramente decorativas nem de controles inativos. 44 px é meta de conforto para grupos selecionados, não requisito universal AA. A amostra não encontrou colisões de alvos pequenos pelo teste geométrico de 24 px; isso não substitui análise das exceções e labels.

## Validação

Resultados definitivos em `test-results-summary.json` e `test-matrix.json` no pacote: TypeScript/build Vite, 71 testes frontend em cada versão, 69 backend em cada versão, 18 novos E2E, 249 regressões principais e 72 testes de modal aprovados (**339 casos finais, sem falhas, skips ou retries**). Casos de menu/autorizações, P01/P02/P03/P06/P08/V02/R02, fluxos financeiros, público, Início e Visão Geral estão discriminados em [TESTES.md](TESTES.md). Não são usados retries para ocultar falhas.

Seis respostas financeiras são equivalentes entre fixtures idênticas; fonte operacional TypeScript/React, backend, regras e contratos permanecem iguais ao baseline. Capturas públicas preservadas pixel a pixel nas três larguras. O ensaio de restauração recupera todos os 329 arquivos aprovados. [Preservação e recuperação](PRESERVACAO.md).

## Git e entrega

Branch `feat/sb06c-accessibility`, referência `c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f`. Commits de auditoria, correções, testes e relatório são listados com hashes completos em `git-summary.txt`; diff completo em `review.diff`. A lista completa está em `file-inventory.json`. Não foi alterado histórico anterior.

- Galeria: `docs/evidence/sb06c/index.html`.
- ZIP externo: `docs/evidence/sb06c/SB-06C-review.zip`, com SHA-256 próprio e manifesto interno.
- Backup externo verificável e originais efetivamente alterados acompanham o procedimento de recuperação; banco/.git/credenciais/builds/caches ficam fora do pacote.

## Pendências e limites

P04 e P09 podem ser revisadas como corrigidas **nos componentes e estados auditados**, sem conformidade global presumida. Nenhuma ocorrência confirmada no recorte corrigido é mantida aberta por conveniência. Seletores nativos, toque físico, leitor de tela real, estados não alcançados e todos os pixels de gradientes não são homologados globalmente.

P05 continua parcial; P07 permanece pendente; V01 e T01 seguem em acompanhamento. Texto computado a 200% conserva excessos anteriores em alguns conteúdos/filtros, documentados separadamente, sem novo excesso causado pelas correções. Zoom nativo não foi comprovado pelos atalhos do Firefox; viewport reduzida não é apresentada como zoom real. Cabeçalho/R02 mantém sua validação específica.

| Item remanescente | Gravidade / natureza | Situação |
| --- | --- | --- |
| P05 — datas nativas/locale | Baixa | Parcial; não alterar editor ou contratos neste incremento |
| P07 — CSS acumulado | Baixa | Pendente; nenhuma limpeza geral realizada |
| V01 — atalho intermitente histórico | Média / causa não comprovada | Em acompanhamento, 60 novos cliques não encerram a observação |
| T01 — timeout público histórico | Estabilidade de teste; impacto funcional não comprovado | Em acompanhamento; asserções e público preservados |
| Conteúdos com texto a 200% | Média, preexistente e independente do cabeçalho | Visão Geral/filtros/Estoque nas larguras discriminadas; sem correção incidental |
| Zoom nativo, leitor e toque físico | Limitação de homologação, não defeito automaticamente demonstrado | Revisão manual complementar, sem afirmar conformidade completa |

A execução intermediária que reuniu suítes com pré-condições incompatíveis deixou o caixa fechado: dois testes de venda falharam. As mesmas asserções foram reproduzidas no baseline com essa fixture. Os resultados originais foram preservados, e a validação final separa bancos descartáveis para regressão e fluxos de modal; não altera o produto para acomodar os testes.

Revisar galeria, matrizes e limites antes de autorizar outra etapa. Nenhum incremento seguinte foi iniciado.
