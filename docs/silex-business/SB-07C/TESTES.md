# SB-07C — validação e limites

## Resultado técnico

| Verificação | Resultado | Evidência essencial |
|---|---|---|
| TypeScript de produção + build Vite | Aprovados | final-build.log |
| Tipos dos testes/configurações/fixture novos e adaptados | Aprovados | final-test-types.log, comando em REPRODUCAO.md |
| Frontend unitário/SSR | **121/121**, baseline 96/96 | final-unit.log, baseline-unit.log |
| Backend, intacto | **69/69**, baseline 69/69 | candidate-backend.log, baseline-backend.log |
| Componentes — fundação | **16/16 Firefox e 16/16 Chromium** | foundation-*-results.json |
| Componentes — ampliação posterior | 17 casos de componente aprovados na rodada Firefox; calendário também em 291 px, limites/limpeza mensal adicionados e aprovados nos dois navegadores | final-components-visual-firefox-results.json, grid-final-*-results.json, extra-validation-*-results.json |
| Piloto: Serviços, vendas a prazo e saldo inicial | **2/2 por navegador**, pt-BR/en-US, payloads/resultados equivalentes | pilot-*-results.json; pilot-{desktop,chromium}-{locale}.json |
| Demais formulários, sete filtros, mensal e bloqueio de edição parcial | **3/3 por navegador** | migration-*-results.json; migration-{desktop,chromium}-{locale}.json |
| Regressão desktop selecionada, 13 arquivos | **90 aprovados, 2 falhas do instrumento de visibilidade, 3 não executados**; os dois casos adaptados passaram **2/2** sem retirar a asserção | regression-prepared-results.json, regression-scroll-actions-results.json |
| Regressão móvel dirigida | **14/14** | regression-mobile-results.json |
| Grade/calendário/modal e visual final | **9/9 Firefox + 9/9 Chromium** | grid-final-*-results.json |
| Limites mensais e erro acessível sem publicar ISO parcial | **2/2 Firefox + 2/2 Chromium** | extra-validation-*-results.json |
| Zoom nativo Firefox 200% e 400% | Aprovado no recorte de edição/seleção e foco do calendário/modal | native-zoom.json, capturas |
| Contraste e dimensões dos novos controles | Aprovados em 1440/768/375/320 | accessibility.json |
| AST, limites/estados, hashes e restauração | Aprovados | migration-inventory.json, preservation-test.json, restoration-test.json |
| Diff | `git diff --check` aprovado | git-final.json |

Os resultados não são somados artificialmente: há rodadas sobrepostas de cobertura. Os JSONs resumidos discriminam cada execução, inclusive tentativas e limitações. Não foram adicionados retries automáticos.

## Datas, locale e fuso

- Matriz de componente: `pt-BR`, `en-US`, `de-DE` × `America/Manaus`, `America/Sao_Paulo`, `UTC`. Mesma ordem dia/mês/ano e ISO em todos os nove contextos.
- Casos: 04/03/2026 vs 03/04/2026, 29/02/2024, 29/02/2025 inválida, 31/12/2026, 01/01/2027, início/fim de mês, vazio/obrigatório/opcional, min/max, parcial, limpeza, atualização controlada, disabled/readOnly/fieldset e seleção por calendário.
- Competência: MM/AAAA, YYYY-MM intacto, ano 2300 sem corte artificial, min/max, atualização controlada, somente leitura e limpeza opcional. Nenhum dia é acrescentado ao contrato mensal.
- Edição parcial/impossível impede envio, mantém o estado anterior e expõe erro. A normalização automática de blur da biblioteca não é propagada como uma data válida sem edição apropriada.
- Os testes usam teclado real dos segmentos e o calendário oficial; os inputs auxiliares ISO são conferência de contrato, não o único alvo de teste.

## Equivalência funcional

Baseline e candidata foram servidos a partir do mesmo backend aprovado, em SQLite temporários separados, inicializados com os mesmos dados sintéticos. Cada comparação aplica as mesmas operações nas duas versões.

1. Serviços: criação com `2026-03-04`, edição para `2024-02-29`, recarga; títulos com vencimento `2026-12-31` e competência `2027-01-01`.
2. Saldo inicial: criação e edição da referência, valores em centavos e recarga.
3. PDV/venda a prazo: vencimento ISO na venda imediata e na finalização de rascunho, com resultado financeiro equivalente.
4. Lançamentos: POST com posting/competence originais, centavos e resultado do dashboard.
5. Pagar/Receber: POST de títulos, datas e valores; regressões adicionais de baixa parcial/total, encargos/desconto, anexos, reversão, cancelamento e recorrência.
6. Filtros de Lançamentos, Pagar, Receber, Dashboard, Relatórios, Vendas e Estoque: mesmos parâmetros ISO, resultados e exportação CSV nos recortes aplicáveis.
7. Meta mensal: mesmo ano/mês/valor no POST, recarga e filtro. Edição incompleta não abre o formulário de nova meta.

