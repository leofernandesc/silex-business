# Pendências da Silex Business

Registro central a partir do SB-03. A origem detalhada permanece no [relatório histórico SB-02.3](SB-02.3/PROBLEMAS.md), que não foi alterado. Aprovar um incremento não autoriza corrigir todos os itens desta lista.

| ID | Descrição | Gravidade | Estado atual | Incremento proposto | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| P01 | Modal operacional não retorna foco ao acionador após Escape | Média | **Corrigida e validada no recorte automatizado SB-06B** | SB-06B aprovado; preservado no SB-06E | 51 testes de componente + 21 fluxos; retorno/fallback imediato e tardio, teclado, async e navegação. Leitor real e zoom nativo nos modais não homologados integralmente |
| P02 | Busca de Pagar/Receber sem marcador de foco | Média | **Corrigida e validada em Pagar/Receber no SB-05.2** | SB-05.2 | Wrapper/controle com foco visível e contraste adequado nas três larguras, sem alterar busca/Enter |
| P03 | Menu móvel abre sem transferência de foco e permite sair para conteúdo encoberto | Média | **Corrigida e validada no SB-03** | SB-03 | Inicial no Fechar menu, Tab/Shift+Tab contidos, submenus acionáveis, Escape/fechar/backdrop devolvem foco; painel fechado inert; desktop sem contenção |
| P04 | Contrastes legados em textos, bordas e controles | Média | **Corrigida e validada no recorte auditado SB-06C** | SB-06C aprovado; preservado no SB-06E | Textos, placeholders, badges, campos, estados e banner corrigidos; matriz medida. Não equivale a conformidade WCAG global |
| P05 | Apresentação brasileira das datas | Média | **Parcial no ERP; entrada civil/mensal corrigida e validada tecnicamente no SB-07C**. Todos os 20 controles civis declarados e dois mensais migrados; CSV/impressão mantêm contratos anteriores, em parte ISO | Revisão separada de saídas e homologação humana/assistiva | dd/mm/aaaa e MM/AAAA independentes do locale, ISO intacto; teclado/calendário/validação e fluxos preservados |
| P06 | Nova despesa primária; protótipo aprovado prevê secundária/neutra | Baixa | Corrigida em Lançamentos (SB-05.1) e Pagar (SB-05.2); Nova receita primária e ações danger preservadas | Outras ações/módulos, a examinar em escopo autorizado | Hierarquia neutra, criação preservada, estorno mantém semântica distinta |
| P07 | Repetição de seletores e consumo parcial de tokens | Baixa | **Parcial — piloto de metadados de indicadores no SB-06D.2; demais famílias pendentes** | Outra família, sob autorização própria | Diff pequeno, tokens definidos, comparações sem regressão; sem limpeza global incidental |
| P08 | Grupo/atalhos financeiros incoerentes com permissão do operador | Média | **Corrigida e validada no SB-03** | SB-03 | Menu e guard usam registro único; operador não vê financeiro/admin; todos os destinos restritos negados; backend responde 403 e impede mutação |
| P09 | Controles densos e áreas de acionamento | Baixa | **Corrigida e validada nas famílias priorizadas no SB-06C** | SB-06C aprovado; preservado no SB-06E | Alvos medidos, ações compactas 36 px/44 px móvel; demais controles avaliados por 24 px/espaçamento/exceções, sem exigir 44 px universal |
| C02 | Conteúdo extenso em Home/Visão Geral e ampliação | Média | **Corrigida no escopo validado SB-07D** | Revisão SB-07D | Sete larguras, nomes/descrições íntegros, valores completos e documento contido; em 256/187 com texto ampliado, pan local acessível dos indicadores explicitado |

P03/P08: evidências e critérios em [SB-03](SB-03/RELATORIO.md) e [matriz de testes](SB-03/TESTES.md). A validação de ARIA por DOM/teclado não equivale a homologação com leitor de tela real.

R01, contraste do contorno de foco, foi corrigida e validada no SB-02.3 e permanece preservada. A identidade empresarial continua separada da marca fixa do produto. Multitenancy não existe nos contratos atuais e não é adicionado por esta lista.

## SB-05 — etapa 1

