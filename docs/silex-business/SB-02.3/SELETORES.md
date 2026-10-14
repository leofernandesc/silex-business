# Seletores, componentes e tokens

O bloco acrescentado pelo SB-02.2 tinha 83 seletores. A correção adiciona duas exceções contextuais de foco, totalizando 85. 55 seletores do bloco repetem seletores anteriores. Todas as referências `--silex-*` utilizadas existem no arquivo central; nenhum ativo ou token foi modificado nesta validação.

| Grupo | Seletores / efeito | Componentes atingidos |
| --- | --- | --- |
| Tipografia/fundo | :root, body, button, input, select, textarea | As 23 telas e Login; títulos, corpo, campos, tabelas e controles por herança |
| Interação | button.primary/hover, :focus-visible, input/select/textarea:focus | AddButton, Form, Pagination, ExportButton, Fields e ações próprias de módulos |
| Shell | app-shell, sidebar/brand, workspace, nav-item, nav-group-toggle, finance-submenu, topbar, breadcrumb, footer | App.tsx e todas as telas autenticadas |
| Login/loading | loading-screen/logo, login-page/intro/card/decorations/mobile-brand | Login e preparação da sessão; sem alteração de autenticação |
| Piloto Clientes | .silex-customers-page + títulos, painel, toolbar, search, table-wrap, th/td, badge.active, pagination, dialog e backdrop | Customers/CustomerForm em catalog.tsx; UI compartilhada é preservada |
| Media queries do bloco | 900 px e 650 px | Orientação de rolagem de Clientes, dimensões da marca/menu/login; breakpoints globais anteriores continuam |

O inventário JSON lista cada seletor, media query, propriedade, token e arquivo que referencia suas classes. Seletores de tags e da raiz se aplicam globalmente mesmo sem classe textual nos componentes. O escopo do diálogo de Clientes depende do wrapper do piloto; os diálogos de outros módulos mantêm as bordas/elevação anteriores.

## Correção restrita

`:focus-visible` usa agora `--silex-brand-primary` em superfícies claras; `.sidebar button` e `.welcome-banner button` mantêm `--silex-brand-support`. A busca de Clientes usa o azul médio no contorno de seu wrapper. Larguras, offsets e handlers permanecem iguais.

## Organização futura

Recomenda-se migrar grupos por componente e remover duplicações somente após comparação de estilos calculados e estados. Cores `--muted`, paleta de indicadores e dimensões densas continuam parcialmente legadas. O token `--silex-focus-ring` não foi ligado indiscriminadamente ao CSS: o mesmo azul claro não atende ambos os fundos. Futuramente separar consumo por contexto claro/escuro, sem reinventar a paleta.

Fontes, SVGs, tokens centrais, Brand.tsx, ui.tsx e interfaces foram preservados. Esta auditoria não extraiu componentes nem reorganizou styles.css.