Identificadores de idempotência aleatórios de operações equivalentes são normalizados somente na comparação; datas e valores financeiros nunca são reduzidos. As respostas financeiras, filtros e expressões de chamada API permanecem equivalentes. Nenhuma API nova foi introduzida para a migração.

## Navegação e acessibilidade preservadas

A seleção existente cobre login válido/inválido, retorno protegido, refresh, histórico, hashes legados, Início/Visão Geral distintos, logout, falhas de rede/403, perfil operador, menu P03, permissões P08, busca P02, hierarquia P06, tabelas e responsividade dos indicadores. Modal compartilha sua implementação original; sete padrões desktop e um padrão móvel adicional passaram, além do calendário em Modal nas quatro larguras principais e 291 px.

Três testes de expiração de sessão da seleção antiga foram **não executados** porque exigem os manifestos temporários SB-03/04B e respectivos caminhos de SQLite, indisponíveis nesta execução. Seus skips originais foram mantidos. Autenticação/rotas/permissões não foram modificadas; essa limitação não é apresentada como nova homologação desses três casos.

P04/P09: textos, borda, seleção e alvos dos novos controles foram medidos. Ações de calendário: 36 px no desktop, 44 px no móvel; dias ao menos 24 px. Elementos desabilitados têm exceção de contraste documentada. Esses resultados não certificam a aplicação inteira.

## Ocorrências e correções do instrumento

- Primeira regressão usou apenas seed-demo: 63 aprovados, 29 falhas, 3 skips. As suítes antigas dependem de títulos paginados, uma empresa fictícia específica e histórico OFX. O construtor sintético histórico foi reutilizado em nova base temporária; nenhum produto ou evidência antiga foi alterado.
- Seletores de legendas/inputs nativos foram migrados para segmentos/ISO; a consulta relativa ao rótulo em um Modal foi corrigida no helper do teste. Contratos, validação e asserções financeiras permanecem.
- Com fixture correta, duas verificações de Quitar falharam por estar abaixo da viewport: o novo controle altera a altura dos filtros. O teste agora rola explicitamente até a ação e mantém `toBeInViewport`. Os dois casos passaram no desktop e no celular. A versão original passou no baseline, comprovando a diferença de altura, não perda da ação.
- Na primeira rodada com fixture simples, precisão de barra e overflow do Dashboard também falharam. Com a fixture correta, ambos passaram na candidata e em comparação com o teste original no baseline; Dashboard não foi alterado.
- Uma execução concorrente compartilhava o diretório de traces: falhou por ENOENT ao copiar artefatos. Os 17 testes de componente passaram nessa rodada. A galeria foi repetida com diretórios independentes e as duas matrizes finais 9/9 passaram. A falha de artefato está preservada no resultado original.
- A comparação baseline de Conciliação inicialmente não recebeu a senha fictícia no ambiente. O instrumento foi chamado com a pré-condição correta e o teste original passou, sem modificar sua asserção.
- Zoom nativo 400% demonstrou 3 px de excesso do novo popover, corrigido limitando-o também pelo contêiner. Texto 200% mostrou sobreposição de abreviações, corrigida com largura intrínseca da tabela e rolagem restrita à grade. As medições e capturas finais comprovam a correção.
- Clique automatizado em janela Firefox com zoom nativo não acertou a coordenada esperada. O DOM hit-test confirmou o botão descoberto; o ensaio final usa teclado, registra a limitação de ponteiro e não força clique. Mouse em tamanho normal foi testado nos dois navegadores.

## Limitações e próximos ensaios

Firefox 155.0 e Chromium 155 via Brave já instalado foram usados com perfis descartáveis. Não houve instalação global nem uso do perfil pessoal. O segundo navegador cobre Chromium, não certifica toda versão do Chrome.

Não houve participante humano, leitor de tela real, celular físico ou homologação ampla de toque/ponteiro sob zoom nativo. Recomendação: testar com usuário brasileiro e leitor real os segmentos, erro/limpeza e rolagem da grade ampliada. Segmentar a edição muda a interação em relação ao campo nativo; essa diferença precisa de homologação humana.

P05 permanece parcial globalmente por CSV/impressões fora do escopo. P07, C02, V01/T01 e limites de produção permanecem documentados. A aprovação técnica dos campos não representa autorização comercial ou conformidade WCAG integral.
