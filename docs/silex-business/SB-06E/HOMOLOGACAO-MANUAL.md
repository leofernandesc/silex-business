# Roteiro reproduzível de homologação manual

**Não executado com leitor de tela real.** Orca instalado, `screen-reader-enabled=false`, sem processo Orca em execução. A presença do binário não comprova uma sessão assistiva funcional. DOM, ARIA, teclado automatizado e contraste não substituem percepção auditiva/uso por pessoa. Use exclusivamente fixture descartável, nunca banco/usuário real. Credenciais fornecidas separadamente; nenhum segredo acompanha o pacote.

## Preparação e registro

1. Responsável cria ambiente isolado a partir do commit revisado, banco descartável e duas contas sintéticas A/O; confirma URL loopback e API/health. Não executar seed/migrações no banco real.
2. Registrar versão do SO, navegador, leitor, idioma pt-BR, escala do SO, dimensões de janela, zoom inicial, data, executor e commit. Fotografias/capturas sem dados reais. Usar perfil de navegador de homologação, sem extensões ou senhas pessoais.
3. Ambiente principal proposto: Windows + Firefox/Chrome + NVDA configurado e áudio funcional; alternativa Linux GNOME + Firefox + Orca com AT-SPI e áudio. Esses ambientes são **propostas para validação**, não plataformas homologadas. Anotar diferenças e repetir os casos essenciais por combinação comercial suportada.
4. Usar Tab/Shift+Tab/Enter/Escape e comandos de leitura do leitor escolhido; distinguir modo navegação de modo formulário. Registrar o anúncio efetivo, não apenas “passou”. Se ausente acesso a leitor/áudio, marcar **não executado**, com responsável e data proposta.

## Zoom nativo e reflow (H-Z)

- H-Z01: em janela útil **1280 CSS px a 100%**, abrir Home, Visão Geral, Lançamentos, Pagar/Receber, Conciliação e Dashboard financeiro. Usar menu **do navegador** para 200%, depois 400%. Registrar o percentual visível no menu, `innerWidth`, `devicePixelRatio`, `visualViewport.scale`, scrollWidth e captura. A 400%, confirmar largura equivalente próxima de320 CSS px; se DPI/decorações alterarem o resultado, ajustar e registrar, sem rotular uma simples viewport como zoom.
- H-Z02: ler títulos/valores completos e operar cada filtro, menu, botão principal, última coluna e paginação. Tabelas/gráficos podem exigir rolagem interna pela natureza bidimensional; texto/controles externos devem reflow sem perda funcional. Verificar tanto topbar quanto conteúdo. Registrar sobreposições, cortes, elemento/caixa e acesso por teclado.
- H-Z03: ativar “somente texto” a 200% se disponível; repetir Home/Visão Geral/filtros Lançamentos/Pagar/Receber e modais. Registrar se o navegador impõe uma fonte mínima ou apresenta campos nativos de outra forma. Esta configuração não é igual à duplicação computada de todas as fontes do coletor.
- H-Z04: nomes sintéticos longos de empresa/usuário e perfis A/O; menu móvel aberto/fechado, foco visível e Escape. Retornar100% ao fim. Robustez em256/187 é adicional, **não requisito normativo de320**.

Referências de interpretação: [WCAG1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). A exceção de tabelas não autoriza perda de controles externos. Não declarar conformidade integral a partir deste roteiro.

## Leitor de tela e teclado (H-A)