Escopo exclusivo Lançamentos. P02 original está em Pagar/Receber e não foi encerrada. P05 tem conferência brasileira aditiva sem substituir os inputs nativos ou alterar regras; permanece parcial. P06 é neutra em Lançamentos e ainda não mudou em Pagar. Evidências finais e limites em [TESTES-ETAPA1.md](SB-05/TESTES-ETAPA1.md). Nenhuma outra pendência foi corrigida incidentalmente.

## SB-05.2

P02 corrigida e validada nas duas telas/1440/768/375: Tab leva à busca, contorno 2 px/offset 3 px azul médio no wrapper, busca/Enter/filtros preservados. P05 continua parcial: descrições brasileiras em filtros/cadastro, campos nativos e impressão backend preservados. P06 agora neutra em Pagar; Receber mantém Nova receita primária. P01/P04/P07/P09 seguem pendentes, sem correção incidental. Evidências e limites em [SB-05.2/TESTES.md](SB-05.2/TESTES.md).

### Observação V01 — atalho do Dashboard em tablet

Falha intermitente do clique Abrir livro caixa observada em testes: primeira regressão 131/132 aprovados, repetição candidata 4/5; baseline 5/5 e 10/10 em dados equivalentes. Rodada final 132/132 com clique original. Origem não comprovada; nenhuma correção de navegação implementada. Manter evidência e investigar em escopo próprio se houver reprodução, conforme [TESTES.md](SB-05.2/TESTES.md).

### R02 — Reflow do cabeçalho global em zoom elevado

**Corrigida e validada no recorte do cabeçalho SB-06A, preservada no SB-06E. Zoom nativo Firefox 200/400 verificado no recorte SB-06E; demais agentes/leitor permanecem sem homologação.** A origem histórica está no [ajuste de legibilidade](SB-05.2/AJUSTE-LEGIBILIDADE.md) e nas evidências SB-05.4: documento 325 px em viewport 320 e 252 px em 187. Não se equipara a antiga simulação de largura a um ensaio de zoom real.

A causa era o conjunto flex sem quebra, mínimos automáticos e breadcrumb em linha única. O CSS local ao shell permite redistribuição/altura automática, quebra de textos e limite do painel móvel. Em Lançamentos: documento 325→320 e 252→187; nas 24 telas × sete larguras, o cabeçalho não excede sua caixa nem sobrepõe os grupos. Nomes sintéticos longos, administrador/operador, teclado, menu P03 e autorização P08 foram validados. Fontes computadas do header/menu foram duplicadas em teste próprio, além do ensaio de raiz a 200%. Na execução histórica do SB-06A, a tentativa de zoom nativo não demonstrou alteração confiável de viewport/DPR; naquele momento, 200/400% não foram homologados. O SB-06E acrescenta evidência real específica descrita abaixo, sem declarar conformidade WCAG completa. [Diagnóstico, testes e limites](SB-06A/RELATORIO.md).

Limites independentes, anteriores e fora do escopo: conteúdo da Visão Geral chega a documento 220 px em 187; Home com identificação sintética longa (especialmente a saudação com palavra extensa no nome do usuário) chega a 281 px em 256/187. O header cabe nesses casos. Não corrigidos. O tratamento de P01 está registrado na seção SB-06B abaixo.

### Auditoria SB-05.3A — limitações funcionais preexistentes da Conciliação

Upload OFX usa fetch direto e não emite o evento global de expiração em 401; o backend mantém bloqueio de autorização. Contas/histórico/sugestões não exibem seus erros de consulta em Notice próprio; Ignorar possui handler assíncrono fora de Form. Revisão dessas situações depende de escopo funcional/autenticação aprovado. Sem mudanças nos handlers nesta etapa. [Auditoria](SB-05.3A/AUDITORIA.md).

### SB-05.3A — apresentação da Conciliação e acompanhamento

Datas da tabela e do diálogo já usam dateOnly/dd/mm/aaaa sem conversão por fuso; nenhum editor de data existe na Conciliação. P05 permanece **parcial** no ERP. P02/P03/P06/P08 são preservadas e cobertas pelos testes de regressão; não há nova correção global. P01/P04/P07/P09 continuam abertas.

V01: verificações direcionadas fizeram 60 cliques reais em Abrir livro caixa (30 baseline, 30 candidata; dez por largura em cada versão), todos aprovados. Não encerra a observação nem comprova a causa anterior. Navegação inalterada.

