# Migração incremental — SB-02 a SB-06

Cronograma sugerido: cinco sprints de uma semana, ajustáveis à revisão. Direção visual/design system e paths aprovados conceitualmente pelo usuário. SB-02.1 concluído; SB-02.2 aguarda revisão e autorização própria. Não são datas prometidas; cada incremento exige revisão demonstrável e aprovação antes do seguinte. Sem migrações, mudança de contrato, recálculo ou alteração de permissões nesta trilha visual.

## Sequência

| Sprint | Foco | Dependência | Resultado revisável |
| --- | --- | --- | --- |
| SB-02 | Tokens, assets e marca fixa | Aprovação visual SB-01 e rótulo legado | Fundamentos e login/shell com identidade própria |
| SB-03 | Separação de navegação pública/ERP | SB-02 e aprovação dos fluxos | Rotas e retorno seguro preservando módulos |
| SB-04 | Página comercial + inicial autenticada | SB-03 e conteúdo homologado | Duas páginas distintas; dashboard preservado |
| SB-05 | Prioridade financeira e impressões | SB-02/03; estados reais disponíveis | Financeiro consistente, datas brasileiras e scroll indicado, sem alterar regras |
| SB-06 | Demais módulos e revisão integrada | SB-04/05 | Identidade consistente e revisão de negócio final |

## SB-02 — fundamentos e marca

**Escopo:** em duas pequenas entregas: (02.1) assets oficiais, Inter local/licença, tokens e Brand; (02.2) menu escuro, topbar claro, login de duas colunas e assinaturas de software no shell. Preservar navegação/autenticação atuais nesta sprint. Aplicar componentes compartilhados gradualmente, sem reescrever formulários.

**Dependências:** direção visual A–D e rótulos de brand_name/company_name aprovados. Usar os SVGs refinados oficiais e Inter local com licença. Não usar estudos antigos.

### SB-02.1 — Fundamentos da identidade visual

**Estado:** concluído nesta entrega e aguardando revisão. Integrados cinco SVGs oficiais, Inter local com licença OFL, tokens CSS e componente Brand isolado. O shell e as telas operacionais não consomem os tokens e mantêm sua aparência atual. Nenhum dado, contrato, rota, autenticação ou regra foi alterado. Relatório, hashes e validações: [SB-02.1](../SB-02.1/RELATORIO.md).

### SB-02.2 — Aplicação visual ao shell e ao login

**Estado:** não iniciado; depende da revisão e autorização explícita após o aceite do SB-02.1.

**Arquivos:** frontend/src/styles.css, ui.tsx, App.tsx, settings.tsx, frontend/index.html; novos brand/Brand.tsx, styles/tokens.css e assets/brand, assets/fonts propostos. Em settings alterar somente apresentação/rótulo aprovado, não payload ou dados. Não alterar models/schemas/defaults empresariais.

**Aceite:** Silex Business fixa no login/shell/metadados; empresa separada e editável; não alterar valores armazenados; Inter carregada localmente; sidebar profunda e conteúdo claro; login mantém duas colunas no desktop; fallback mobile legível; foco, hover, loading, disabled e validações preservados. Preservar posição/ação de logout e chaves de sessão/storage.

**Testes necessários após autorização de implementação:** build/TS; testes frontend existentes; captura desktop/tablet/mobile login e shell; controle de contraste e teclado; salvar Empresa e identidade em banco de teste e confirmar marca fixa; ausência de chamadas externas de fonte; confirmar que rotas e requests não mudaram. Não executados no SB-01.

**Riscos:** overrides globais, contraste login móvel, deslocamento de conteúdo, wrappers alterando form/dialog e tabela. **Revisão:** diff pequeno para cada entrega, capturas antes/depois com fixtures, inspeção de fontes/tokens, checklist contratos preservados e aprovação visual do usuário. Restaurar apenas arquivos visuais em rollback; não há rollback de dados.

## SB-03 — navegação e coordenação da sessão

**Escopo:** (03.1) registro de rotas existentes e filtro uniforme menu/atalhos; (03.2) dispatcher `/`, `/entrar`, `/app#...`, allowlist de retorno e compatibilidade dos hashes antigos; (03.3) expiração/logout/histórico/foco. Alteração apenas de coordenação frontend; backend continua autoridade.

**Dependências:** direção de paths/id home e compatibilidade legada aprovada conceitualmente; autorização expressa para implementar SB-03, com testes de rotas/sessão/autorização/histórico/logout; disponibilidade de fallback servidor. As páginas finais entram no SB-04; usar componentes mínimos de estrutura transitória na branch de desenvolvimento sem substituir módulos funcionais e sem publicar etapa incompleta.

**Arquivos:** App.tsx, api.ts somente caso necessário preservar evento já existente, novos navigation/routes.ts, navigation/navigation.ts, auth/SessionBoundary.tsx, layout/AppShell.tsx, layout/PublicLayout.tsx; configuração Vite/hosting apenas se indispensável e aprovada. Nenhum endpoint/cookie/política backend muda.

