# Navegação e coordenação de sessão — SB-03

## Auditoria e direção adotada

Foram consultados os relatórios SB-02.1/02.2/02.3, SB-01 (Identidade, Auditoria, Arquitetura de navegação, Incrementos), recomendações SB-03, problemas e identificação empresarial. A marca e o shell já estavam aplicados. O incremento mantém o shell existente, seus grupos, componentes e estilos, e extrai somente a coordenação de rotas/sessão e o comportamento do painel móvel.

Antes: hashchange controlava a página; login sempre descartava o destino para dashboard; logout só removia user após resposta bem-sucedida; sidebar fechada era ocultada somente por transform; grupo financeiro podia aparecer para operador. Nenhum desses comportamentos autorizava o operador no servidor.

Depois: pathnames distinguem login e ERP; registro único contém **23 módulos e o alias finance-suppliers**; disponibilidade deriva dos mesmos papéis admin/operator já existentes. History API é usada sem dependência nova. A remontagem de main por key=safePage foi preservada, mantendo reset de filtros, paginação e formulários entre módulos.

## Endereços durante este incremento

| URL | Comportamento no SB-03 | Mudança reservada ao SB-04 |
| --- | --- | --- |
| `/` | Entrada transitória existente: verifica sessão; login em `/entrar` ou Visão geral em `/app#dashboard` | Página comercial pública, sem sessão ou consultas privadas |
| `/#id-operacional` | Compatibilidade: guarda destino permitido e normaliza com replace para login/ERP | Continuar reconhecendo só hashes da allowlist; âncoras comerciais separadas |
| `/entrar` | Login existente; sessão válida segue destino reconhecido ou dashboard | Destino padrão home quando ela existir |
| `/app` | Autenticado: dashboard; guest: login | Home após implementação |
| `/app#dashboard` | Visão Geral existente, independente | Preservar |
| `/app#id-operacional` | Módulo atual, guard por papel, backend autoriza cada operação | Preservar |
| `/app#finance-suppliers` | Alias legado de Fornecedores preservado | Preservar compatibilidade |
| `/app#home` | **Não há página home**: normaliza dashboard e informa indisponibilidade | Ativar somente com a página real |
| Path/hash desconhecido | Entrada disponível + mensagem; nunca usa fragmento como URL externa | Política de destino inexistente das superfícies pública/ERP |

Nenhuma rota pública foi ativada e nenhum placeholder comercial/home foi criado. Não reutilizamos #inicio ou #login. Até o SB-04, hashes públicos como #modulos são destinos desconhecidos da entrada transitória; sua rolagem pública não existe ainda.

## Histórico e foco

- Navegação deliberada de módulo: pushState; normalização de legado, guard, login/logout/expiração: replaceState. Endereço igual não cria outra entrada.
- popstate e hashchange sincronizam o estado. Um mesmo destino já processado é ignorado, evitando que dois eventos do mesmo fragmento apaguem a mensagem de recusa/indisponibilidade.
- Links antigos conservam seus IDs; acesso direto e atualização passam por auth/me antes do shell. Hashes atribuídos por componentes legados continuam sendo reconhecidos.
- A mudança deliberada de módulo e o histórico levam foco ao main; a ação de navegação pelo menu móvel fecha o painel e devolve o foco ao acionador. Skip link continua disponível.
- O atalho “Abrir livro caixa” passa a usar o mesmo navigate do shell, sem alterar consulta, filtros, cálculo ou dado do Dashboard financeiro.

## Sessão e retorno

`useAppNavigation` coordena o cookie já gerenciado pelo servidor. Endpoints, body, credentials=same-origin, cookie gestao_session HttpOnly/SameSite=Strict/path=/, TTL 12h, hash e regras de autorização do backend não mudaram.

Destino de retorno: sessionStorage da aba, chave silex.navigation.return, objeto `{id, origin: "protected-request"}`. Apenas IDs do registro são aceitos; papel é revalidado após login; metadado é consumido e removido. URL externa, query return, home e IDs desconhecidos não concedem acesso. Em armazenamento indisponível, a memória da instância mantém o destino; atualização perde esse metadado, sem perder segurança.

