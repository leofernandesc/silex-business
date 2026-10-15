# Matriz integrada de testes e limites

Todos os testes usam ambientes/bancos descartáveis e dados fictícios. Produção não foi modificada. Testes existentes e suas asserções mantêm hashes do baseline. Sem retries, skips ou falhas na execução integrada aceita. Resultados por caso/projeto/linha: `test-matrix.json`; logs e JSON originais no acervo local.

## Execução técnica

- TypeScript `tsc -b`, build Vite e tipagem explícita da configuração do instrumento: aprovados. Não existe script de lint dedicado.
- Frontend: **96/96 em 12 arquivos**. Backend: **69/69**, com aviso Starlette/httpx já existente, sem instalar dependências.
- Build de baseline e candidata gerou16 arquivos idênticos byte a byte. Não foram incluídos no ZIP.
- Suíte integrada: **285/285 em13 arquivos**,13,3min. Modal separado: **72/72**,2,7min. Total **357**, três projetos1440/768/375; não somar casos de sondas heterogêneas como se fossem testes E2E adicionais.

| Arquivo / casos nas três larguras | Cobertura / módulos |
|---|---|
| accounts-interface57 | Pagar/Receber: busca/filtros/período/status/ordem/paginação, cadastro/recorrência/validações, parcial/integral/encargos/comprovantes/histórico/estorno/cancelamento, P02/P06, CSV/print, operador negado |
| app27 | Clientes/produtos persistidos; estoque, venda/recibo/estorno; diaristas/frete/PIX; pedidos/custos/títulos; caixa por usuário; recorrência/OFX/relatórios |
| navigation36 | Login inválido/válido, cookie/persistência, logout/rede/expiração, retorno protegido, hashes/alias, Voltar/Avançar, P03 e P08/403 real |
| home24 | Guest/retorno/home padrão, consulta empresarial, atalhos por perfil, destinos reais, Home/Visão Geral independentes, erro/empresa ausente, sessão/troca de usuário |
| public21 | Sem sessão/API privada/rastreador, fontes/metadados, âncoras/histórico/reload, CTA/login/logout, menu, tabela demonstrativa e ampliação legada; cenário original T01 intacto |
| ledger-interface24 | Busca/filtros/ISO/competência/documentos, estados/vazio/paginação, criação/estorno/erros, CSV/print, P06/scroll/teclado, operador negado |
| ledger-summary-responsive3 | V02: valores completos pequenos/negativos/elevados,320/375/768/1440, texto ampliado, distribuição de colunas |
| reconciliation-interface21 | Importação, prévia/duplicados, match/criar/ignorar, saldos/centavos/estados, erro/vazio/paginação/conta, tabela/foco/permissão |
| dashboard-interface21 | Seis indicadores vsAPI, janelas temporais, filtros/erros/loading/zero,12meses/alternativa tabular, classificações/contas, valores elevados, link livro caixa e403 |
| header-reflow15 | R02 em sete larguras, nomes longos A/O, menu/teclado, raiz/header texto200; fonte do header intacta |
| visual-accessibility18 | P04 cores/limites/placeholders/badges/feedback/hover/desabilitados; P09 alvos/scroll/320; P01/P02/contraste banner |
| date-presentation9 | P05 rótulos mensais, cadastro/edição/requests e filtros ISO preservados |
| css-pilot9 | Metadados/token, cascata em rotas aquecidas e prontidão de relatório dependente de resposta/linhas reais |
| modal-focus51 | ReactStrictMode, inicial, Tab/Shift+Tab, contenção/fundo inerte, Escape/X/cancelar/confirmar/async, removido/desabilitado/oculto/fallback imediato/tardio, rota/desmontagem/aninhamento de robustez |
| modal-workflows21 | Clientes, produtos/parceiros/usuário, vendas/estorno, estoque/caixa, serviços, Pagar/Receber e OFX com operações reais/foco; fixture separada |

O backend testa concorrência/idempotência/arredondamento/rollback/backup e escopo de usuário; não é teste de carga comercial ou pentest completo. Configuração empresarial não tem modal: inspeção + abertura/estado de formulário, sem inventar diálogo ausente. Inventário Modal continua23 instâncias em dez arquivos; a quantidade histórica42 era outra unidade de contagem.

## Comparações e sondas atuais