R02: em 187 px CSS, documento de 252 px em ambas as versões. A Conciliação candidata mede 163 px com scrollWidth 163 px; seu painel mede 161/161 px, sem contribuição adicional. Zoom CSS a 200% também conservou o mesmo overflow global anterior. Shell preservado e pendência aberta; não há conformidade completa de reflow. [Relatório e evidências](SB-05.3A/RELATORIO.md).

### SB-05.3B — Dashboard Financeiro

P05 permanece **parcial**: De/Até preservam ISO/inputs nativos/handlers e recebem conferência dd/mm/aaaa; a apresentação nativa ainda depende do navegador. P01 permanece aberta: Dashboard não possui modal próprio e os demais modais não foram alterados. P04 continua globalmente aberta; o recorte textual do Dashboard foi melhorado com tokens, sem mudar estilos compartilhados. P07 permanece aberta, com CSS novo restrito ao Dashboard, sem reorganização global. P09 permanece aberta nos demais controles; campos/botões do Dashboard têm altura mínima de 44 px.

P02/P03/P06/P08 preservadas nas regressões. V01: 60/60 cliques reais em Abrir livro caixa (30 por versão, dez por largura) com sessão válida/dados/fontes carregados, destino e eventos registrados. **Não encerrada**; a bateria não comprova a causa histórica nem cobre todas as condições de corrida durante carregamento.

R02: no Dashboard a 187 px CSS, documento de 252 tanto no baseline quanto na candidata; raiz candidata de 163/163 px. Zoom CSS a 200% no celular: documento de 584 em ambas, raiz candidata de 164/164 px. Sem overflow adicional do Dashboard; shell não corrigido e sem conformidade integral de reflow.

#### V02 — Indicadores de Lançamentos com valores elevados

Preexistente, gravidade média, descoberta pela fixture ampliada do SB-05.3B. Em 375 px, entradas/saídas/saldo de Lançamentos permaneciam em duas colunas e excediam os cartões com valores elevados. O histórico do SB-05.3B registrou documento de 401 px e duas falhas herdadas P05 (pt-BR/en-US) somente na asserção final de overflow. Consulte [SB-05.3B/TESTES.md](SB-05.3B/TESTES.md). **Status atual: corrigida e validada no SB-05.4.**

No SB-05.4, os indicadores passam a uma coluna em larguras móveis, e a tipografia preserva os valores inteiros sem quebra. Em 375 px, o documento mudou de 401 para 375 px; os dois testes P05 originais passaram sem alteração das asserções. Valores sintéticos também foram conferidos em 1440, 768, 375, 320 e reflow de 187 px CSS, além de texto ampliado a 200%. Aos 320 px, sobra um excesso de 5 px no cabeçalho global (`.topbar-right`, x=258–325); aos 187 px, o documento mede 252 px pelo cabeçalho global e a tela Lançamentos conserva excesso local de 4 px fora dos cartões. O grupo de indicadores não contribui para esses excessos; R02 permanece aberta e o shell não foi alterado. Detalhes em [SB-05.4/RELATORIO.md](SB-05.4/RELATORIO.md).

Limitação anterior do Dashboard: useLoad mantém os dados durante recarga e substitui por null em erro; cartões então mostram o fallback zero, acompanhado de Notice. Novo status de carregamento não altera esse comportamento nem transforma erro em confirmação de ausência de movimentos. Eventual revisão desses placeholders deve ser aprovada separadamente.

### SB-06B — P01: gerenciamento e retorno de foco dos modais

Causa: limpeza passiva chamava close() após desconexão do dialog. Correção central em useModalFocus/useLayoutEffect, com restauração validada após o commit e acompanhamento somente enquanto o acionador conserva foco, cobrindo remoção assíncrona posterior. Não altera handlers, props, CSS, backend ou navegação. Inventário: 23 instâncias em dez arquivos; o histórico de 42 era 14 verificações × três larguras. Varredura atual: 0/45 → 45/45 retornos. Componente 51/51 e fluxos reais 21/21 em 1440/768/375; frontend 71/71, backend 69/69. [Relatório e limites](SB-06B/RELATORIO.md).

P02/P03/P06/P08/V02 e R02 preservadas. P04/P07/P09 continuam pendentes; P05 parcial; V01 em acompanhamento. Home/Visão Geral conservam excessos independentes em larguras extremas já descritos em R02. Leitor de tela real e zoom nativo não homologados.

#### T01 — timeout networkidle no teste público móvel

