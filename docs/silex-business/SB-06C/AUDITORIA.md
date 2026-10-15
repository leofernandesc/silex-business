# SB-06C — auditoria e decisão de escopo

Baseline aprovado: `c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f`. Checkout limpo, sem remotos; branch criada diretamente desse commit: `feat/sb06c-accessibility`. Backup integral dos 329 arquivos versionados antes de alterar produção, com SHA-256 dos três arquivos do banco persistente, que não é consultado pelos testes. Fontes, documentação e evidências dos SB-02.3, SB-05 e SB-06A/B foram consultadas.

## Método e critérios

Varredura em Firefox instalado, builds isolados e fixture fictícia idêntica; 23 rotas operacionais, Início, login e página pública. Medições de CSS computado em 1440, 768 e 375, mais layout inicial em 320 px; diálogos de cadastro existentes e amostras de hover/foco por classe de controle. Medição de foco por script serve à auditoria de estilo; os testes específicos de teclado usam Tab/Shift+Tab reais. Os resultados completos e as tentativas ficam locais, sem reescrever evidências antigas.

- [1.4.3 — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4,5:1; texto grande, 3:1 (24 px normal ou 18,667 px e peso pelo menos 700). Não arredondar uma razão inferior para aprovação.
- [1.4.11 — contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): 3:1 para informação necessária à identificação do controle/estado. Não exigir borda de botão quando texto/ícone já o identifica; bordas decorativas de cartões/tabelas não são controles. Componentes desabilitados e aparência nativa não modificada têm exceções aplicáveis. Não são tratados como falhas só pela aparência atenuada.
- [2.5.8 — alvo mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24 × 24 CSS px ou exceções pertinentes. O script calcula retângulos e colisão do círculo de 24 px para alvos pequenos; radio/checkbox também exigem avaliação do label acionável. Não classificar todo botão abaixo de 44 px como violação. 44 px é meta de conforto para toque, adotada somente em famílias de maior risco.
- Fundos transparentes são compostos com os ancestrais. Gradientes/opacity recebem marca de incerteza para revisão, sem falsa aprovação automática. SVGs de marca são identidade e não texto operacional. Gráficos financeiros já possuem alternativa textual, mas os estados efetivamente renderizados precisam ser conferidos.

## Achados iniciais demonstrados antes de corrigir

| Família | Medição inicial | Gravidade / decisão |
| --- | --- | --- |
| Texto legado `--muted`, ajuda, metadata, paginação | 3,71–4,02:1 | Média; usar texto secundário aprovado em superfícies claras |
| `login-note` | 2,83:1 | Média; mesmo token de texto secundário |
| Cabeçalhos de tabela legados | 3,80:1 | Média; correção compartilhada em tabelas operacionais |
| `.empty` e descendentes | 2,81–4,27:1 | Média; token legível, sem mudar mensagem |
| Badges neutros/product/sale/operator e service/admin | 4,12 / 4,26:1 | Média; variantes semânticas acessíveis, conservar textos e distinção |
| `.tile-stock` / `.tile-add` no PDV | 3,69 / 4,43:1 | Média; texto/ação legíveis, sem tocar no handler |
| Campos legados e wrapper de busca | Borda ~1,42:1 | Média; token existente de borda de controle, manter bordas decorativas claras |
| Ícones de tabela/paginação/fechar diálogo | 30–34 px; maioria supera 24 px | Baixa/usabilidade; aumentar famílias delimitadas, sem alargar todas as linhas do ERP indiscriminadamente |
| Checkbox/radio pequenos | 14–16 px, sem colisões na amostra | Não declarar falha pelo tamanho visual isolado; verificar labels/espaçamento |

## Decisão técnica

É possível avançar com seletores compartilhados delimitados, sem mudança arquitetural, bibliotecas ou edição individual de dezenas de telas. Produção será limitada a CSS sob `@media screen`, com escopo `.app-shell`/`.login-page` (e diálogos operacionais), mais variantes de tokens exclusivamente semânticas. Não alterar valores institucionais, estilos de impressão, componentes React, handlers, rotas ou contratos. A página pública será auditada e terá regressão coberta; não receberá ajustes incidentais.

P09: preservar controles densos desktop que atendem mínimo/espaçamento; ampliar ações compactas para pelo menos 36 px e 44 px em celular, incluindo fechar/modal, paginação e ações de linha; menu móvel e botões principais de formulário também serão medidos. Todas as colunas e controles permanecem. Se a medição demonstrar efeito adverso, restringir o seletor antes da entrega.

O encerramento de P04/P09 depende das matrizes finais. Estados não alcançados, fundos com incerteza e controles nativos não devem ser apresentados como homologados globalmente. P05 parcial, P07 pendente, V01 e T01 em acompanhamento; zoom nativo e leitor de tela real não são substituídos por automação.
