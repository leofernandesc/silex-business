# Testes e matriz — SB-03

Todos os testes usam cópias em `/tmp/silex-sb03-zd5m8u9a`, bancos descartáveis e servidores loopback. Os builds não escrevem dist/tsbuildinfo do checkout. Não houve instalação de dependências ou teste em banco real.

## Automatizados

| Comando/cobertura | Resultado | Evidência |
| --- | --- | --- |
| npm run build no baseline | Passou: TypeScript + Vite | baseline-build.log |
| npm test no baseline | 19/19 | baseline-unit.log |
| npm run build no candidato | Passou | build.log |
| npx tsc --noEmit no candidato | Passou | typescript.log |
| npm test no candidato | 38/38, cinco arquivos | unit-tests.log |
| pytest backend/tests -q -p no:cacheprovider | 69/69 | backend-tests.log |
| E2E existente app.spec.ts, 3 viewports | 27/27 | existing-e2e-results.json, existing-e2e.log |
| E2E novo navigation.spec.ts, 3 viewports | 36/36 | navigation-results.json, navigation-tests.log |
| Lint | Sem script/config dedicado no projeto | package.json preservado |

Os testes backend existentes criam SQLite temporário por fixture e executam seu upgrade Alembic nesse banco de teste. **Nenhuma migração ou comando de inicialização foi executado no banco persistente**. Os servidores visuais usam Base.metadata.create_all e seed existentes apenas no template descartável.

## Matriz de autenticação, navegação e autorização

Cada cenário novo é executado em 1440×900, 768×1024 e 375×812; desktop tem navegação não modal e os dois menores têm painel modal.

| Cenário | Verificação |
| --- | --- |
| Login incorreto/correto | Mensagem de erro sem shell; credenciais válidas → dashboard; cookie HttpOnly/Strict/path preservado |
| Sessão válida/refresh | Identificação fictícia e destino permanecem após recarga |
| Guest em rota protegida | Nenhuma chamada financeira antes de login; guarda só ID; refresh do login preserva retorno |
| Retorno autorizado | Login retorna a Pagar; metadado consumido; atualização mantém módulo |
| Retorno negado | Operador direcionado a dashboard com recusa; financeiro não monta |
| Histórico | Navegação interna + hash legado, Voltar/Avançar e foco do main; logout/back/forward sem shell privado |
| Compatibilidade | Todos os 23 IDs + alias finance-suppliers via /#id; home reservado e desconhecido informados |
| P03 teclado | Fechado inert, abrir por Enter, foco inicial, 32 Tabs, Shift+Tab, submenus por Enter, Escape, fechar, backdrop e retorno ao acionador |
| P03 breakpoint | Desktop→375 com foco na sidebar, abrir modal, voltar desktop: foco visível, sem inert indevido ou scroll bloqueado |
| P08 operador | Sem grupos financeiro/admin; todos os IDs admin negados; consultas protegidas e POST accounts retornam 403; sessão permanece válida |
| Backend em autoridade | Testes existentes validam escopo de vendas/caixa, sessão, origem, usuário inativo e acesso administrativo |
| Sessão expirada real | expires_at da **sessão no SQLite descartável** alterado para passado; próxima operação 401 limpa shell e login retorna ao módulo |
| Logout 200/401 | Revogação real; sessão já expirada tratada como saída concluída; marcador removido |
| Logout rede | Wrapper de fetch somente no navegador de teste simula rejeição de logout; identificação removida; refresh bloqueia reentrada; retry revoga cookie |
| 403 em componente | Resposta simulada em Dashboard financeiro informa recusa sem expirar sessão; backend real também responde 403 a operador |
| Open redirect | Metadado adulterado e query return externa ignorados; origem permanece loopback |
| Responsividade | Sem overflow global nos cenários e nas capturas comparativas; conteúdo operacional preservado |

Arquivos/evidências relativos a [docs/evidence/sb03](../../evidence/sb03). A suíte funcional existente cobre clientes, produtos, fornecedores/prestadores/PIX, estoque, vendas/recibo, caixa, serviços/títulos, quitação, OFX, livro caixa/estorno e exportações, sempre na base separada.

## Tentativas e limites

A primeira compilação encontrou comparações impossíveis em código de submenu legado que ficou sem consumidores ao unificar o registro; esse ramo foi retirado, mantendo a renderização financeira efetiva. build-attempt-1.log conserva o diagnóstico.

Primeira rodada de navegação: 27 passaram e seis falharam, demonstrando apagamento da mensagem de guard/indisponibilidade por popstate+hashchange. A correção deduplica o destino processado. navigation-attempt-1.json/log conservam resultados; segunda rodada passou 33/33 antes de acrescentar o teste de breakpoint. O teste também foi ajustado para consultar o endpoint existente /finance/reports/catalog.

Não usamos page.route devido à incompatibilidade do protocolo do Firefox instalado documentada no SB-02.3. Wrappers de window.fetch são exclusivos dos testes de falha de rede/403 e encaminham demais requisições à API real. Não alteram código/contratos da aplicação.

Leitor de tela real, navegação nativa de CSV com sessão expirada, múltiplas abas sincronizadas, hospedagem externa e dispositivos físicos não foram homologados. P01/P02/P04–P07/P09 permanecem abertas. O backend tem empresa global única, sem mecanismo de autorização entre empresas para testar. Não inferir multitenancy desses resultados.

A coleta visual inicial parou porque o baseline possui dois botões com o mesmo nome Fechar menu (backdrop e botão da sidebar). O seletor do **script de evidência** foi delimitado à sidebar, sem alterar a versão anterior. visual-attempt-1.log conserva o erro; a rodada completa gerou 64 capturas sem overflow, erros JavaScript ou requisições externas.

O primeiro smoke Vite usou 5174 e o backend recusou login por origem (403). A allowlist existente permite 5173; a repetição no **porta de desenvolvimento já aprovado, 5173**, passou sem mudar o controle de origem do servidor. runtime-attempt-1.log conserva a tentativa; runtime-checks.json registra seis casos aprovados (FastAPI/Vite × três larguras), incluindo fallback dos paths, retorno protegido, refresh, guard operador e logout.

Seis consultas em fixtures equivalentes tiveram JSON integralmente idêntico: dashboard, dashboard financeiro, títulos, vendas, estoque e configuração empresarial. business-responses.json conserva hashes de resposta sem incluir dados reais. source-preservation.json confirma DashboardPage inteiro e helpers query/exportCsv byte a byte preservados, e financePlanning.tsx diferente exclusivamente na assinatura/callback de navegação de Abrir livro caixa. Cinco SVGs mantêm XML válido e hashes dos originais aprovados em Pictures.

P03 também passou em seis execuções suplementares após tornar o caminho de captura seguro para o runner padrão (info.outputPath quando a pasta de evidência não é fornecida). A rodada completa final continua passando 36/36; teclado de fechar/navegar por Enter, além de Escape, foi coberto. A mensagem do destino home indisponível descreve somente o estado da página, sem jargão de implementação.

O pytest emitiu um aviso de depreciação de Starlette/httpx; não é falha de teste. Nenhuma dependência foi substituída neste incremento.