| Instrumento | Resultado / significado |
|---|---|
| financial_compare |35respostas JSON iguais: financeiro/filtros, dashboard/contas, vendas/estoque e26relatórios |
| export_compare |30saídas iguais por SHA:26CSV relatórios, financeiro/sales/stockCSV e print financeiro backend |
| financial-flows |17 checkpoints iguais de saldo/centavos/status/datas/IDs: criar, parcial/integral/idempotente, reversões/cancelamento, OFX manual; metadados de criação/sessão não comparados |
| auth-safety |12verificações de401/403/200 e cabeçalhos; flags de cookie sem valor/token; Secure=false é limite para implantação comercial |
| surfaces |130 medições normais,26 superfícies×5larguras; zero overflow de documento.20simulações de fonte200 e seis larguras extremas adicionais; problemas mantidos visíveis |
| baseline-probe |24pares Home/Visão Geral/Lançamentos normal/texto200: documento idêntico nas versões |
| reflow-detail/overflow-sources |Causas por caixa, scrollWidth e range de texto; sete ensaios textuais, quatro Home com nome longo pareados, três diagnósticos intrínsecos. Pesquisar alcançável por Tab/foco visível nas amostras |
| native-zoom |16 estados reais no Firefox/Xvfb:200% e400%,DPR2/4,1280→640/320,sem overflow; menu Home Enter/Escape/retorno. Não é mera emulação de viewport |
| interaction-evidence |P01 com teclado e capturas1440/768/375; P03 móvel/tablet; dois inputs nativos com ISO2026-03-04, com/sem conferência brasileira |
| V01 |**90/90**,30por largura somando baseline/candidata:60 carregados,30 resposta real retida no teste/UI busy. Sessão200,destino finance, eventos/console/rede registrados; sem falhas observadas |
| T01 |21públicos originais +**15/15** ciclos novos com heading/fontes/âncora/CTA/reload e rede; networkidle medido depois da prontidão real; sem API privada/erro observado |

V01 e T01 **não encerradas**: amostragem aprovada não demonstra a causa histórica. Não foram alteradas navegação, autenticação, página pública ou asserções antigas. Não repetir a matriz SB-06D.2 de201estados/581.135propriedades: fontes/CSS inalterados, a equivalência anterior permanece referência, não é contabilizada como execução SB-06E.

## Desenvolvimento dos instrumentos e ocorrências preservadas

1. Primeiro fluxo HTTP usou data de pagamento anterior ao saldo inicial:422correto. Corrigida a entrada de teste; novos bancos para comparação, log inicial preservado.
2. Temporários indisponíveis após continuação:357 resultados já concluídos preservados. Reconstrução pelo arquivo aprovado/construtores sintéticos; comparações35/30/17 repetidas em clones novos. Tentativa inicial de congelar só parte do calendário da fixture falhou corretamente na regra de abertura; estratégia removida, sem mudar fonte/regra do produto.
3. O coletor registrou cinco401 de `/api/auth/me` ao abrir login anônimo e inicialmente classificou qualquerHTTP≥400 como erro. As156medições terminaram; classificação ajustada especificamente para esse probe esperado. JSON original preservado; nenhum401 em módulo autenticado é aceito por essa exceção. Não se omite resposta de erro desconhecida.
4. Zoom: nomes UTF-8 da janela não eram obtidos por XFetchName; diagnóstico Xwininfo identificou a janela Navigator no display privado. Amostras iniciais durante a animação foram preservadas e não usadas para concluir200/400. Instrumento final espera estabilidade, medeDPR/viewport e confirma os níveis.
5. Coletor suplementar tentava alcançar um controle anterior apenas avançandoTab; foi ajustado para Shift+Tab conforme ordemDOM, sem foco programático no acionador ou mudança de componente. Capturas finais comprovam teclado/retorno; log inicial retido.

Essas ocorrências não são falhas funcionais atribuídas ao produto nem retries de suíte para esconder erros. Nenhum teste antigo ou valor de fixture financeira foi reduzido para passar.

## Não executado / não comprovado

Leitor de tela real, toque físico, todos os SO/navegadores, calendário nativo com tecnologia assistiva, drivers/PDF físicos, carga prolongada e implantação externa. Roteiro manual identifica casos e critérios esperados. Não declarar homologação integral, segurança exaustiva ou prontidão SaaS por causa dos testes locais aprovados.