Regressão ampla: 248/249; uma espera em public.spec.ts:173 expirou após recarregar a página pública, já renderizada. Cenário não abre modais; nenhuma mudança na página/roteamento/autenticação ou asserções. Diagnóstico do mesmo teste sem alterar asserções, três execuções por versão: baseline 3/3, candidata 3/3 aprovadas. A falha original não foi reproduzida no baseline; sua causa permanece não comprovada, em acompanhamento. Não confundir com V01 nem declarar resolução por associação.

### SB-06C — P04 e P09: contraste e controles

P04: correções em CSS screen para texto secundário legado, ajuda/metadata, cabeçalhos e vazios, nota do login, badges semânticos, textos do PDV, placeholders e bordas de campos. A composição de color(srgb … / alpha) dos placeholders foi corrigida no instrumento e na apresentação. O parágrafo do banner da Visão Geral passa a branco para preservar contraste junto ao ícone decorativo sobre o gradiente. Identidade oficial e semântica financeira permanecem. Matrizes, estados e limites em [SB-06C](SB-06C/RELATORIO.md). Não há declaração de conformidade WCAG completa; amostragem de gradiente não substitui certificação pixel a pixel ou leitor de tela real.

P09: ações de linha, paginação, fechar diálogo e remoção de item têm mínimo 36 px no desktop e 44 px no celular. Menu móvel/grupos e ações principais de formulário recebem alvos delimitados de 44 px. As tabelas mantêm todas as colunas e ações; seletores e checkbox/radio densos não são classificados como falha só por serem menores que 44 px. Labels/espaçamento e exceções de 24 px estão documentados. Toque físico e popups nativos não foram homologados globalmente.

P01/P02/P03/P06/P08/V02/R02 têm regressões específicas. P05 permanece parcial e P07 pendente. V01 continua em acompanhamento, mesmo com 60/60 novos cliques dirigidos aprovados; T01 continua em acompanhamento mesmo com 21/21 testes públicos aprovados. Nenhuma alteração de roteamento por suspeita.

Texto computado a 200% continua revelando excessos independentes preexistentes no conteúdo da Visão Geral e em alguns filtros/formulários, com valores equivalentes antes/depois; também permanecem os limites de Home/Visão Geral em larguras extremas descritos em R02. O cabeçalho não recebeu redesenho e esses excessos não foram escondidos com overflow-x:hidden. Zoom nativo não homologado.


### SB-06D.1 — P05 parcial e auditoria P07

P05 permanece **parcial**. Datas civis textuais válidas mantêm dd/mm/aaaa sem parser de fuso; inválidas/vazias recebem travessão. Timestamps válidos conservam America/Manaus; inválidos não interrompem a renderização. Os agrupamentos mensais confirmados de quatro relatórios usam MM/AAAA, preservando classificações, ordem, consultas e valores. Campos date/month, ISO, handlers e limites permanecem originais. Impressão/CSV backend e tooltip mensal legado conservam suas apresentações anteriores. [Inventário e matriz](SB-06D.1/DATAS.md), [alternativas de controles nativos](SB-06D.1/INPUTS-NATIVOS.md).

Riscos preexistentes separados: quickPeriod em Pagar/Receber usa calendário do host, enquanto outros atalhos são ancorados em Manaus; timestamps sem offset continuam sujeitos ao parser histórico; heurística de prefixo ISO em texto livre de relatório merece revisão por schema. Esses pontos não foram corrigidos alterando filtros, serialização ou regras financeiras.

P07 permanece **pendente, com plano proposto para aprovação**: 999 regras CSS, 76 grupos de seletores repetidos com declarações diferentes; classificação A/B/C e migração por componente. Nenhum dos oito arquivos CSS foi modificado. [Auditoria e plano SB-06D.2](SB-06D.1/CSS-AUDITORIA.md). SB-06D.2 não iniciado.

Suplemento documental: a imagem baseline-home-375 do SB-06C mostrava login ainda Salvando; o coletor aceitava título do login como sinal de prontidão. Não se comprovou perda de sessão. Comparação suplementar da Home autenticada aguarda URL/título/sessão e mantém os arquivos/ZIP históricos intactos. [Diagnóstico](SB-06D.1/HOME-SUPLEMENTO.md).

