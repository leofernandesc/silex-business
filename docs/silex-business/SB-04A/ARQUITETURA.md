# Arquitetura SB-04A

## Preparação

Consultados identidade, navegação e ajustes finais SB-01, protótipo A atualizado, relatórios SB-02.1/02.2/02.3, arquitetura/relatório/recomendações SB-03. React 19 + TypeScript + Vite + FastAPI mantidos. Inter, tokens e Brand reutilizados. Cinco SVGs oficiais vêm de Pictures/Silex_Business_SVG_Refinado; estudos A01/A02/A03 não foram usados.

Checkout novamente confirmado sem .git. Baseline antes de qualquer edição: 1.309 arquivos. Backup do frontend: 50 arquivos restaurados e verificados em cópia; checkpoint SB-03 também verificado. Build e 38 testes unitários do baseline passaram isoladamente. Nenhum repositório Git criado e nenhuma dependência instalada.

## Componentes

| Arquivo | Responsabilidade |
| --- | --- |
| Application.tsx | Limite entre superfície pública e App operacional; lazy/Suspense; escuta popstate/hashchange |
| navigation/surfaces.ts | Público somente em / sem hash operacional reconhecido; usa a allowlist existente |
| public/PublicPage.tsx | Composição A, seções semânticas, metadados públicos e recuperação de âncoras após montagem assíncrona |
| public/PublicHeader.tsx | Brand, links nativos, Entrar e disclosure móvel não modal com teclado/foco |
| public/ProductDemo.tsx | Demonstrações financeira e de Vendas exclusivamente estáticas |
| public/content.ts | Conteúdo comercial verificado e exemplos fictícios independentes de API/estado/storage |
| public/public.css | Estilos sob .silex-public e classes próprias, tokens oficiais; nenhum seletor global novo |
| main.tsx | Monta Application; mantém imports globais/tokens e StrictMode |

App.tsx inteiro permanece intacto. A nova página não substitui módulos, shell, formulários, indicadores ou dashboard. Não há nova biblioteca de UI, roteamento paralelo, analytics ou acesso a dados protegidos em componentes públicos.

## Rotas e sessão

| Endereço | Comportamento |
| --- | --- |
| / | Página comercial, guest ou sessão válida; sem auth/me, company-settings, dashboard ou listas privadas |
| /#modulos, /#demonstracao, /#beneficios | Âncoras nativas; histórico/refresh e rolagem sem interpretar seções como módulos |
| /#id-operacional | Compatibilidade SB-03; somente IDs registrados entram no App e normalizam /app#id ou /entrar |
| /#desconhecido | Continua público, sem conceder acesso |
| /entrar | Login existente; sessão válida segue destino permitido ou dashboard |
| /app#... | App existente, guard/permissões/backend preservados |
| /app#home | Continua indisponível; fallback/mensagem SB-03 preservados |

Entrar usa link nativo /entrar: mantém teclado, abrir em nova aba, histórico e o mecanismo atual de sessão. Logout continua em /entrar, inclusive saída com 401/falha de rede; não antecipamos mudança para home ou logout público.

Em useAppNavigation acrescentamos somente reconhecimento da superfície pública em resolveAddress, expire e changed. Isso impede que listeners operacionais reescrevam / ao retornar à página pública no mesmo documento, ou que resposta antiga force login ali. Endpoints, cookie, TTL, credenciais, retorno allowlisted, bloqueio de logout, 401/403 e autorização são os do SB-03. A política backend não foi alterada.

Não há decisão baseada na sessão para renderizar /: usuário autenticado também vê o mesmo conteúdo público. As chamadas feitas no teste para criar sessão válida são do harness, não da página. As demonstrações não usam fetch, api(), CompanySettings, User ou armazenamento.

## Menu, âncoras e acessibilidade

Desktop/tablet mostram links; até 700 px, disclosure não modal. DOM: marca → acionador → links → Entrar; fechado hidden, aberto aria-expanded/aria-controls. Tab chega aos links após abrir; segue para fora naturalmente. Escape dentro do cabeçalho fecha e retorna ao acionador. Seleção de seção fecha e foca o destino; mudança de breakpoint preserva foco visível. Não aplicamos dialog, inert ou trap de foco ao menu público.

Skip link, um h1, seções com h2 e cartões h3. SVGs decorativos não duplicam nomes acessíveis; links e botão têm nomes. Tabela de vendas tem caption, scope=col, cinco colunas, região focável e instrução de rolagem; nenhuma ação de demonstração executa operações. Sinais/textos distinguem entradas/saídas e rascunho/finalizada além da cor.

A região da tabela é positioned para conter textos acessíveis absolutos; o CTA pode quebrar de linha para reflow a 200%. Não mascaramos overflow da página com overflow-x:hidden. Sem animações; preferência por movimento reduzido respeitada. Leitor de tela real permanece uma homologação manual.

## SEO e desempenho

Título/description específicos na montagem pública; cleanup restaura os valores anteriores para App/login. Idioma pt-BR e index.html original preservados. Não há canonical, JSON-LD de organização, domínio, política jurídica ou razão social inventados.

O frontend continua CSR: o HTML inicial tem metadados genéricos e o título/description públicos são aplicados por JavaScript. Isso prepara fundamentos, sem prometer indexação equivalente a HTML prerenderizado. Avaliar prerender/SSR em escopo próprio se a estratégia de aquisição exigir, antes de publicação externa.

Público e App são chunks separados. Testes de rede devem confirmar que / não solicita o chunk operacional App nem APIs. Fontes locais/SVGs existentes; nenhum PNG substitui marca, nenhuma dependência nova. Fallback local FastAPI/Vite já existente; rewrites e origem permitida do hosting real devem ser homologados posteriormente.

## Diferenças pequenas do protótipo aprovado

- Removidos barra/rodapé do estudo e links entre protótipos; Entrar aponta ao login real.
- Mesmas posições hero financeiro, quatro cartões, segunda demonstração Vendas, benefícios e CTA; texto dos cartões detalha só recursos confirmados.
- Faixa secundária de Serviços e operações acrescenta prestadores/PIX e custos/pedidos confirmados, mantendo a grade de quatro cartões.
- Menu móvel possui disclosure e teclado; protótipo apenas ocultava links no celular.
- Fontes pequenas da demonstração aumentadas; rolagem descrita; ícones de ações são ilustração, sem botões falsos.
- Benefício final inclui acesso pelo navegador; rodapé usa marca oficial e navegação útil, sem dados comerciais inventados.

Não houve reorganização substancial das seções, paleta, símbolo ou composição do hero. SB-04B não foi iniciado.