| Caso | Ações | Resultado esperado / evidência a registrar |
|---|---|---|
| H-A01 Login | Abrir `/entrar`; percorrer rótulos, preencher senha incorreta e enviar, depois válida | Campos com nomes, senha protegida, erro anunciado sem leitura da senha; Home após sucesso |
| H-A02 Público | Abrir `/` sem sessão; navegar por títulos/landmarks, menu/âncoras/Entrar | Um h1, sequência coerente, demonstração identificada fictícia, sem dados internos; menu móvel anuncia expandido e fecha por Escape |
| H-A03 Shell | Abrir menu móvel via teclado, Tab/Shift+Tab, grupo/itens, Escape, fechar/backdrop | Nome/estado do acionador, foco inicial no painel modal, conteúdo encoberto inacessível, retorno ao abrir; desktop sem retenção indevida |
| H-A04 Home/perfis | Ler empresa, atalhos/grupos como A e O; acessar Visão Geral | Marca fixa e empresa diferenciadas; somente destinos permitidos; Home e Visão Geral anunciadas como telas distintas |
| H-A05 Cadastro | Novo Cliente, rótulos, obrigatórios, erro, salvar/editar/cancelar | Ordem lógica, erro perceptível, foco inicial adequado e retorno ao acionador, sem leitura do fundo enquanto modal |
| H-A06 Modais | Clientes, produto, fornecedor, venda, estoque, baixa financeira e OFX; X/Cancelar/Escape/sucesso/async | Nome do diálogo, contenção, foco visível; retorno/fallback quando acionador removido/desabilitado; mudança de rota não puxa foco ao módulo antigo |
| H-A07 Financeiro | Ler indicadores, filtrar De/Até/Busca, percorrer cabeçalhos e linhas, rolar até ações | Valores/cêntimos completos e relação com título; foco nas buscas; data civil inequívoca; situação textual sem depender da cor; região rolável operável |
| H-A08 Datas | Inserir datas ambíguas03/04 e04/03 nos controles nativos; abrir editar e relatório/print/CSV | Confirmar anúncio de dia/mês e ISO enviado; comparar com descrição brasileira. Divergência de interpretação = falha, nunca “só cosmética” automaticamente |
| H-A09 Gráfico | Dashboard financeiro, legenda/disclosure tabela mensal e12 pares | Entradas/saídas distinguíveis por texto; tabela acessível com mesmo período/valores, sem depender de tooltip/cores |
| H-A10 Estados | Carregamento, zero real, lista vazia,422/403/401 controlados no descartável | Não confundir erro com zero financeiro verdadeiro; mensagem e destino de foco compreensíveis; sessão expirada oculta conteúdo |
| H-A11 Sessão/rota | Logout, Voltar, URL protegida, login de O, URL administrativa | Sem conteúdo privado após sair, retorno seguro à rota autorizada, recusa403 real |
| H-A12 Toque/zoom | Dispositivo físico, controles adjacentes e última coluna | Sem acionamentos ambíguos; foco/área acionável preservados; medir exceções aplicáveis de24 px em vez de impor44 universal |

Padrão de diálogo: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); alvos: [WCAG2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Aprovação exige observação humana, não apenas atributos corretos.

## Operação e integridade (H-F)

H-F01: saldo antes/depois de criar título não se altera; baixa parcial/integral com principal/encargos/desconto, idempotência, estorno e cancelamento preservam centavos/histórico. H-F02: OFX descartável, duplicado, pendente, conciliar manualmente/ignorar; confirmar que não há baixa automática. H-F03: relatórios mensais, período ambíguo, CSV e impressão/recibo não fiscal: conferir linhas/totais/data/semântica e driver/PDF real. H-F04: reinício/backup/restauração de banco **fictício** e comprovantes; evidência de IDs/saldos/sessões esperados. H-F05: teste prolongado com dados e concorrência representativos do uso esperado; não extrapolar testes unitários para volume/continuidade comerciais.

## Decisão e bloqueios

Planilha de execução: caso, ambiente/commit, entrada, passos, observado, esperado, evidência, aprovado/falhou/não executado, gravidade, responsável, data de reensaio. Acessibilidade integral e lançamento comercial permanecem sem aprovação enquanto houver lacunas essenciais. Homologação controlada é possível como atividade restrita com dados fictícios, riscos conhecidos e acompanhamento; não constitui liberação produtiva. Correções do produto exigem autorização própria.
