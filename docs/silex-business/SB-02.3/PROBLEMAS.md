# Problemas por gravidade e origem

Gravidade média: dificuldade concreta de acesso ou compreensão; baixa: diferença visual ou melhoria sem bloqueio demonstrado. Não foi comprovada regressão crítica ou alta do SB-02.2.

## R01 — Contraste insuficiente dos contornos de foco nos fundos claros.

**Média · Introduzida pelo SB-02.2 · Corrigida**

Busca Clientes: antes 3,964:1; SB-02.2 2,026:1; SB-02.3 4,974:1. Foco geral no canvas: 2,865 → 1,872 → 4,597:1.

Duas referências CSS ao token de foco claro trocadas por azul médio; azul claro preservado em sidebar e welcome-banner. Nenhum handler alterado.

## P01 — Após Escape, o foco não retorna ao botão que abriu o modal.

**Média · Preexistente · Pendente de aprovação**

42 diálogos por versão: foco dentro do modal, contenção em 12 Tabs e Escape funcionam; 0/42 retornam ao acionador, tanto antes como depois do SB-02.2.

Propor correção dedicada em Modal, preservando onCancel/close e formulários. Não corrigida porque exige alteração do comportamento compartilhado preexistente.

## P02 — Campo Busca de Contas a Pagar/Receber não possui marcador de foco visível.

**Média · Preexistente · Pendente de aprovação / SB-05**

6 ocorrências nas 3 larguras. .input-with-icon input já tinha border:0; outline:0 no backup; probe confirma ausência de contorno antes/depois.

Propor foco no wrapper em incremento financeiro, sem alterar filtros ou Enter.

## P03 — Abrir o menu móvel mantém foco em Abrir menu; Tab seguinte vai para Sair fora do menu.

**Média · Preexistente · Planejado para SB-03**

Mesma sequência em 768/375 antes/depois. CSS de ocultação por transformação não substitui gestão de foco/inert.

Planejar transferência/restauração de foco, estado do menu fechado e teclado junto da navegação; requer autorização SB-03.

## P04 — Alguns textos e limites de controles mantêm contraste abaixo dos critérios usados na auditoria.

**Média · Preexistente · Pendente de aprovação**

Subtítulos e ajuda/metadata legados: exemplos 3,71:1, 4,02:1, texto de estoque do PDV 3,69:1. Campo/botão com bordas claras #cedae4/#d7e1ea tem limite visual fraco em branco. Cores já presentes no backup.

Revisar por módulo após aprovação; não substituir indiscriminadamente --muted e cores semânticas. Achados detalhados nas matrizes JSON.

## P05 — Datas nativas dependem da localização do navegador; alguns campos vazios exibem mm/dd/yyyy no Firefox usado, apesar do contexto pt-BR.

**Baixa · Preexistente · Pendente de aprovação / SB-05**

Inputs type=date e valores ISO não foram alterados. Mesmo comportamento nos registros do baseline.

Aplicar futuramente a proposta dd/mm/aaaa do SB-01, mantendo ISO e regras, com os testes de datas previstos no SB-05.

## P06 — Nova despesa continua primária, com a mesma hierarquia de Nova receita.

**Baixa · Diferença já existente do protótipo · Planejado para SB-05**

Ledger e Pagar usam AddButton/primary antes e depois. O botão atual é azul; não foi encontrado botão destrutivo vermelho para essa ação. O protótipo D aprovado prevê opção secundária/neutra.

Reservar mudança de hierarquia para o incremento financeiro; não alterar no SB-02.3.

## P07 — 55 seletores do SB-02.2 repetem seletores anteriores; parte das telas ainda usa cores e dimensões legadas.

**Baixa · Débito técnico documentado · Oportunidade futura**

Inventário inicial: 83 seletores; após correção: 85; zero referência a token inexistente. Tokens de espaçamento/dimensão e parte da semântica financeira não são usados por todos os módulos.

Organizar gradualmente por componente em incrementos autorizados, após testes; nenhuma refatoração global realizada.

## P08 — Visibilidade de atalhos financeiros do operador ainda não usa o mesmo filtro uniforme do guard.

**Média · Preexistente, confirmado na auditoria SB-01 · Planejado para SB-03**

App.tsx preservado byte a byte; teste existente confirma backend 403 ao operador. A disponibilidade de todos os itens de menu ainda exige a matriz SB-03.

Registro único de rotas/disponibilidade para menu, atalhos e guard; backend continua autoridade.

## P09 — Controles densos preservados possuem alvos menores que a referência de 44 px.

**Baixa · Preexistente · Decisão futura de densidade**

Dimensões registradas por controle no JSON; o SB-02.2 mudou principalmente cores/família tipográfica, mantendo padding/densidade existentes.

Decidir revisão de alvos por módulo, preservando densidade operacional; não classificar automaticamente todos como violação de acessibilidade.

Os itens preexistentes e as diferenças de protótipo exigem aprovação antes de correção. A aprovação visual do SB-02.3 não amplia automaticamente esse escopo.
