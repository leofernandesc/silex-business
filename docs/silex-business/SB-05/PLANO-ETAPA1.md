# SB-05 — etapa 1 autorizada

Baseline: `61c744f4ea291a7f2872c8f3d78f4346e3943ce2`, branch `feat/sb05-financeiro`, checkout limpo confirmado antes de editar.

## Escopo

Somente `/app#finance` (LedgerPage): títulos, ações, indicadores, contas, filtros, tabelas e apresentação dos diálogos de lançamento/estorno. Base visual: protótipo D aprovado. Reutilizar tokens/Inter/componentes existentes sem alterar ui.tsx/styles.css globais, nem operações, cálculos, endpoints, filtros ou impressão.

P06: Nova despesa secundária/neutra apenas em Lançamentos; Nova receita primária e Estornar com semântica própria. P02: a falha original pertence a Pagar/Receber (.input-with-icon); não alterar essas telas. Revalidar foco de Lançamentos e manter P02 aberta até autorização de outra tela. P05: preservar input type=date, min/max/required e handlers originais; mostrar conferência explícita dd/mm/aaaa, derivada do mesmo ISO, sem editor textual novo. Aparência nativa ainda depende do browser/OS; registrar resolução parcial, não declarar uniformidade integral.

Não há editar lançamento manual no módulo atual: há criação e estorno auditável. Não inventar botão Editar nem alteração de valor/data de lançamento já efetivo. Ajustar filtros/preset significa edição de critérios existentes, não de registros históricos.

## Implementação delimitada

- ledger.tsx: classe de escopo, aparência neutra de Nova despesa, elementos exclusivamente de apresentação e orientações acessíveis.
- ledgerPresentation.tsx: helpers visuais de data e região rolável, reutilizáveis dentro da tela; nenhuma consulta/cálculo financeiro.
- ledger.css: estilos próprios sob media screen, sem efeito nos templates/prints e em outros módulos.
- Testes específicos + suítes existentes; scripts/evidências próprios sb05-1.

## Proteção e validação

Backup verificado antes de editar e após, manifesto SHA-256 amplo, cópias via git archive sem data/ de produção. SQLite fictício separado para baseline/candidato/fluxos. Primeiro registrar capturas e testes baseline; depois TypeScript/build, unitários/backend, E2E financeiros, perfis, teclado, tabela completa/última coluna, responsividade, datas pt-BR/en-US e consultas equivalentes.

Commits pequenos com caminhos explicitamente staged e revisão de conteúdo/segredos antes de cada commit. Entregar galeria/ZIP, diffs, hashes, resultados e atualizar pendências por tela; não modificar evidências antigas. Sem push, merge, deploy, outro subincremento ou SB-06.