P01/P02/P03/P04/P06/P08/P09/V02/R02 mantêm seus estados comprovados no recorte correspondente. V01 e T01 continuam em acompanhamento; testes dirigidos aprovados não comprovam a causa histórica. Excessos independentes de conteúdo em Home/Visão Geral, outros excessos preexistentes com fontes duplicadas, zoom nativo e leitor de tela real continuam documentados; não há declaração de conformidade integral ou prontidão de produção.


### SB-06D.2 — P07: matriz executável e um piloto

Fase A: 201 estados pareados, 71 propriedades por elemento, 581.135 propriedades de estilo e geometria/estados comparados; ordem CSS em dez percursos reais. Fase B: somente metadados span/small dos indicadores de Lançamentos em ledger.css. Duas declarações idênticas de font-size passam a uma regra comum, mantendo line-height específico, seletores/especificidade/contextos e seus rastros ordenados de declaração. Nenhuma aparência nova; 68 pares de capturas principais idênticos. [Decisão do piloto](SB-06D.2/PILOTO.md), [matriz](SB-06D.2/MATRIZ.md).

P07 permanece **parcial**, sem consolidação global. :root, body, shell, formulários/tabelas/Modal compartilhados, tokens/importações, público e impressão não foram reorganizados. As 24 regras print permanecem iguais. Famílias globais/print de risco C e demais componentes B ficam adiados para autorização própria; não existe autorização automática para outra família ou SB-06E.

P05 continua **parcial e inalterada**: formatos ISO, controles nativos, CSV, impressão e regras de data não mudam. O suplemento dos relatórios corrige somente o coletor: a captura histórica candidate-result-monthly-1440 estava carregando; a espera atual valida resposta, slug, título e células. As imagens/ZIP antigos permanecem intactos. [Suplemento](SB-06D.2/SUPLEMENTO-RELATORIOS.md).

V01 e T01 continuam em acompanhamento; resultados dirigidos e públicos constam do relatório de testes. Não houve alteração de navegação, autenticação ou asserções antigas para mascarar falhas. Os estados comprovados de P01/P02/P03/P04/P06/P08/P09/V02/R02 permanecem. Texto computado 200% conserva overflow independente de Lançamentos em 768 (documento 854) e 320 (348); não foi escondido. Limites anteriores de Home/Visão Geral, zoom nativo e leitor real continuam registrados. Sem declaração de conformidade global ou prontidão de produção.


Validação final SB-06D.2: 357 cenários candidatos e nove comparações baseline aprovados; 96 testes frontend e 69 backend por versão, tipos/build aprovados. Home: 12 pares complementares iguais. V01: 60/60 destinos corretos com sessão/carregamento conferidos, sem pageerror ou falha de rede observados; continua em acompanhamento. T01: 21/21 casos públicos aprovados, sem encerrar a observação histórica. Restauração dos 374 arquivos aprovada; P07 não foi marcada como integralmente resolvida.


### SB-06E — validação integrada e decisão de homologação

**Nenhum arquivo de produção alterado.** 357/357 E2E (285 integrados + 72 modais em fixture separada), 96/96 frontend, 69/69 backend, tipos/build aprovados; zero retries/skips. 26 superfícies × 5 larguras normais sem overflow. 35 JSON/30 exportações/impressões equivalentes e 17 checkpoints financeiros reais iguais. Backup/restauração e hashes preservam os 395 arquivos aprovados; evidências anteriores não sobrescritas. [Relatório consolidado](SB-06E/RELATORIO.md), [riscos](SB-06E/RISCOS.md), [roteiro manual](SB-06E/HOMOLOGACAO-MANUAL.md).

P01/P02/P03/P04/P06/P08/P09/V02/R02 preservam seus **limites de validação**, não significam acessibilidade global. Modal continua 23 instâncias; teclado/async/fallbacks e formulários foram revalidados. O teste nativo Firefox em janela privada usou atalhos X11 reais: 1280 → 640/320 CSS px, DPR 2/4, CSS zoom 1, 16 estados em oito superfícies; documento=viewport em todos, menu Home Enter/Escape/foco preservado. Leitor real segue **não executado** (Orca instalado, inativo). Outros agentes/teclados de calendários nativos/toque/drivers ainda dependem de homologação.

