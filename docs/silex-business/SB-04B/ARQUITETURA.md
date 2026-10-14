# Arquitetura — SB-04B

## Auditoria e baseline

Consultados relatórios SB-01–SB-04A, identidade, ajustes finais, dados de apresentação, arquitetura de navegação, auditoria, incrementos e pendências. Protótipo C aprovado foi inspecionado em HTML e imagem. React/TypeScript/Vite e backend FastAPI permanecem. Shell, Brand, Inter local, tokens, mecanismos P03/P08 e superfície pública já estavam disponíveis; não foram reconstruídos.

Checkout sem `.git`: não há branch/status Git verificável. Registrados 1.489 arquivos antes de editar; backup externo de 60 arquivos do frontend restaurado em diretório temporário com SHA-256 coincidente. Backup anterior SB-04A também conferido. Builds nas cópias isoladas preservam dist e tsbuildinfo do checkout. Nenhuma dependência instalada.

## Componentes

| Arquivo | Responsabilidade |
| --- | --- |
| home/AuthenticatedHome.tsx | Página sem consultas: recebe user, company, companyStatus e navigate do shell; seções semânticas e links reais |
| home/model.ts | Ordem visual de atalhos e agrupamento das rotas já autorizadas; apresentação de campos existentes |
| home/home.css | CSS somente sob .silex-home e classes próprias, consumindo tokens existentes |
| navigation/routes.ts | Registra home como principal, acessível aos papéis existentes; DEFAULT_ROUTE=home |
| navigation/useAppNavigation.ts | Usa DEFAULT_ROUTE somente no login sem retorno solicitado |
| App.tsx | Monta Home, acrescenta ícone/menu Início e estado da consulta empresarial já existente |

homeNavigation reutiliza routes/canAccessRoute. Não define política de autorização. Oito prioridades visuais no administrador; operador tem quatro atalhos rápidos, Controle de caixa na área operacional e Visão Geral no CTA. Todos os 23 módulos canônicos do administrador e seis do operador têm exatamente um link na home. Alias finance-suppliers permanece navegável, sem duplicar Fornecedores. IDs/títulos são os oficiais do registro; não há catálogo de rotas paralelo.

Cards de Cadastros, Comercial/operações e Financeiro só aparecem quando a área contém rotas permitidas. Administração é uma lista compacta para os usuários autorizados. Links restantes não repetem os atalhos rápidos. href conserva abrir em nova aba/copiar link; clique simples utiliza navigate do shell, histórico e foco existentes.

## Dados e consultas

Usuário vem de auth/me/login existente. Empresa vem da única consulta company-settings do shell, com o cancelamento lógico já adotado. Não há useLoad, fetch ou api na Home, nem leitura de dashboard/vendas/estoque/financeiro para compor a recepção. companyStatus distingue loading/ready/error sem outra requisição.

Marca sempre Silex Business. Nome empresarial somente company_name; vazio = “Nome empresarial não informado”. Documento, telefone, e-mail e endereço são mostrados quando preenchidos. brand_name não é lido na Home nem convertido em razão social. Continua editável no formulário legado, obrigatório e independente. Não há campo de setor/cidade/UF separado, cargo, seleção empresarial ou multitenancy; o global id=1 permanece.

## Navegação

| Endereço/caso | Resultado |
| --- | --- |
| / e âncoras comerciais | Público SB-04A, sem estado/consultas privadas |
| /entrar sem retorno, sessão válida ou login normal | /app#home |
| /app ou /app/ sem hash | Home após verificação da sessão |
| /app#home sem sessão | Login com retorno allowlisted home |
| /app#dashboard | Visão Geral original, independente |
| rota protegida previamente solicitada | Retorno prioritário ao ID autorizado |
| retorno negado ou destino operacional desconhecido | Mantido fallback SB-03 para dashboard e mensagem |
| /#home | Agora reconhecido como hash operacional, normalizado como as demais rotas |
| demais hashes/alias legados | Mantidos |
| logout/401/403 | Mecanismos SB-03 preservados; logout continua /entrar |

DEFAULT_ROUTE altera somente a entrada sem destino. Hashes comerciais permanecem públicos. Nenhum redirecionamento externo é aceito; retorno é só ID validado e papel revalidado. History push/replace, popstate/hashchange, metadados de retorno, logout-pending, cookie, tokens, endpoints e permissões backend não mudam. Sessão expirada é detectada na próxima verificação/requisição; não foi acrescentado polling em página sem consultas.

## Diferenças do protótipo C

Mantidos heading, banner empresarial, atalhos, três áreas no administrador e CTA independente da Visão Geral. Removidas faixa de estudo e informações fictícias de setor/cidade/data; dados reais disponíveis ocupam o banner. Nenhum indicador decorativo.

Área “Serviços e pedidos” foi ampliada para “Comercial e operações”, seguindo o grupo já existente e incluindo estoque/caixa. Cards contêm links compactos aos módulos restantes, sem duplicação; Administração fica em faixa menor. Operador recebe somente suas áreas disponíveis, sem descrição financeira/restrita. Mobile usa uma coluna de atalhos para preservar títulos completos do registro; o protótipo usava duas colunas de títulos abreviados. Não há novo design system nem reorganização do shell.

## Limites

Leitor de tela real/dispositivos físicos e hospedagem externa ainda exigem homologação. Catchall FastAPI/Vite existentes são mantidos; hosting deve suportar os paths /entrar e /app. Pendências P01/P02/P04–P07/P09 não foram corrigidas incidentalmente. SB-05 não iniciado.
