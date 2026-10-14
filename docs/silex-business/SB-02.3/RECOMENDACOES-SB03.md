# Recomendações para SB-03

A implementação de SB-03 não foi iniciada. A navegação atual por hash, sua remontagem de páginas, autenticação, logout e guardas permanecem byte a byte iguais ao estado inicial deste incremento.

1. Registrar rotas existentes e alias finance-suppliers, e derivar disponibilidade de menu/atalhos/guard de forma uniforme. A visibilidade de itens financeiros do operador continua sendo uma pendência anterior; backend permanece autoridade.
2. Preservar a direção aprovada: `/` comercial, `/entrar`, `/app#home`, `/app#dashboard` e hashes operacionais, com compatibilidade de links antigos e separação de âncoras públicas.
3. Ao coordenar menu móvel, testar foco inicial, Tab/Shift+Tab, Escape, retorno ao acionador e invisibilidade dos controles fechados para teclado. A evidência atual mostra foco mantido no opener e Tab saindo do menu.
4. Validar retorno à rota protegida originalmente solicitada com allowlist, destino negado, desconhecido, sessão persistente/expirada e distinção 401/403.
5. Validar logout normal, falha de rede e expiração sem identificação empresarial residual; histórico back/forward/refresh e foco de conteúdo.
6. Reutilizar os contextos de foco claro/escuro que passaram no SB-02.3 ao preparar AppShell/PublicLayout. Não aplicar azul claro de foco a todas as superfícies.
7. Preservar classes/contratos compartilhados ao extrair estruturas, registrando como filtros e páginas são remontados hoje. Não transformar os protótipos em substitutos das telas funcionais.

Os testes existentes de sessão/operador passaram no ambiente isolado, mas não substituem a matriz completa aprovada para SB-03. Os problemas P01 (modal), P02 (financeiro), P04 (contraste), datas e hierarquia Nova despesa devem ser aprovados em escopos próprios; não são autorização implícita de refatoração ou regra de negócio.