**Aceite:** público guest; módulos guardados sem flash privado; sessão atual persistente; login retorna ao destino permitido ou home; operador não vê atalhos administrativos; aliases preservados; desconhecido tratado; 401 e 403 distintos; logout público sem empresa/dados; voltar/avançar/refresh corretos; âncoras públicas não mudam ERP. Preservar remontagem/reset de páginas e filtros observados hoje.

**Testes necessários:** unitários allowlist e normalização sem open redirect; matriz guest/admin/operator × público/login/home/dashboard/finance/legado/desconhecido; retorno permitido/negado; expiração em operação; logout confirmado/401/rede; refresh e histórico; navegação por teclado e foco do menu móvel; requests/cookie idênticos; backend autorização existente em banco de teste separado. Não usar banco principal.

**Riscos:** loops/dupla entrada em histórico, destino indevido, race em auth/me, conteúdo privado residual, listener StrictMode duplicado, fallback de hosting. **Revisão:** apresentar matriz e gravação dos fluxos com conta de teste, diff de guarda e compatibilidade, aprovação técnica e do usuário antes de ativar páginas. Rollback do dispatcher para shell anterior preserva cookie e API.

## SB-04 — duas páginas novas

**Escopo:** (04.1) página pública A sem dados privados; (04.2) inicial autenticada C com empresa real disponível e atalhos por papel. Login B já adaptado em SB-02 e navegação preparada em SB-03. Visão Geral mantém todos os indicadores, últimos registros, alertas e ações; apenas link de acesso na nova home.

**Dependências:** aprovação de texto comercial/módulos homologados, navegação SB-03, ativos oficiais e disponibilidade por papel.

**Arquivos:** novos pages/PublicHome.tsx, pages/AuthenticatedHome.tsx, PublicLayout/AppShell, registro de rotas, CSS de páginas e fixture comercial separada; CompanySettings e User/types já existentes, sem novos campos/API.

**Aceite:** todas as seis seções públicas; CTA somente Entrar; demonstração identificada fictícia; sem cadastro/contratação/integração inventada; sem company-settings/dashboard no guest; nenhuma imagem privada; home com empresa configurada e vazio honesto; sem selector de empresas; cards/atalhos apenas disponíveis; Visão Geral independente e idêntica em dados/comportamento; default home e retorno protegido conforme fluxo aprovado.

**Testes necessários:** público sem sessão e com sessão; observar requests e ausência de dados privados; links/âncoras/cabeçalho/CTA; conteúdo e fixture separados de queries; admin/operator; empresa vazia/preenchida; telas 375/768/1440 e zoom; leitor de tela/teclado; comparar dados dashboard antes/depois em mesma fixture.

**Riscos:** promessas comerciais indevidas, vazamento via screenshot/fixture, duplicação do dashboard, cartões com acesso negado, layout mobile. **Revisão:** primeiro conteúdo e página pública; depois home com dois papéis; usuário aprova ambas antes de disponibilizar o novo ponto de entrada. Sem deploy implícito.

## SB-05 — financeiro e impressão

**Escopo:** (05.1) Lançamentos D: períodos, indicadores, contas, filtros e tabela; (05.2) Pagar/Receber/baixas/PIX/anexos/catálogos; (05.3) dashboard, OFX manual, relatórios/orçamentos e templates print. Entregas visuais separadas por grupo de telas.

**Dependências:** tokens homologados, mapa de estados e evidências reais do frontend em banco de teste; densidade D aprovada. Permissões, parâmetros, cálculos, idempotência e modelos intocados.

**Arquivos:** ledger.tsx, finance.tsx, financePlanning.tsx, financeCatalog.tsx, ui.tsx/CSS; DateField compartilhado proposto (arquivo dedicado ou ui.tsx), somente após autorização; **backend/app/api.py:490–498**, somente HTML/CSS/marca de finance_print. Arquivo backend pode ser editado futuramente para apresentação, com diff restrito: manter queries, escape, headers, contrato e valores. Nenhuma edição agora.

**Aceite:** Nova despesa neutra; datas visíveis dd/mm/aaaa com mesmos ISO, sem deslocamento por fuso; indicação dinâmica de scroll quando necessário e acesso a todas as colunas/ações em tablet/mobile/teclado; filtros draft/applied e Enter, bases/datas, paginação e exportação iguais; contas mostram saldos atuais, KPIs do período separados; mesmos totais em UI/CSV/print; entrada/saída com sinal/texto; status/vencimento não dependem de cor; estornos nas condições atuais; títulos abertos não alteram saldo; PIX permanece cadastro/cópia; OFX continua confirmação manual; impressão legível e assinada sem alterar emitente/dados.

**Testes necessários:** regressão financeira/backend existente; cenários receita/despesa, quitação parcial, juros/multa/desconto, estorno, cancelamento, recorrência e idempotência; cadastro/seleção de prestadores e cópia PIX sem movimentação; filtros por conta/origem/comprovante/competência; indicadores e CSV/print; loading/erro/vazio; datas em navegador pt-BR/en-US, entrada incompleta/inválida e calendário com mesmo ISO, ano bissexto/limites de mês e datas ambíguas; orientação de overflow e acesso à última ação por toque/teclado; modais no mobile; nenhuma nova mutation disparada por navegação/estilo.

