# Pendências da Silex Business

Registro central a partir do SB-03. A origem detalhada permanece no [relatório histórico SB-02.3](SB-02.3/PROBLEMAS.md), que não foi alterado. Aprovar um incremento não autoriza corrigir todos os itens desta lista.

| ID | Descrição | Gravidade | Estado atual | Incremento proposto | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| P01 | Modal operacional não retorna foco ao acionador após Escape | Média | **Corrigida e validada no recorte automatizado SB-06B** | SB-06B — Aguardando revisão | 51 testes de componente + 21 fluxos; retorno/fallback imediato e tardio, teclado, async e navegação. Leitor real/zoom nativo não homologados |
| P02 | Busca de Pagar/Receber sem marcador de foco | Média | **Corrigida e validada em Pagar/Receber no SB-05.2** | SB-05.2 | Wrapper/controle com foco visível e contraste adequado nas três larguras, sem alterar busca/Enter |
| P03 | Menu móvel abre sem transferência de foco e permite sair para conteúdo encoberto | Média | **Corrigida e validada no SB-03** | SB-03 | Inicial no Fechar menu, Tab/Shift+Tab contidos, submenus acionáveis, Escape/fechar/backdrop devolvem foco; painel fechado inert; desktop sem contenção |
| P04 | Contrastes legados em textos, bordas e controles | Média | **Corrigida e validada no recorte auditado SB-06C** | SB-06C — revisão | Textos, placeholders, badges, campos, estados e banner corrigidos; matriz medida. Não equivale a conformidade WCAG global |
| P05 | Datas nativas variam conforme locale do navegador | Baixa | Parcial em Lançamentos/Pagar/Receber: conferência dd/mm/aaaa e ISO preservados; editor nativo e print legado continuam limitados | Editor uniforme/templates e outras telas, a autorizar | Apresentar dd/mm/aaaa preservando valores ISO, bases e regras; testes de datas |
| P06 | Nova despesa primária; protótipo aprovado prevê secundária/neutra | Baixa | Corrigida em Lançamentos (SB-05.1) e Pagar (SB-05.2); Nova receita primária e ações danger preservadas | Outras ações/módulos, a examinar em escopo autorizado | Hierarquia neutra, criação preservada, estorno mantém semântica distinta |
| P07 | Repetição de seletores e consumo parcial de tokens | Baixa | Pendente | Migração por componente em SB-05/06 | Diff pequeno, tokens definidos, comparações sem regressão; sem limpeza global incidental |
| P08 | Grupo/atalhos financeiros incoerentes com permissão do operador | Média | **Corrigida e validada no SB-03** | SB-03 | Menu e guard usam registro único; operador não vê financeiro/admin; todos os destinos restritos negados; backend responde 403 e impede mutação |
| P09 | Controles densos e áreas de acionamento | Baixa | **Corrigida e validada nas famílias priorizadas no SB-06C** | SB-06C — revisão | Alvos medidos, ações compactas 36 px/44 px móvel; demais controles avaliados por 24 px/espaçamento/exceções, sem exigir 44 px universal |

P03/P08: evidências e critérios em [SB-03](SB-03/RELATORIO.md) e [matriz de testes](SB-03/TESTES.md). A validação de ARIA por DOM/teclado não equivale a homologação com leitor de tela real.

R01, contraste do contorno de foco, foi corrigida e validada no SB-02.3 e permanece preservada. A identidade empresarial continua separada da marca fixa do produto. Multitenancy não existe nos contratos atuais e não é adicionado por esta lista.

## SB-05 — etapa 1

Escopo exclusivo Lançamentos. P02 original está em Pagar/Receber e não foi encerrada. P05 tem conferência brasileira aditiva sem substituir os inputs nativos ou alterar regras; permanece parcial. P06 é neutra em Lançamentos e ainda não mudou em Pagar. Evidências finais e limites em [TESTES-ETAPA1.md](SB-05/TESTES-ETAPA1.md). Nenhuma outra pendência foi corrigida incidentalmente.

## SB-05.2

P02 corrigida e validada nas duas telas/1440/768/375: Tab leva à busca, contorno 2 px/offset 3 px azul médio no wrapper, busca/Enter/filtros preservados. P05 continua parcial: descrições brasileiras em filtros/cadastro, campos nativos e impressão backend preservados. P06 agora neutra em Pagar; Receber mantém Nova receita primária. P01/P04/P07/P09 seguem pendentes, sem correção incidental. Evidências e limites em [SB-05.2/TESTES.md](SB-05.2/TESTES.md).

### Observação V01 — atalho do Dashboard em tablet

Falha intermitente do clique Abrir livro caixa observada em testes: primeira regressão 131/132 aprovados, repetição candidata 4/5; baseline 5/5 e 10/10 em dados equivalentes. Rodada final 132/132 com clique original. Origem não comprovada; nenhuma correção de navegação implementada. Manter evidência e investigar em escopo próprio se houver reprodução, conforme [TESTES.md](SB-05.2/TESTES.md).

### R02 — Reflow do cabeçalho global em zoom elevado

**Corrigida e validada no SB-06A no recorte automatizado do cabeçalho; zoom nativo permanece não homologado.** A origem histórica está no [ajuste de legibilidade](SB-05.2/AJUSTE-LEGIBILIDADE.md) e nas evidências SB-05.4: documento 325 px em viewport 320 e 252 px em 187. Não se equipara a antiga simulação de largura a um ensaio de zoom real.

A causa era o conjunto flex sem quebra, mínimos automáticos e breadcrumb em linha única. O CSS local ao shell permite redistribuição/altura automática, quebra de textos e limite do painel móvel. Em Lançamentos: documento 325→320 e 252→187; nas 24 telas × sete larguras, o cabeçalho não excede sua caixa nem sobrepõe os grupos. Nomes sintéticos longos, administrador/operador, teclado, menu P03 e autorização P08 foram validados. Fontes computadas do header/menu foram duplicadas em teste próprio, além do ensaio de raiz a 200%. A tentativa de zoom nativo não demonstrou alteração confiável de viewport/DPR; 200/400% não foram homologados e não se declara conformidade WCAG completa. [Diagnóstico, testes e limites](SB-06A/RELATORIO.md).

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
