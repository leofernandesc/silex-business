# SB-07E — matrizes de acessibilidade e responsividade

## Estados observados

| Família / pendência | Evidência atual | Limite |
|---|---|---|
| Modal P01 | Fluxos Clientes, Pagar/Receber, OFX, venda, cadastros financeiros/usuário/serviço; Escape/async/navegação/retorno; calendário integrado | Não recontamos todas as23 instâncias equivalentes nem repetimos51 unitários de foco fora da suíte existente; sem leitor real |
| Busca P02 / ação P06 | Pagar/Receber foco Tab/Enter e hierarquia; família financeira49 | Sem mudança em handlers/cores/ações |
| Menu P03 / autorização P08 | Navegação, Home/perfis, header5, zoom14; bloqueios401/403 reais | Não é auditoria exaustiva de autorização por objeto |
| Contraste P04 | Testes de texto/bordas/placeholder/badges/hover/foco e banner em8rotas | Recorte de critérios auditados; gradiente e demais combinações não certificados globalmente |
| Alvos P09 | Ações, fechar/paginação/rolagem medidos; testes incluem320 | Não pressupõe44px universal; toque físico pendente |
| Datas P05 | Firefox18/Chromium7, en-US e pt-BR, ISO e erros; navegação por segmentos/calendário/Modal | Entrada técnica corrigida; CSV/print/humano/assistivo parciais |
| R02/C01/V02 | Header5, indicadores Lançamentos/Pagar/Receber/Dashboard com valores/texto ampliado e matriz normal | Não modifica componentes nem equivale a qualquer valor financeiro ilimitado |
| C02 | Home/Visão Geral normal e texto200; extremos256/187 e zoom nativo; matriz histórica336 preservada | Pan interno de números em extremos fica documentado; sem reabrir R02 por conteúdo próprio |
| Gráficos | Dashboard e alternativa tabular/legendas preservados no teste de apresentação | Leitura real da alternativa por usuário assistivo pendente |

## Responsividade medida

| Largura CSS | Cobertura | Resultado da coleta atual |
|---|---|---|
|1440|26 superfícies + texto200 nas5priorizadas|Documento=viewport |
|1024|26 superfícies|Documento=viewport |
|768|26 superfícies + texto200 nas5priorizadas|Documento=viewport |
|375|26 superfícies + texto200 nas5priorizadas, datas/modal|Documento=viewport |
|320|26 superfícies + texto200 nas5priorizadas, calendários, header/menu|Documento=viewport |
|256/187|Home/Visão Geral/Lançamentos, texto normal; testes adicionais header|Documento contido; robustez adicional, não ensaio normativo completo |

`surfaces.json` detalha por rota: cabeçalhos, campos, ações, tabelas, fonte, viewport/documento, elemento responsável caso haja excesso, e ancestrais de rolagem. Não há excesso novo de documento na amostra. Tabelas/gráfico largo têm rolagem interna; a existência de linhas/colunas fora da viewport dentro de região rolável não é automaticamente transbordamento do documento. O inventário não homologa todas as combinações de dados reais.

## Zoom nativo real

Firefox155 em displayX11 privado1071; janela ajustada a1280CSS e atalhos Control+plus reais.200%=640CSS/DPR2,400%=320CSS/DPR4,CSSzoom1. Sete cenários por escala: Home/menu, Visão Geral, tabelaClientes, modalCliente, calendárioServiços, tabelaLançamentos e relatório mensal.14 estados sem excesso horizontal. Escape e retorno de foco foram verificados; calendário selecionado por setas/Enter e reaberto por teclado. O diagnósticoXTest confirma também clique real no botão em ambas escalas, apesar da limitação do clique Playwright.

Altura reduzida em400 (226CSSpx) exige rolagem vertical de Modal/calendário: nem todo conteúdo cabe simultaneamente. Registrar isso junto às capturas; não apresentar screenshot parcial como conteúdo permanentemente perdido ou homologação integral. Texto computado200 é um ensaio separado do zoom real.

## Referências e homologação pendente

WCAG2.2AA é referência técnica. [Entendimento W3C de1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): largura320CSS para conteúdo de rolagem vertical; exceções limitadas a partes que exigem duas dimensões.187/256 de largura são robustez adicional. [Entendimento W3C de2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): alvo24CSS e exceções aplicáveis;44px é meta de toque, não exigência universalAA.

Nenhuma aprovação globalWCAG é emitida. Homologação com leitores reais, participantes brasileiros e dispositivos físicos continua pendente, conforme roteiro. Zoom real foi realizado apenas no Firefox instalado e no conjunto explicitado; não extrapolar a todo SO/navegador/controle.