**P05 parcial**, agora com gravidade média no risco de interpretação: input nativo Firefox ptBR exibe 03/04/2026 para ISO 2026-03-04. Pagar possui conferência “Data: 04/03/2026”; Serviços não possui descrição equivalente. Não há envio ISO incorreto comprovado, mas a divergência não deve ser tratada automaticamente como cosmética. Inputs/handlers/CSV/print/contratos permanecem intactos. Recomenda-se autorização separada para conferência brasileira nos campos faltantes e teste humano, sem criar editor customizado incidentalmente.

**P07 parcial:** nenhum CSS alterado; preservar a cascata aprovada e o piloto mínimo. Não se recomenda refatoração global sem necessidade concreta.

**V01 em acompanhamento:** 90/90 cliques (baseline/candidata; 60 carregados + 30 respostas real retida apenas no instrumento, durante UI busy), destino/estado de sessão/eventos/console/rede registrados. **T01 em acompanhamento:** 21 testes originais e 15 sondas novas aprovadas com prontidão observável. Causas históricas continuam não identificadas; não encerrar pela amostra verde.

**C01 — conteúdo com fonte computada 200, independente do header/V02, risco alto de legibilidade:** Visão Geral 1477/1440,440/375,412/320; Lançamentos 854/768 por indicadores e 348/320 pelo título; Pagar/Receber 850/768 por texto nowrap dos valores. Range de texto/scrollWidth confirmam a causa, não só a borda. Pesquisar segue alcançável por Tab nas amostras. Fonte computada200 não equivale a zoom nativo; o ensaio real 200/400 passa no recorte documentado. Solicitar autorização própria antes de corrigir conteúdo, mantendo números/ações completos.

**C02 — robustez adicional de conteúdo, média:** Home com nome sintético não separável produz documento 281 em 256/187, igual ao baseline; Visão Geral 222 em 187. Header cabe. 187 não é a referência normativa 320 de reflow. Não corrigido, não escondido por overflow-x:hidden.

Riscos comerciais/operacionais separados: configuração empresarial global sem tenant/assinaturas; cookie atual Secure=false emHTTP local; hospedagem/TLS/recuperação operacional/segurança externa sem homologação; impressões/documentação legadas com Gestão e datasISO. Não houve deploy, push, merge, nova funcionalidade ou alteração de autorização. **Apto para revisão final do rebranding e homologação controlada com dados fictícios/ressalvas; lançamento comercial não comprovado.** Nenhuma próxima implementação autorizada automaticamente.


### SB-07A — correções pontuais pós-validação

**C01 corrigida e validada no recorte autorizado:** grades de Visão Geral, Lançamentos e Pagar/Receber passam a responder ao tamanho do texto; título de Lançamentos pode quebrar. Quatro telas × quatro larguras, normal/texto computado 200%, com valores e fontes iguais ao baseline. Exemplos: documento 1477→1440 na Visão Geral desktop, 440→375 no móvel; Lançamentos 854→768 e 348→320; Pagar/Receber 850→768. Números completos, sem quebra interna, truncamento ou redução de fonte. Oito pares de capturas normais idênticos. SummaryCard, regras, cálculos, filtros, exportações e contratos intactos.

**P05 corrigida nos três campos de Serviços, globalmente parcial:** Data do serviço, Vencimento e Competência recebem a legenda brasileira/aria-describedby do LedgerDateField existente. Mantidos controles nativos, required, handlers, ISO e persistência; criação/edição/reload e datas dos títulos foram conferidos em pt-BR/Manaus e en-US/Kiritimati. Não padroniza incidentalmente os demais campos/prints nem implementa editor customizado.

6 novos E2E e 15 regressões selecionadas aprovados, 96 unitários frontend, 3 backend direcionados, tipos/build/diff-check aprovados. 52 atributos de eventos iguais por AST. Comparações 35 JSON/30 exportações/impressões iguais antes das mutações descartáveis. Zoom nativo Firefox 200/400 real passou em 12 estados direcionados, incluindo formulário de Serviços. Não se declara homologação com leitor real/outros navegadores.

P07 permanece parcial, sem limpeza global. V01/T01 continuam em acompanhamento mesmo com os casos pertinentes aprovados; causas históricas não demonstradas. C02 da Home/Visão Geral em larguras adicionais permanece fora do escopo. Correções P01/P02/P03/P04/P06/P08/P09/V02/R02 conservam seus limites documentados; não houve nova declaração de conformidade global. Segurança de produção/multitenancy não implementadas. [Relatório e evidências](SB-07A/RELATORIO.md). Sem push, merge, deploy ou autorização comercial.