**Riscos:** densidade/overflow, modais cortados, financeiro global atingido por CSS, impressão divergente, confundir saldo atual com saldo do período. **Revisão:** Review por subentrega com dados fictícios conhecidos, totais comparados ao baseline e screenshots; conferência de negócio por quem opera o financeiro. Aprovação de estética não aprova novas regras. Rollback somente apresentação.

## SB-06 — consistência e revisão final

**Escopo:** (06.1) cadastros, fornecedores/diaristas/frete e serviços/pedidos; (06.2) produtos/serviços, estoque, PDV, vendas/caixa, usuários/auditoria/configuração; (06.3) recibos, metadados técnicos opcionais, remoção de CSS obsoleto comprovado e revisão integrada. Não incluir novos módulos, hospedagem, fiscal ou multitenancy.

**Dependências:** SB-04/05 revisados, contratos e baseline preservados; homologação dos responsáveis pelos fluxos.

**Arquivos:** catalog.tsx, partners.tsx, serviceOrders.tsx, operations.tsx, sales.tsx, users.tsx, settings.tsx, App.tsx/ui.tsx/styles.css; eventualmente api.py FastAPI title e cli.py descrição sem mudar contratos. Modelos/schemas/defaults e dados não são alvos.

**Aceite:** todas as 23 telas e alias acessíveis conforme papel; formulários e validações completos; prestadores/PIX e vínculo pedido→título preservados; produto/serviço e estoque corretos; recibo tem software/cliente separados; empresa editável; marca provisória não aparece nas superfícies de software; estilos obsoletos removidos somente com evidência; responsive/print coerentes.

**Testes necessários:** build e suítes existentes em banco separado; regressão ponta a ponta cadastros→estoque→venda→caixa→financeiro e serviço→prestador→título→baixa/estorno; admin/operator; filtros/CSV/prints; mobile e teclado; inspeção final de nomes, assets e fontes; comparação de contratos e esquema sem migração.

**Riscos:** refactor CSS amplo, mudanças não visuais disfarçadas, perda de atalhos/ações, detalhes de serviços sem estilo, identificação fiscal de recibos. **Revisão:** demonstrar fluxos completos com registros fictícios; revisão técnica do diff, Review de negócio e revisão visual; usuário decide prontidão de cada tela. Pacote de publicação, domínio/HTTPS e banco para rede permanecem em planejamento de infraestrutura separado.

## Pendências e riscos consolidados

| Pendência | Recomendação | Quando resolver |
| --- | --- | --- |
| Semântica brand_name | Decidida: nome de apresentação configurável; company_name identifica a empresa; preservar ambos sem derivação | Registrada no SB-02.1 |
| Paths e id novo home | Direção aprovada: `/`, `/entrar`, `/app#home`; compatibilidade preservada, testes funcionais ainda necessários | SB-03 |
| Logout com falha rede | Limpar apresentação privada e comunicar revogação não confirmada | Review SB-03 |
| Hosting ainda não escolhido | Validar fallback futuramente; nenhuma promessa de publicação | Antes de disponibilização externa |
| Comercial/homologação | Aprovar cada módulo e texto; não usar status “disponível” para incompleto | Antes de SB-04 |
| Empresa global única | Mostrar identificação ativa; não selector multitenant | SB-04 |
| Home ControlMax sem nova comprovação | Usar organização funcional do briefing; pedir print somente se fidelidade adicional depender dele | Revisão C |
| Datas e scroll | DateField brasileiro com mesmos ISO e regras; orientação quando overflow, sem colunas omitidas | SB-05 |
| CSS redundante e contraste móvel | Consolidar por componente, com capturas e estados | SB-02/05/06 |
| Financeiro visível no menu do operador | Derivar visibilidade do guard atual; backend continua autoridade | SB-03 |
| Prints React + HTML backend | Inventário completo e diff só de apresentação | SB-05/06 |
| Marca comercial registrada | LEIA-ME informa validação marcária pendente; não impede estudo visual | Antes da exploração comercial |
| Fonte local de protótipo | Conferir versão/licença/pesos e distribuição web de produção | SB-02 |

## Procedimento comum de Scrum e aprovação

Planning de cada sprint: selecionar subentrega pequena e baseline. Desenvolvimento após autorização: preservar contrato e produzir diff revisável. Review: mostrar antes/depois desktop/tablet/mobile, evidências de testes exigidos e problemas conhecidos. Revisão de negócio: operador responsável valida os fluxos, especialmente financeiros. Aprovação explícita registra entrega aceita; não presumir aprovação porque testes passaram. Retrospectiva ajusta itens seguintes. Deploy ou mudança de infraestrutura exige autorização separada.

O SB-01 entrega decisões e estudos. Não inicia qualquer subentrega acima.