- auth/me pendente: loading neutro, sem shell/dados privados. 401: login; falha de verificação não é tratada como sessão válida.
- 401 de operação: limpa user/página privada, desmonta shell e componentes, preserva só destino operacional, informa expiração e exige login.
- 403: mantém sessão e usa mensagem existente do backend no componente. Guard frontend comunica recusa e leva à Visão geral; não monta o módulo negado.
- ApiError acrescenta status ao erro frontend, mantendo mensagem e contratos. Um contador em memória evita que 401 de requisição iniciada em sessão anterior encerre uma nova sessão. Não é um token de autenticação.
- auth/me antigo/StrictMode: limpeza e versão impedem aplicação de resposta obsoleta. Company settings possui cancelamento lógico para não reintroduzir identificação antiga após troca de usuário/logout.
- Logout: apresentação privada é removida imediatamente; POST atual revoga sessão. 200 ou 401 concluem saída. Falha de rede/servidor mantém login com mensagem de revogação não confirmada e ação de tentar novamente. Metadado silex.session.logout-pending=1 impede reentrada automática nesta aba após refresh; não contém segredo. Login é bloqueado até concluir essa saída; requisições de logout concorrentes são impedidas. Logout confirmado remove retorno e marcador.

Nenhum dado de cliente é armazenado nessas novas chaves. O marcador local **não revoga a sessão remotamente**; depende do POST bem-sucedido ou sessão já inválida. Outras abas continuam dependendo da validação backend/401; não se criou protocolo de autenticação entre abas.

## P03 — painel modal móvel

O backdrop e a sobreposição atuais caracterizam um painel modal nas larguras até 900 px. Desktop permanece navegação não modal.

- Sidebar aberta: role=dialog, aria-modal=true e nome Navegação principal; primeiro foco no botão Fechar menu.
- Main-shell e skip link ficam inert; backdrop decorativo não entra no Tab. Tab/Shift+Tab e tentativas de foco permanecem dentro do painel aberto.
- Escape, fechar e backdrop encerram painel; foco retorna ao acionador conectado. Navegar também encerra painel. Body scroll anterior é restaurado.
- Fechado em compacto: inert e aria-hidden, sem elementos ocultos navegáveis. Grupos possuem aria-expanded/aria-controls e conteúdos hidden quando recolhidos; sem roles menu/menuitem que imporiam outro modelo de teclado.
- Mudança desktop→compacto com foco na sidebar leva ao acionador; painel aberto→desktop desfaz modal/inert/bloqueio de scroll e preserva foco em opção de navegação visível.
- Classes, cores e foco aprovado no SB-02.3 permanecem. Nenhum estilo global foi refeito.

## P08 — fonte uniforme de disponibilidade

routes.ts descreve acesso de exibição para cada destino existente. Menu, grupos, submenu financeiro, safePage e navigate reutilizam canAccessRoute. Operador possui dashboard, customers, products, pos, sales e cash; administrador possui os 23 módulos e alias. Cartões financeiros do dashboard permanecem apenas administrativos; os atalhos operacionais da Visão Geral levam a destinos compartilhados, passando pelo mesmo navigate. Dashboard financeiro inteiro é administrativo, incluindo Abrir livro caixa.

Ocultar item não autoriza/nega sozinho: Depends(current_user)/Depends(admin), escopo de venda e caixa, validação de origem e demais regras backend permanecem byte a byte iguais. Testes reais confirmam 401 guest, 403 operador e recusa de mutação administrativa.

## Empresa e limites

Silex Business é marca fixa; company_name é empresa cliente; brand_name é nome de apresentação legado, editável e sem fallback automático para empresa/razão social. Não há mudança em campos, valores, schema, API ou templates. O backend atual possui configuração empresarial global id=1, sem company_id/membership/seleção multitenant. Validamos os papéis existentes e seus escopos de usuário; **não declaramos isolamento entre empresas inexistente no contrato**.

FastAPI catchall e Vite permitem acesso direto/refresh sem mudança de servidor. A hospedagem futura precisa oferecer os mesmos rewrites; nenhum host externo foi configurado. SB-04 deverá acrescentar superfícies públicas reais, evitar consultas privadas em `/`, ativar home e revisar apenas então os destinos padrão e logout público.