### SB-07B — preparação da homologação humana de datas

**P05 permanece parcial.** O roteiro e ambiente isolado estão preparados; nenhuma pessoa participou ainda. SB-07B não altera campos nem produção. Recontagem: 20 declarações `type=date` e duas `type=month`; o componente `Dates` em Vendas/Estoque resulta em 22 controles `date` em execução. Treze declarações já usam LedgerDateField; nove controles em execução não têm conferência explícita (sete declarações, incluindo os dois campos do componente `Dates`, cujos quatro usos aparecem em duas telas). Build, TypeScript, 36 testes unitários direcionados e três cenários E2E (preparo 1/1; regressão de Serviços 2/2 em pt-BR/en-US) passaram em Firefox 155.0 e banco temporário. O popup nativo e a compreensão humana não foram avaliados. Chrome/Chromium não disponível nesta máquina, não instalado; dispositivo físico não testado. C02 permanece aberta, P07 parcial, V01/T01 em acompanhamento e homologação com leitor real pendente. [Relatório SB-07B](SB-07B/RELATORIO.md), [roteiro do participante](SB-07B/ROTEIRO-USUARIO.md), [matriz P05](SB-07B/MATRIZ-DATAS.md).


### SB-07C — entrada brasileira de datas

Todos os 20 controles civis declarados e os dois mensais migraram para `SilexDatePicker`/`SilexMonthField`. React Aria Components 1.22.1, @internationalized/date 3.12.4, locale explícito pt-BR/calendário gregoriano. Datas civis usam CalendarDate, sem converter para timestamp. Estados/limites/obrigatoriedade e valores ISO preservados. Recontagem detalhada explicita 26 contextos civis nas rotas, incluindo reuso de Pagar/Receber e Vendas/Estoque; não são 26 declarações independentes.

**P05: entrada corrigida no escopo técnico; global parcial.** CSV/impressão ISO continuam preservados e fora do escopo; não houve homologação humana, leitor de tela real ou dispositivo físico. Três locales/três fusos e Firefox/Chromium foram verificados; seleção/limpeza, parcial/inválida, controles mensais, persistência e resultados financeiros comparados. Calendário dentro de Modal preserva P01; zoom nativo Firefox 200/400 e texto ampliado verificados no recorte. Ver [inventário](SB-07C/INVENTARIO-DATAS.md), [arquitetura](SB-07C/ARQUITETURA.md) e [testes](SB-07C/TESTES.md).

P07 permanece parcial. C02 fica aberta para SB-07D, sem correção incidental. V01/T01 continuam em acompanhamento: regressões de atalho/histórico e página pública executadas, sem encerramento das causas históricas. P01/P02/P03/P04/P06/P08/P09/V02/R02/C01 preservam seus limites anteriores. Não há declaração de conformidade WCAG integral, multitenancy ou prontidão comercial. Sem push, merge ou deploy.


### SB-07D — C02

**C02 corrigida nos cenários conhecidos e na matriz documentada.** A saudação da Home impunha mínimo de 269 px, produzindo documento 281 em 256/187 e 550 com texto 200%. Quebra de conteúdo e mínimos locais corrigem o caso, sem mudar nomes. A Visão Geral conserva os indicadores; em larguras adicionais, números maiores que o espaço disponível permanecem inteiros numa região rolável por Tab/setas, sem rolagem horizontal do documento ou redução de fonte. Textos/ações do banner e painéis refluem. Dez pares normais em 1440/1024/768/375/320 são idênticos; 336 estados/168 pares e zoom Firefox real 200/400 foram verificados. Isso não equivale a conformidade WCAG global.

P05 permanece exatamente no estado SB-07C: entradas civis/mensais corrigidas tecnicamente; CSV/impressão ISO e homologação humana/assistiva pendentes. P07 parcial, V01/T01 em acompanhamento. Leitor real e dispositivo físico continuam pendentes. P01/P02/P03/P04/P06/P08/P09/R02/C01/V02 preservam seus limites comprovados. Os três testes antigos de sessão expirada foram reconstruídos e passaram em SQLite descartável, sem mudar autenticação. Ver [relatório SB-07D](SB-07D/RELATORIO.md), [matriz](SB-07D/MATRIZ-REFLOW.md) e [testes](SB-07D/TESTES.md).
