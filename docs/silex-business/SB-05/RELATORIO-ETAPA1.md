# SB-05 — primeira etapa de refinamento financeiro

**Concluída para revisão. Nenhum outro subincremento ou SB-06 iniciado.**

## Implementado

Tela de Lançamentos em /app#finance refinada conforme D: hierarquia/tokens/Inter, indicadores e contas, filtros legíveis, todos os períodos visíveis em linhas no celular, tabela com numerais tabulares e Entrada/Saída além da cor, orientação de rolagem quando há overflow real e apresentação dos diálogos existentes.

Nova despesa é secundária/neutra; Nova receita permanece primária. Estornar mantém semântica e condições originais. Native dates mantêm ISO/handlers/required/min/max, com conferência explícita dd/mm/aaaa abaixo. Sem editor textual novo, consulta decorativa, edição de movimento efetivo ou funcionalidade financeira nova.

- **P02:** falha original em Pagar/Receber continua pendente; essas telas não foram alteradas. Foco de Lançamentos revalidado/refinado localmente.
- **P05:** parcial. Apresentações controladas e legendas são brasileiras; editor nativo ainda depende do navegador/OS. Não declarar uniformidade integral.
- **P06:** corrigida somente em Lançamentos; Contas a Pagar ainda exige autorização própria.

## Git e arquivos

Baseline confirmado: `61c744f4ea291a7f2872c8f3d78f4346e3943ce2`. Branch `feat/sb05-financeiro`; main preservada nesse baseline. Commits pequenos de preparação, estilo, testes, correção responsiva, seleção de fixture e documentação. Arquivos staged revisados por caminhos/conteúdo/tamanho antes de cada commit. Lista e hashes completos finais em [COMMITS.md](../../evidence/sb05-1/COMMITS.md), [estado](../../evidence/sb05-1/git-state.json), [diff/stat](../../evidence/sb05-1/git-diff-stat.txt).

Existentes modificados: frontend/src/ledger.tsx e documento central PENDENCIAS.md. Novos frontend: ledger.css, ledgerPresentation.tsx, ledgerPresentation.test.ts e tests/ledger-interface.spec.ts. Documentos próprios sob SB-05 e scripts de validação sob evidence/sb05-1/scripts. Lista completa em [manifesto](../../evidence/sb05-1/git-files-since-baseline.json).

O diff de Ledger é limitado a apresentação. ui.tsx/styles.css/shared helpers/outros módulos permanecem iguais. CSS nova somente media screen e classes próprias; não afeta impressão. [Arquitetura e diferenças do D](ARQUITETURA-ETAPA1.md).

## Preservação e testes

Dos 1.743 arquivos existentes no baseline, 1.741 permanecem iguais; somente Ledger e PENDENCIAS têm mudanças autorizadas. Backend, banco, contratos, auth/permissões, cálculos, fluxos, estoque/vendas/caixa, outros financeiros, App/navegação/Home/público, ativos/fontes/tokens, build do checkout e evidências anteriores preservados.

Prova estrutural mantém **84 chamadas críticas e 31 handlers**; estado/filtros, seis cabeçalhos e template print idênticos. **19 consultas equivalentes** entre fixtures baseline/candidato. Backups/reversão ensaiados em diretório temporário, incluindo dois originais e remoção de quatro novos frontend; 62 originais conferidos.

TypeScript/build Vite, **59 testes frontend, 69 backend e 72 E2E** aprovados na rodada final: 24 específicos + 27 operacionais + 21 públicos. Admin/operator, recusa real backend, filtros/presets/paginação, criar/estornar, moeda/payload ISO, pt-BR/en-US, required/max, CSV/print applied, teclado e responsividade incluídos. Nenhum skip/retry final. Tentativas e limitações registradas em [TESTES-ETAPA1](TESTES-ETAPA1.md).

60 capturas antes/depois em 1440/768/375 px, comparação D, foco/última coluna/diálogos e outras cinco telas preservadas. Candidato: zero overflow de página/erros JS e falhas de contraste textual detectadas na Ledger. Não é certificação integral de acessibilidade.

## Entregas para revisão

- [Galeria comparativa](../../evidence/sb05-1/galeria.html).
- Capturas Lançamentos: [1440](../../evidence/sb05-1/screenshots/candidate-finance-1440.png), [768](../../evidence/sb05-1/screenshots/candidate-finance-768.png), [375](../../evidence/sb05-1/screenshots/candidate-finance-375.png).
- [ZIP externo](../../evidence/sb05-1/SB-05-stage1-review.zip), sem .git/banco/build; manifesto SHA-256 interno e hash externo.
- [Prévia local fictícia](http://127.0.0.1:18034/app#finance), [reprodução](REPRODUCAO-ETAPA1.md).
- [Resultados](../../evidence/sb05-1/tests-summary.json), [matriz](../../evidence/sb05-1/test-matrix.json), [preservação](../../evidence/sb05-1/preservation-test.json), [backup/reversão](PRESERVACAO-ETAPA1.md).

## Pendências e aprovação

Revisar esta entrega e as diferenças do D: calendário nativo com conferência adicional, dados reais da fixture (34 movimentos, diferentes dos cinco exemplos estáticos), sem Enviar ou edição inexistentes. Templates legados preservados por restrição expressa. P01/P02/P04/P05/P07/P09 continuam com seus limites; P06 ainda parcial por tela. Leitor de tela real e dispositivos físicos pendentes.

Correção de P02 em Pagar/Receber, editor uniforme P05 e outras telas financeiras exigem autorização própria antes de ampliar o escopo. Não iniciar automaticamente. Sem push, merge, deploy ou mudança de dados reais.
