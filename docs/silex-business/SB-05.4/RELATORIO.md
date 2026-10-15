# SB-05.4 — Correção direcionada da pendência V02

Data: 14/10/2026. Branch: `feat/sb05-financeiro`.

Baseline aprovado: `86192c26797056f90828a0d957e1ebf950d5bebc`.
Commit da correção de código e teste: `50ef1ac4aac15da7f28b0ea6816743fb84fd0042` (`fix: prevent financial ledger summary overflow on mobile`).

## Resultado

V02 foi corrigida na apresentação dos indicadores de Lançamentos. Em viewport móvel, a grade passa a uma coluna e os valores monetários permanecem em uma linha, com centavos e sinais completos. A alteração está limitada a `frontend/src/ledger.css`; `SummaryCard`, o Dashboard Financeiro e os estilos globais não foram modificados.

A regra responsiva ativa até 650 px. A fonte usa `clamp(0.85rem, 5vw, 1.5rem)` nessa largura e preserva `white-space: nowrap`, `overflow-wrap: normal` e `word-break: normal`. No teste sintético, a fonte calculada foi 18,75 px em 375 px e 16 px em 320 px; com a raiz tipográfica ampliada a 200%, chegou a 27,19 px, sem corte ou transbordamento do cartão.

## Evidência visual

Os cartões foram testados com valores fictícios controlados na resposta do navegador, sem gravar dados ou alterar a API:

- Entrada: `R$ 1.234.567,89`.
- Saída: `R$ 2.469.135,78`.
- Saldo: `-R$ 1.234.567,89`.
- Quantidade: `987654`.

Em 375 px, o documento passou de 401 px para 375 px; as quatro métricas cabem nos cartões. Em 1440 px, a grade conserva quatro colunas. Em 768 px, conserva duas. Em 320 px, os cartões ficam em coluna e os valores estão completos; resta um excesso de 5 px no cabeçalho global (`.topbar-right`, de x=258 a x=325), registrado separadamente em R02. A largura interna da tela Lançamentos é 296/296 px nessa resolução.

A ampliação de texto foi simulada aumentando a raiz para 200%; os valores continuaram inteiros em 375 px. O Firefox headless não expôs o zoom nativo: `Ctrl+Equal` não mudou `innerWidth` nem `devicePixelRatio`. Para verificar reflow, também foi usada viewport de 187 px CSS. O grupo de indicadores continua sem rolagem horizontal; o documento mede 252 px por causa do cabeçalho global. A tela Lançamentos tem um excesso local remanescente de 4 px em conteúdo fora dos indicadores (`scrollWidth` 167, largura 163); antes, os cartões elevavam esse valor a 295 px. R02 continua aberta; nenhum ajuste global foi feito.

## Funcionalidade preservada

- Entradas, saídas, saldo do período e quantidade mantêm os mesmos rótulos, dados, ícones e cores semânticas.
- Não houve alteração dos handlers, consultas, filtros, cálculos, formatação financeira ou operações.
- O Dashboard Financeiro permanece sem alterações.
- Os dois testes herdados de P05 passam sem modificação das asserções.

## Arquivos

- Modificado: `frontend/src/ledger.css`.
- Adicionado: `frontend/tests/ledger-summary-responsive.spec.ts`.
- Modificado: `docs/silex-business/PENDENCIAS.md`.
- Adicionados: este relatório, `TESTES.md` e `PRESERVACAO.md`.

A galeria e as capturas comparativas estão em `docs/evidence/sb05-4/index.html` e no ZIP de revisão. Os resultados detalhados constam em [TESTES.md](TESTES.md), e a recuperação em [PRESERVACAO.md](PRESERVACAO.md).
